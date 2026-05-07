"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { CLASS_COLORS, CLASS_SPECS, ALL_CLASSES } from "@/lib/wow-constants";

// ── Types ────────────────────────────────────────────────────────────────────

interface RHEventSummary {
  id: string;
  title: string;
  description: string;
  startTime: number;
  closeTime?: number;
  signUpCount: string;
  leaderName: string;
  softresId?: string;
  channelId: string;
  color?: string;
}

interface SignUp {
  id: number;
  name: string;
  userId: string;
  className: string;
  cClassName: string;
  specName: string;
  cSpecName: string;
  roleName: string;
  cRoleName: string;
  status: string;
  note?: string;
  position: number;
  entryTime: number;
}

interface FullEvent extends RHEventSummary {
  signUps: SignUp[];
  channelName?: string;
  date?: string;
  time?: string;
  closingTime?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const DEFAULT_CLASSES = new Set(["tentative", "late", "bench", "absence", "absent"]);
function isDefaultStatus(s: SignUp) {
  return DEFAULT_CLASSES.has((s.cClassName || s.className).toLowerCase());
}

const ROLE_ORDER = ["tank", "tanks", "healer", "healers", "melee", "ranged", "dps"];
function roleWeight(r: string) {
  const i = ROLE_ORDER.findIndex((x) => r.toLowerCase().includes(x));
  return i === -1 ? 99 : i;
}

function formatTime(unix: number) {
  return new Date(unix * 1000).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }) + " ET";
}

function isUpcoming(unix: number) {
  return unix * 1000 > Date.now() - 4 * 60 * 60 * 1000;
}

const CLASS_NAME_MAP: Record<string, string> = {
  DK: "Death Knight", DH: "Demon Hunter",
  Evoker: "Evoker", Druid: "Druid", Hunter: "Hunter",
  Mage: "Mage", Monk: "Monk", Paladin: "Paladin",
  Priest: "Priest", Rogue: "Rogue", Shaman: "Shaman",
  Warlock: "Warlock", Warrior: "Warrior",
};
function getClassColor(rhClass: string) {
  return CLASS_COLORS[CLASS_NAME_MAP[rhClass] ?? rhClass] ?? "#e2e0d8";
}

