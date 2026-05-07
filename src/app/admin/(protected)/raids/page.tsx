"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import {
  getRaidSchedule,
  weekdayDate,
  upcomingMondays,
  formatShortDate,
  dayName,
} from "@/lib/raid-schedule";
import { RAID_INSTANCE_GROUPS, resolveInstanceName } from "@/lib/wow-constants";

interface Raid    { id: number; softresId: string; instance: string; night: number; raidDate: string; }
interface RaidWeek { id: number; weekStart: string; raids: Raid[]; }

const SCHEDULE = getRaidSchedule();

export default function AdminRaidsPage() {
  const [weeks,   setWeeks]   = useState<RaidWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Raid-Helper auto-setup
  interface RHEvent { id: string; title: string; startTime: number; softresId?: string; signUpCount: string; }
  interface RHWeekGroup { weekLabel: string; events: { event: RHEvent; night: 1 | 2 }[] }
  const [rhEvents, setRhEvents] = useState<RHWeekGroup[]>([]);
  const [rhLoading, setRhLoading] = useState(false);
  const [setupInProgress, setSetupInProgress] = useState<string | null>(null);

  // Inline Night 2 creation
  const [addingNight2, setAddingNight2] = useState<number | null>(null); // weekId
  const [night2SoftresId, setNight2SoftresId] = useState("");

  async function loadRHEvents() {
    setRhLoading(true);
    try {
      const res = await fetch("/api/raid-helper?upcoming=true");
      const data = await res.json();
      const events: RHEvent[] = (data.postedEvents ?? data.events ?? []).filter((e: RHEvent) => e.softresId);
      // Group by calendar week, assign night based on order within week
      const byWeek = new Map<string, { event: RHEvent; night: 1 | 2 }[]>();
      for (const ev of events) {
        // Use guild timezone to get local date (raids start 11:59 PM ET = next UTC day)
        const localDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: SCHEDULE.timezone,
          year: "numeric", month: "2-digit", day: "2-digit",
        }).format(new Date(ev.startTime * 1000));
        const d = new Date(localDate + "T00:00:00Z");
        const dow = d.getUTCDay();
        const toMon = dow === 0 ? -6 : 1 - dow;
        const mon = new Date(d);
        mon.setUTCDate(mon.getUTCDate() + toMon);
        const key = mon.toISOString().slice(0, 10);
        if (!byWeek.has(key)) byWeek.set(key, []);
        const arr = byWeek.get(key)!;
        arr.push({ event: ev, night: arr.length === 0 ? 1 : 2 });
      }
      const groups: RHWeekGroup[] = [];
      byWeek.forEach((events, weekStart) => {
        // Label by Tuesday of that week (weekStart is Monday, +1 day = Tuesday)
        const tue = new Date(weekStart + "T00:00:00Z");
        tue.setUTCDate(tue.getUTCDate() + 1);
        const label = tue.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
        // "UTC" here is fine — weekStart was already computed in guild TZ so Tuesday is correct
        groups.push({ weekLabel: `Week of ${label}`, events });
      });
      setRhEvents(groups.slice(0, 6)); // show 6 most recent weeks
    } finally {
      setRhLoading(false);
    }
  }

  async function addNight2(week: RaidWeek) {
    const night1 = week.raids.find(r => r.night === 1);
    const instance = night1?.instance ?? SCHEDULE.instance;
    // Thursday = night1 date + 2 days
    const night1Ms = night1 ? new Date(night1.raidDate).getTime() : new Date(week.weekStart).getTime() + 86400000;
    const night2Date = new Date(night1Ms + 2 * 86400000).toISOString().slice(0, 10);
    setSaving(true);
    try {
      const res = await fetch("/api/raids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          softresId: night2SoftresId.trim() || `n2-${week.id}-${Date.now()}`,
          instance,
          raidDate: night2Date,
          night: 2,
          weekId: week.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success(`Night 2 added — ${night2Date}`);
      setAddingNight2(null);
      setNight2SoftresId("");
      await loadWeeks();
    } finally { setSaving(false); }
  }

  async function setupFromEvent(eventId: string, night: 1 | 2) {
    setSetupInProgress(eventId);
    try {
      const res = await fetch("/api/raids/setup-from-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, night }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Setup failed"); return; }
      toast.success(
        `Night ${night} set up! ${data.reservesSynced} reserves · ${data.playersUpdated} players updated` +
        (data.warning ? ` ⚠ ${data.warning}` : "")
      );
      await loadWeeks();
    } finally {
      setSetupInProgress(null);
    }
  }

  // Quick setup
  const mondays = upcomingMondays(SCHEDULE.timezone, 6);
  const [quickMonday,   setQuickMonday]   = useState(mondays[0]);
  const [quickId1,      setQuickId1]      = useState("");
  const [quickId2,      setQuickId2]      = useState("");
  const [quickInstance, setQuickInstance] = useState(SCHEDULE.instance);
  const [resolving,     setResolving]     = useState<1 | 2 | null>(null);

  async function autoFillInstance(softresId: string) {
    if (!softresId.trim()) return;
    try {
      const res = await fetch(`/api/softres/${softresId.trim()}`);
      if (!res.ok) return;
      const data = await res.json();
      // data comes from our API which uses the SoftresRaidData shape with an `edition` field
      // but the raw Softres response has an `instance` slug — we expose it via the edition
      // field. Try to resolve it, fall back to leaving as-is.
      const slug = data.edition as string | undefined;
      if (slug) {
        const name = resolveInstanceName(slug);
        if (name !== slug) setQuickInstance(name); // only update if we recognised it
      }
    } catch { /* ignore */ }
    finally { setResolving(null); }
  }

  // Manual form
  const [newWeekDate, setNewWeekDate] = useState("");
  const [newRaid, setNewRaid] = useState({
    weekId: "", softresId: "", instance: SCHEDULE.instance, night: "1", raidDate: "",
  });

  async function loadWeeks() {
    const res = await fetch("/api/raid-weeks");
    const { weeks: data } = await res.json();
    setWeeks(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadWeeks(); }, []);

  const night1Date = weekdayDate(quickMonday, SCHEDULE.night1Day);
  const night2Date = weekdayDate(quickMonday, SCHEDULE.night2Day);

  async function quickSetup() {
    if (!quickId1.trim() && !quickId2.trim()) { toast.error("Enter at least one Softres ID"); return; }
    setSaving(true);
    try {
      // Create or find the week
      const weekRes = await fetch("/api/raid-weeks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: quickMonday }),
      });
      let weekId: number;
      if (!weekRes.ok) {
        if (weekRes.status === 409) {
          const existing = weeks.find((w) => w.weekStart.startsWith(quickMonday));
          if (!existing) { toast.error("Week exists but couldn't find it"); return; }
          weekId = existing.id;
          toast.info("Week already exists — adding raids to it");
        } else {
          toast.error((await weekRes.json()).error ?? "Failed to create week"); return;
        }
      } else {
        weekId = (await weekRes.json()).week.id;
      }

      // Night 1
      if (quickId1.trim()) {
        const r = await fetch("/api/raids", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekId, softresId: quickId1.trim(), instance: quickInstance.trim(), night: 1, raidDate: night1Date }),
        });
        if (!r.ok) toast.error(`Night 1 failed: ${(await r.json()).error}`);
        else toast.success(`Night 1 — ${formatShortDate(night1Date)} created, syncing reserves…`);
      }

      // Night 2
      if (quickId2.trim()) {
        const r = await fetch("/api/raids", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekId, softresId: quickId2.trim(), instance: quickInstance.trim(), night: 2, raidDate: night2Date }),
        });
        if (!r.ok) toast.error(`Night 2 failed: ${(await r.json()).error}`);
        else toast.success(`Night 2 — ${formatShortDate(night2Date)} created, syncing reserves…`);
      }

      setQuickId1(""); setQuickId2("");
      loadWeeks();
    } finally { setSaving(false); }
  }

  async function createWeek() {
    if (!newWeekDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/raid-weeks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: newWeekDate }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
      toast.success("Week created"); setNewWeekDate(""); loadWeeks();
    } finally { setSaving(false); }
  }

  async function createRaid() {
    if (!newRaid.weekId || !newRaid.softresId || !newRaid.raidDate) { toast.error("Fill in all fields"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/raids", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId: parseInt(newRaid.weekId, 10), softresId: newRaid.softresId.trim(), instance: newRaid.instance.trim(), night: parseInt(newRaid.night, 10), raidDate: newRaid.raidDate }),
      });
      if (!res.ok) { toast.error((await res.json()).error ?? "Failed"); return; }
      toast.success("Raid added — syncing reserves…");
      setNewRaid({ ...newRaid, softresId: "", raidDate: "" }); loadWeeks();
    } finally { setSaving(false); }
  }

  async function deleteRaid(raidId: number) {
    if (!confirm("Delete this raid and all its reserves/wins?")) return;
    setDeleting(`raid-${raidId}`);
    try { await fetch(`/api/raids/${raidId}`, { method: "DELETE" }); toast.success("Raid deleted"); loadWeeks(); }
    finally { setDeleting(null); }
  }

  async function deleteWeek(weekId: number) {
    if (!confirm("Delete this entire week, all nights, reserves, and wins?")) return;
    setDeleting(`week-${weekId}`);
    try { await fetch(`/api/raid-weeks/${weekId}`, { method: "DELETE" }); toast.success("Week deleted"); loadWeeks(); }
    finally { setDeleting(null); }
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === weeks.length ? new Set() : new Set(weeks.map((w) => w.id))
    );
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} week${selected.size !== 1 ? "s" : ""} and all their raids, reserves, and wins?`)) return;
    setBulkDeleting(true);
    try {
      await Promise.all([...selected].map((id) => fetch(`/api/raid-weeks/${id}`, { method: "DELETE" })));
      toast.success(`${selected.size} week${selected.size !== 1 ? "s" : ""} deleted`);
      setSelected(new Set());
      loadWeeks();
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="page-header">
        <h1 className="page-title">Raid Weeks</h1>
        <p className="page-subtitle">
          {dayName(SCHEDULE.night1Day)}s &amp; {dayName(SCHEDULE.night2Day)}s · {SCHEDULE.startTime} {SCHEDULE.timezone.replace("America/", "").replace("_", " ")}
        </p>
      </div>

      {/* ── Set Up from Raid-Helper ─────────────── */}
      <section className="rounded-lg border border-[--color-gold] bg-[--color-surface] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[--color-gold]">Set Up from Raid-Helper</h2>
            <p className="text-xs text-[--color-text-muted] mt-0.5">
              One click: creates the raid week, syncs Softres reserves, and updates all player class/spec/role from signups.
            </p>
          </div>
          <button
            onClick={loadRHEvents}
            disabled={rhLoading}
            className="btn-gold-solid shrink-0 text-xs"
          >
            {rhLoading ? "Loading…" : rhEvents.length > 0 ? "Refresh" : "Load Events"}
          </button>
        </div>

        {rhEvents.length > 0 && (
          <div className="space-y-3">
            {rhEvents.map(group => (
              <div key={group.weekLabel} className="rounded border border-[--color-border] overflow-hidden">
                <div className="bg-[--color-surface-2] px-3 py-1.5 text-xs font-semibold text-[--color-text-muted] uppercase tracking-wide">
                  {group.weekLabel}
                </div>
                <div className="divide-y divide-[--color-border]">
                  {group.events.map(({ event, night }) => {
                    const date = new Intl.DateTimeFormat("en-US", {
                      timeZone: SCHEDULE.timezone,
                      weekday: "short", month: "short", day: "numeric",
                    }).format(new Date(event.startTime * 1000));
                    const alreadySetUp = weeks.some(w =>
                      w.raids.some(r => r.softresId === event.softresId)
                    );
                    return (
                      <div key={event.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                              night === 1
                                ? "bg-amber-900/30 text-amber-400 border-amber-800"
                                : "bg-blue-900/30 text-blue-400 border-blue-800"
                            }`}>
                              N{night}
                            </span>
                            <span className="text-sm font-medium text-[--color-text] truncate">{event.title}</span>
                            <span className="text-xs text-[--color-text-muted] shrink-0">{date}</span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-[--color-text-muted]">
                            <span>Softres: <code className="text-[--color-gold]">{event.softresId}</code></span>
                            <span>{event.signUpCount} signups</span>
                          </div>
                        </div>
                        {alreadySetUp ? (
                          <span className="text-xs text-emerald-400 shrink-0">✓ Set up</span>
                        ) : (
                          <button
                            onClick={() => setupFromEvent(event.id, night)}
                            disabled={setupInProgress === event.id}
                            className="text-xs btn-gold-solid disabled:opacity-40 shrink-0"
                          >
                            {setupInProgress === event.id ? "Setting up…" : "Set Up"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick Setup ──────────────────────────── */}
      <section className="rounded-lg border border-[--color-gold]/30 bg-[--color-surface] p-5 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-[--color-gold]">Quick Setup</h2>
          <p className="text-xs text-[--color-text-muted] mt-0.5">Pick a week — dates auto-fill. Just paste the Softres IDs.</p>
        </div>

        {/* Week selector */}
        <div>
          <label className="block text-xs text-[--color-text-muted] mb-2">Select Week</label>
          <div className="flex flex-wrap gap-2">
            {mondays.map((mon) => {
              const n1 = weekdayDate(mon, SCHEDULE.night1Day);
              return (
                <button
                  key={mon}
                  type="button"
                  onClick={() => setQuickMonday(mon)}
                  className={`px-3 py-1.5 rounded-md text-xs border transition-colors ${
                    quickMonday === mon
                      ? "border-[--color-gold] bg-[--color-gold]/10 text-[--color-gold] font-semibold"
                      : "border-[--color-border] text-[--color-text-muted] hover:border-[--color-gold]/40 hover:text-[--color-text]"
                  }`}
                >
                  {formatShortDate(n1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Night cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Night 1 */}
          <div className="rounded-md border border-[--color-border] bg-[--color-surface-2] p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-[--color-text]">Night 1 — {dayName(SCHEDULE.night1Day)}</p>
              <p className="text-xs text-[--color-text-muted]">{formatShortDate(night1Date)} at {SCHEDULE.startTime}</p>
            </div>
            <div>
              <label className="block text-xs text-[--color-text-muted] mb-1.5">
                Softres.it ID {resolving === 1 && <span className="text-[--color-gold] animate-pulse">— looking up…</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. tu8jdg"
                value={quickId1}
                onChange={(e) => setQuickId1(e.target.value)}
                onBlur={() => { setResolving(1); autoFillInstance(quickId1); }}
                className="field"
              />
            </div>
          </div>

          {/* Night 2 */}
          <div className="rounded-md border border-[--color-border] bg-[--color-surface-2] p-4 space-y-3">
            <div>
              <p className="text-xs font-semibold text-[--color-text]">Night 2 — {dayName(SCHEDULE.night2Day)}</p>
              <p className="text-xs text-[--color-text-muted]">{formatShortDate(night2Date)} at {SCHEDULE.startTime}</p>
            </div>
            <div>
              <label className="block text-xs text-[--color-text-muted] mb-1.5">
                Softres.it ID {resolving === 2 && <span className="text-[--color-gold] animate-pulse">— looking up…</span>}
              </label>
              <input
                type="text"
                placeholder="e.g. ab1cd2"
                value={quickId2}
                onChange={(e) => setQuickId2(e.target.value)}
                onBlur={() => { setResolving(2); autoFillInstance(quickId2); }}
                className="field"
              />
            </div>
          </div>
        </div>

        {/* Instance */}
        <div>
          <label className="block text-xs text-[--color-text-muted] mb-1.5">
            Instance <span className="text-[--color-text-muted]/60">(auto-filled from Softres — override if needed)</span>
          </label>
          <select
            value={quickInstance}
            onChange={(e) => setQuickInstance(e.target.value)}
            className="field"
          >
            <option value={quickInstance}>{quickInstance}</option>
            {RAID_INSTANCE_GROUPS.map(({ label, raids }) => (
              <optgroup key={label} label={label}>
                {raids.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={quickSetup}
          disabled={saving || (!quickId1.trim() && !quickId2.trim())}
          className="btn-gold-solid w-full sm:w-auto"
        >
          {saving ? "Creating…" : `Set Up ${formatShortDate(night1Date)}`}
        </button>
      </section>

      {/* ── Manual controls ───────────────────────── */}
      <section>
        <button
          type="button"
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center gap-2 text-sm text-[--color-text-muted] hover:text-[--color-text] transition-colors"
        >
          <span className={`text-xs transition-transform inline-block ${showManual ? "rotate-90" : ""}`}>▶</span>
          Manual / advanced controls
        </button>

        {showManual && (
          <div className="mt-4 space-y-5">
            <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5 space-y-3">
              <h3 className="section-label">Create Week Only</h3>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-[--color-text-muted] mb-1.5">Week Start (the Monday before your Tuesday raid)</label>
                  <input type="date" value={newWeekDate} onChange={(e) => setNewWeekDate(e.target.value)} className="field" />
                </div>
                <button type="button" onClick={createWeek} disabled={saving || !newWeekDate} className="btn-secondary">Create</button>
              </div>
            </div>

            <div className="rounded-lg border border-[--color-border] bg-[--color-surface] p-5 space-y-3">
              <h3 className="section-label">Add Single Raid Night</h3>
              <p className="text-xs text-[--color-text-muted] mt-0.5">Adds one night to an existing week. Use Quick Setup above to create weeks — they'll appear in the dropdown here.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[--color-text-muted] mb-1.5">Week</label>
                  <select value={newRaid.weekId} onChange={(e) => setNewRaid({ ...newRaid, weekId: e.target.value })} className="field">
                    <option value="">{weeks.length === 0 ? "— No weeks yet, use Quick Setup first —" : "— Select week —"}</option>
                    {weeks.map((w) => <option key={w.id} value={String(w.id)}>{formatDate(w.raids.find(r => r.night === 1)?.raidDate ?? new Date(new Date(w.weekStart).getTime() + 86400000).toISOString())}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[--color-text-muted] mb-1.5">Night</label>
                  <select value={newRaid.night} onChange={(e) => setNewRaid({ ...newRaid, night: e.target.value })} className="field">
                    <option value="1">Night 1</option>
                    <option value="2">Night 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-[--color-text-muted] mb-1.5">Softres ID</label>
                  <input type="text" value={newRaid.softresId} onChange={(e) => setNewRaid({ ...newRaid, softresId: e.target.value })} className="field" />
                </div>
                <div>
                  <label className="block text-xs text-[--color-text-muted] mb-1.5">Date</label>
                  <input type="date" value={newRaid.raidDate} onChange={(e) => setNewRaid({ ...newRaid, raidDate: e.target.value })} className="field" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[--color-text-muted] mb-1.5">Instance</label>
                  <select value={newRaid.instance} onChange={(e) => setNewRaid({ ...newRaid, instance: e.target.value })} className="field">
                    <option value="">— Select instance —</option>
                    {RAID_INSTANCE_GROUPS.map(({ label, raids }) => (
                      <optgroup key={label} label={label}>
                        {raids.map(r => <option key={r} value={r}>{r}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
              <button type="button" onClick={createRaid} disabled={saving} className="btn-secondary">
                {saving ? "Saving…" : "Add Raid Night"}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── History ──────────────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="section-label">All Weeks</h2>
          {weeks.length > 0 && (
            <div className="flex items-center gap-3">
              {selected.size > 0 && (
                <button
                  type="button"
                  onClick={bulkDelete}
                  disabled={bulkDeleting}
                  className="text-xs font-medium text-red-400 hover:text-red-300 border border-red-800 hover:border-red-600 rounded px-3 py-1 transition-colors disabled:opacity-40"
                >
                  {bulkDeleting ? "Deleting…" : `Delete ${selected.size} selected`}
                </button>
              )}
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-[--color-text-muted] hover:text-[--color-text] transition-colors"
              >
                {selected.size === weeks.length ? "Deselect all" : "Select all"}
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <p className="text-[--color-text-muted] animate-pulse text-sm">Loading…</p>
        ) : weeks.length === 0 ? (
          <div className="empty-state">No raid weeks yet.</div>
        ) : (
          <div className="space-y-3">
            {weeks.map((week) => (
              <div
                key={week.id}
                className={`rounded-lg border bg-[--color-surface] p-4 transition-colors ${
                  selected.has(week.id) ? "border-red-700/60 bg-red-950/20" : "border-[--color-border]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selected.has(week.id)}
                    onChange={() => toggleSelect(week.id)}
                    className="w-4 h-4 shrink-0 accent-[--color-gold] cursor-pointer"
                  />
                  <p className="font-medium text-[--color-text] flex-1">
                    Week of {formatDate(
                      week.raids.find(r => r.night === 1)?.raidDate ??
                      new Date(new Date(week.weekStart).getTime() + 86400000).toISOString()
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteWeek(week.id)}
                    disabled={!!deleting || bulkDeleting}
                    className="text-xs text-[--color-text-muted] hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {deleting === `week-${week.id}` ? "Deleting…" : "Delete"}
                  </button>
                </div>

                {week.raids.length === 0 ? (
                  <p className="mt-1 ml-7 text-sm text-[--color-text-muted]">No raids yet</p>
                ) : (
                  <div className="mt-2 ml-7 space-y-1.5">
                    {week.raids.map((raid) => (
                      <div key={raid.id} className="flex items-center gap-3 text-sm flex-wrap">
                        <span className="text-[--color-gold] text-xs font-semibold">Night {raid.night}</span>
                        <span className="text-[--color-text]">{raid.instance}</span>
                        <span className="text-[--color-text-muted] text-xs">
                          {new Date(raid.raidDate).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })}
                        </span>
                        {raid.softresId && !raid.softresId.startsWith("n2-") && (
                          <a href={`https://softres.it/raid/${raid.softresId}`} target="_blank" rel="noreferrer"
                            className="text-xs text-[--color-gold]/60 hover:text-[--color-gold]">
                            {raid.softresId} ↗
                          </a>
                        )}
                      </div>
                    ))}

                    {/* Night 2 quick-add — shown when only Night 1 exists */}
                    {!week.raids.find(r => r.night === 2) && (
                      addingNight2 === week.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-xs text-[--color-text-muted]">Add Night 2 (Thu):</span>
                          <input
                            type="text"
                            placeholder="Softres ID (optional)"
                            value={night2SoftresId}
                            onChange={e => setNight2SoftresId(e.target.value)}
                            className="field text-xs py-1 w-36"
                          />
                          <button onClick={() => addNight2(week)} disabled={saving}
                            className="text-xs btn-gold-solid disabled:opacity-40">
                            {saving ? "…" : "Confirm"}
                          </button>
                          <button onClick={() => { setAddingNight2(null); setNight2SoftresId(""); }}
                            className="text-xs text-[--color-text-muted] hover:text-[--color-text]">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingNight2(week.id)}
                          className="text-xs text-[--color-text-muted]/50 hover:text-[--color-gold] transition-colors pt-0.5"
                        >
                          + Add Night 2
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