function statusBadge(s: SignUp) {
  const cls = (s.cClassName || s.className).toLowerCase();
  if (cls === "tentative") return { label: "Tent",  color: "bg-yellow-900/40 text-yellow-400 border-yellow-700" };
  if (cls === "late")      return { label: "Late",  color: "bg-orange-900/40 text-orange-400 border-orange-700" };
  if (cls === "bench")     return { label: "Bench", color: "bg-zinc-800 text-zinc-400 border-zinc-600" };
  if (cls === "absence" || cls === "absent") return { label: "Out", color: "bg-red-900/40 text-red-400 border-red-700" };
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function AdminRaidHelperPage() {
  const [events, setEvents]               = useState<RHEventSummary[]>([]);
  const [loading, setLoading]             = useState(true);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [fullEvent, setFullEvent]         = useState<FullEvent | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filter, setFilter]               = useState<"upcoming" | "all">("upcoming");
  const [search, setSearch]               = useState("");

  // Edit event
  const [editing, setEditing]   = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", date: "", time: "" });
  const [saving, setSaving]     = useState(false);

  // Delete event
  const [deletingEvent, setDeletingEvent] = useState(false);

  // Remove signup
  const [removingSignup, setRemovingSignup] = useState<number | null>(null);

  // Add signup
  const [showAddSignup, setShowAddSignup]   = useState(false);
  const [addForm, setAddForm]               = useState({ userId: "", className: "", specName: "" });
  const [addingSignup, setAddingSignup]     = useState(false);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    fetch("/api/raid-helper")
      .then((r) => r.json())
      .then((d) => setEvents(d.postedEvents ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const loadEvent = useCallback(async (id: string) => {
    setSelectedId(id);
    setFullEvent(null);
    setEditing(false);
    setShowAddSignup(false);
    setDetailLoading(true);
    try {
      const res  = await fetch(`/api/raid-helper?eventId=${id}`);
      const data = await res.json();
      setFullEvent(data);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  function startEdit(event: FullEvent) {
    const d = new Date(event.startTime * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    const timeStr = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/New_York" });
    setEditForm({ title: event.title, description: event.description ?? "", date: dateStr, time: timeStr });
    setEditing(true);
  }

  async function saveEdit() {
    if (!selectedId) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (editForm.title)       body.title       = editForm.title;
      if (editForm.description !== undefined) body.description = editForm.description;
      const res  = await fetch(`/api/raid-helper?eventId=${selectedId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to update event"); return; }
      toast.success("Event updated");
      setFullEvent(data.event ?? data);
      setEditing(false);
      // Update summary list title
      setEvents((prev) => prev.map((e) => e.id === selectedId ? { ...e, title: editForm.title || e.title } : e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!selectedId || !confirm(`Delete "${fullEvent?.title}"? This cannot be undone.`)) return;
    setDeletingEvent(true);
    try {
      const res = await fetch(`/api/raid-helper?eventId=${selectedId}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete event"); return; }
      toast.success("Event deleted");
      setSelectedId(null);
      setFullEvent(null);
      setEvents((prev) => prev.filter((e) => e.id !== selectedId));
    } finally {
      setDeletingEvent(false);
    }
  }

  async function removeSignup(signupId: number, name: string) {
    if (!selectedId || !confirm(`Remove ${name} from this event?`)) return;
    setRemovingSignup(signupId);
    try {
      const res = await fetch(`/api/raid-helper?eventId=${selectedId}&signupId=${signupId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to remove signup"); return; }
      toast.success(`${name} removed`);
      setFullEvent(data.event ?? { ...fullEvent!, signUps: fullEvent!.signUps.filter((s) => s.id !== signupId) });
    } finally {
      setRemovingSignup(null);
    }
  }

  async function addSignup() {
    if (!selectedId || !addForm.userId.trim()) { toast.error("Discord user ID is required"); return; }
    setAddingSignup(true);
    try {
      const body: Record<string, string> = { userId: addForm.userId.trim() };
      if (addForm.className) body.className = addForm.className;
      if (addForm.specName)  body.specName  = addForm.specName;
      const res  = await fetch(`/api/raid-helper?eventId=${selectedId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Failed to add signup"); return; }
      toast.success("Signup added");
      setFullEvent(data.event ?? data);
      setAddForm({ userId: "", className: "", specName: "" });
      setShowAddSignup(false);
    } finally {
      setAddingSignup(false);
    }
  }

  // Roster processing
  const allSignups  = fullEvent?.signUps ?? [];
  const roster      = allSignups.filter((s) => !isDefaultStatus(s));
  const sidelined   = allSignups.filter((s) => isDefaultStatus(s));
  const byRole      = roster.reduce<Record<string, SignUp[]>>((acc, s) => {
    const role = s.cRoleName || s.roleName || "Other";
    (acc[role] = acc[role] ?? []).push(s);
    return acc;
  }, {});
  const roleKeys    = Object.keys(byRole).sort((a, b) => roleWeight(a) - roleWeight(b));
  const compSummary = roleKeys.map((r) => ({ role: r, count: byRole[r].length }));

  const bySidelineType = sidelined.reduce<Record<string, SignUp[]>>((acc, s) => {
    const t = s.cClassName || s.className;
    (acc[t] = acc[t] ?? []).push(s);
    return acc;
  }, {});

  const visible = events
    .filter((e) => filter === "upcoming" ? isUpcoming(e.startTime) : true)
    .filter((e) => !search || e.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.startTime - b.startTime)  // chronological, soonest first
    .slice(0, filter === "upcoming" ? 6 : undefined); // cap upcoming at 6

  const addSpecs = addForm.className ? (CLASS_SPECS[CLASS_NAME_MAP[addForm.className] ?? addForm.className] ?? []) : [];

  return (
    <div className="max-w-6xl space-y-6">
      <div className="page-header">
        <h1 className="page-title">Raid Helper</h1>
        <p className="page-subtitle">Live event signups · edit events · manage roster</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">

        {/* ── Left: event list ──────────────────────────── */}
        <div className="space-y-2.5">
          <div className="flex gap-2">
            <div className="tab-bar flex-1">
              {(["upcoming", "all"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`tab capitalize ${filter === f ? "active" : ""}`}>
                  {f}
                </button>
              ))}
            </div>
            <button onClick={fetchEvents} title="Refresh"
              className="text-sm text-[--color-text-muted] hover:text-[--color-gold] hover:bg-[--color-surface-2] border border-[--color-border] rounded-lg px-3 py-2 transition-all active:scale-95">
              ↺
            </button>
          </div>

          <input className="field text-sm" placeholder="Search events…"
            value={search} onChange={(e) => setSearch(e.target.value)} />

          {loading ? (
            <p className="text-sm text-[--color-text-muted] animate-pulse py-4 text-center">Loading events…</p>
          ) : visible.length === 0 ? (
            <div className="empty-state text-sm">No events found.</div>
          ) : (
            <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1 scrollbar-none">
              {visible.map((event) => {
                const upcoming = isUpcoming(event.startTime);
                const active   = selectedId === event.id;
                const [r, g, b] = (event.color ?? "").split(",").map(Number);
                const accentColor = event.color ? `rgb(${r},${g},${b})` : "var(--color-gold)";
                return (
                  <button key={event.id} onClick={() => loadEvent(event.id)}
                    className={`w-full text-left rounded-lg border-2 p-3 transition-all active:scale-[0.98] ${
                      active
                        ? "border-[--color-gold] bg-[--color-gold]/12 shadow-md"
                        : "border-[--color-border] bg-[--color-surface] hover:border-[--color-gold]/60 hover:bg-[--color-surface-2] hover:shadow-sm"
                    }`}>
                    <div className="flex items-start gap-2">
                      <div className="w-1 self-stretch rounded-full shrink-0 mt-0.5 min-h-[1rem]"
                        style={{ backgroundColor: accentColor }} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug truncate ${active ? "text-[--color-gold]" : "text-[--color-text]"}`}>
                          {event.title}
                        </p>
                        <p className="text-xs text-[--color-text-muted] mt-0.5 truncate">
                          {formatTime(event.startTime)}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-[10px] rounded-md border px-1.5 py-0.5 font-medium ${
                            upcoming
                              ? "bg-emerald-900/40 text-emerald-400 border-emerald-800"
                              : "bg-zinc-800 text-zinc-500 border-zinc-700"
                          }`}>
                            {upcoming ? "upcoming" : "past"}
                          </span>
                          <span className="text-xs text-[--color-text-muted]">{event.signUpCount} signed up</span>
                          {event.softresId && <span className="text-[10px] text-[--color-gold]/60">SR: {event.softresId}</span>}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right: event detail ───────────────────────── */}
        <div>
          {!selectedId ? (
            <div className="empty-state">Select an event to view and manage its roster.</div>
          ) : detailLoading ? (
            <div className="py-16 text-center text-[--color-text-muted] animate-pulse text-sm">Loading…</div>
          ) : fullEvent ? (
            <div className="space-y-4">

              {/* ── Event header ── */}
              <div className="bg-[--color-surface] border border-[--color-border] rounded-lg overflow-hidden">
                {fullEvent.color && <div className="h-1" style={{ backgroundColor: `rgb(${fullEvent.color})` }} />}
                <div className="p-5 space-y-3">
                  {editing ? (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--color-text-muted]">Title</label>
                        <input className="field" value={editForm.title}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--color-text-muted]">Description</label>
                        <textarea className="field resize-none" rows={4} value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
                        <button onClick={saveEdit} disabled={saving} className="btn-gold-solid disabled:opacity-50">
                          {saving ? "Saving…" : "Save Changes"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h2 className="text-base font-bold text-[--color-gold] truncate">{fullEvent.title}</h2>
                          <p className="text-xs text-[--color-text-muted] mt-0.5">
                            {formatTime(fullEvent.startTime)}
                            {fullEvent.channelName && <span className="ml-2 opacity-60">#{fullEvent.channelName}</span>}
                            <span className="ml-2 opacity-60">· {fullEvent.leaderName}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap">
                          <button onClick={() => startEdit(fullEvent)}
                            className="text-xs text-[--color-text-muted] hover:text-[--color-gold] hover:bg-[--color-surface-2] border border-[--color-border] rounded px-2.5 py-1.5 transition-all">
                            Edit
                          </button>
                          <button onClick={deleteEvent} disabled={deletingEvent}
                            className="text-xs text-red-400/70 hover:text-red-400 hover:bg-red-900/20 border border-red-900/40 hover:border-red-700 rounded px-2.5 py-1.5 transition-all disabled:opacity-40">
                            {deletingEvent ? "Deleting…" : "Delete Event"}
                          </button>
                          <a href={`https://discord.com/channels/${process.env.NEXT_PUBLIC_DISCORD_SERVER_ID ?? ""}/${fullEvent.channelId}`}
                            target="_blank" rel="noreferrer"
                            className="text-xs text-[--color-gold]/60 hover:text-[--color-gold] border border-[--color-border] rounded px-2.5 py-1.5 transition-all">
                            Discord ↗
                          </a>
                        </div>
                      </div>

                      {/* Comp summary */}
                      {compSummary.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {compSummary.map(({ role, count }) => (
                            <span key={role} className="text-xs rounded-md border border-[--color-border] bg-[--color-surface-2] px-2.5 py-1">
                              <span className="text-[--color-text-muted]">{role}: </span>
                              <span className="font-semibold text-[--color-text]">{count}</span>
                            </span>
                          ))}
                          <span className="text-xs rounded-md border border-[--color-gold]/40 bg-[--color-gold]/10 px-2.5 py-1 text-[--color-gold] font-bold">
                            {roster.length} total
                          </span>
                          {sidelined.length > 0 && (
                            <span className="text-xs rounded-md border border-[--color-border] px-2.5 py-1 text-[--color-text-muted]">
                              +{sidelined.length} bench/tent
                            </span>
                          )}
                        </div>
                      )}

                      {fullEvent.description && (
                        <p className="text-sm text-[--color-text-muted] whitespace-pre-wrap leading-relaxed border-t border-[--color-border] pt-3">
                          {fullEvent.description}
                        </p>
                      )}
                      {fullEvent.softresId && (
                        <a href={`https://softres.it/raid/${fullEvent.softresId}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-[--color-gold]/70 hover:text-[--color-gold] transition-colors">
                          Softres: {fullEvent.softresId} ↗
                        </a>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── Add signup ── */}
              <div>
                <button onClick={() => setShowAddSignup((v) => !v)}
                  className={`text-sm font-medium px-3 py-1.5 rounded-md border transition-all ${
                    showAddSignup
                      ? "border-[--color-gold] text-[--color-gold] bg-[--color-gold]/10"
                      : "border-[--color-border] text-[--color-text-muted] hover:border-[--color-gold]/50 hover:text-[--color-text]"
                  }`}>
                  + Add Signup
                </button>

                {showAddSignup && (
                  <div className="mt-3 bg-[--color-surface] border border-[--color-border] rounded-lg p-4 space-y-3">
                    <p className="text-xs text-[--color-text-muted]">
                      Enter a Discord user ID <span className="opacity-60">(right-click name → Copy User ID)</span> or search by name from the current roster.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--color-text-muted]">Discord User ID or Name *</label>
                        <input className="field text-sm" placeholder="ID or search name…"
                          value={addForm.userId} onChange={(e) => setAddForm({ ...addForm, userId: e.target.value })} />
                        {/* Name suggestions from current event roster */}
                        {addForm.userId && !/^\d{10,}$/.test(addForm.userId) && allSignups.length > 0 && (
                          <div className="border border-[--color-border] rounded bg-[--color-surface-2] max-h-32 overflow-y-auto">
                            {allSignups
                              .filter(s => s.name.toLowerCase().includes(addForm.userId.toLowerCase()) && s.userId)
                              .slice(0, 6)
                              .map(s => (
                                <button key={s.id} type="button"
                                  onClick={() => setAddForm({ ...addForm, userId: s.userId })}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[--color-surface] transition-colors flex items-center gap-2">
                                  <span className="font-medium">{s.name}</span>
                                  <span className="text-[--color-text-muted]">{s.userId}</span>
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--color-text-muted]">Class</label>
                        <select className="field text-sm" value={addForm.className}
                          onChange={(e) => setAddForm({ ...addForm, className: e.target.value, specName: "" })}>
                          <option value="">— Any —</option>
                          {ALL_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-[--color-text-muted]">Spec</label>
                        <select className="field text-sm" value={addForm.specName}
                          onChange={(e) => setAddForm({ ...addForm, specName: e.target.value })}
                          disabled={!addForm.className}>
                          <option value="">— Any —</option>
                          {addSpecs.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setShowAddSignup(false)} className="btn-secondary text-sm">Cancel</button>
                      <button onClick={addSignup} disabled={addingSignup} className="btn-gold-solid text-sm disabled:opacity-50">
                        {addingSignup ? "Adding…" : "Add Signup"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Roster by role ── */}
              {allSignups.length === 0 ? (
                <div className="empty-state">No signups yet.</div>
              ) : (
                <div className="space-y-3">
                  {roleKeys.map((role) => {
                    const members = [...byRole[role]].sort((a, b) => a.position - b.position);
                    return (
                      <div key={role} className="bg-[--color-surface] border border-[--color-border] rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[--color-surface-2] border-b border-[--color-border]">
                          <span className="text-xs font-bold uppercase tracking-wider text-[--color-text-muted]">{role}</span>
                          <span className="text-xs text-[--color-text-muted]">{members.length}</span>
                        </div>
                        <div className="divide-y divide-[--color-border]">
                          {members.map((s) => {
                            const color = getClassColor(s.cClassName || s.className);
                            return (
                              <div key={s.id} className="px-4 py-2 text-sm group hover:bg-[--color-surface-2] transition-colors">
                                <div className="flex items-center gap-3">
                                  <span className="w-5 text-[10px] text-[--color-text-muted] text-center shrink-0 tabular-nums">{s.position}</span>
                                  <span className="font-medium w-28 shrink-0 truncate" style={{ color }}>{s.name}</span>
                                  <span className="text-xs text-[--color-text-muted] flex-1 truncate">
                                    {s.cClassName || s.className}{s.cSpecName ? ` · ${s.cSpecName}` : ""}
                                  </span>
                                  <button onClick={() => removeSignup(s.id, s.name)} disabled={removingSignup === s.id}
                                    className="ml-auto shrink-0 text-xs text-transparent group-hover:text-[--color-text-muted] hover:!text-red-400 transition-colors disabled:opacity-40">
                                    {removingSignup === s.id ? "…" : "✕"}
                                  </button>
                                </div>
                                {s.note && (
                                  <p className="ml-8 mt-1 text-xs text-[--color-text-muted] italic whitespace-pre-wrap break-words leading-relaxed">
                                    "{s.note}"
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Bench / Tentative / Late / Absent */}
                  {sidelined.length > 0 && (
                    <div className="bg-[--color-surface] border border-[--color-border] rounded-lg overflow-hidden opacity-75">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[--color-surface-2] border-b border-[--color-border]">
                        <span className="text-xs font-bold uppercase tracking-wider text-[--color-text-muted]">
                          Bench / Tentative / Late / Absent
                        </span>
                        <span className="text-xs text-[--color-text-muted]">{sidelined.length}</span>
                      </div>
                      <div className="divide-y divide-[--color-border]">
                        {Object.values(bySidelineType).flat().map((s) => {
                          const badge = statusBadge(s);
                          return (
                            <div key={s.id} className="px-4 py-2 text-sm group hover:bg-[--color-surface-2] transition-colors">
                              <div className="flex items-center gap-3">
                                {badge && (
                                  <span className={`text-[10px] rounded border px-1.5 py-px shrink-0 ${badge.color}`}>{badge.label}</span>
                                )}
                                <span className="font-medium w-28 shrink-0 truncate text-[--color-text-muted]">{s.name}</span>
                                <span className="text-xs text-[--color-text-muted] flex-1 truncate">
                                  {s.cSpecName || ""}
                                </span>
                                <button onClick={() => removeSignup(s.id, s.name)} disabled={removingSignup === s.id}
                                  className="ml-auto shrink-0 text-xs text-transparent group-hover:text-[--color-text-muted] hover:!text-red-400 transition-colors disabled:opacity-40">
                                  {removingSignup === s.id ? "…" : "✕"}
                                </button>
                              </div>
                              {s.note && (
                                <p className="ml-8 mt-1 text-xs text-[--color-text-muted] italic whitespace-pre-wrap break-words leading-relaxed">
                                  "{s.note}"
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
