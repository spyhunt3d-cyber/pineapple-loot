"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface Raid {
  id: number;
  softresId: string;
  instance: string;
  night: number;
  raidDate: string;
}

interface RaidWeek {
  id: number;
  weekStart: string;
  raids: Raid[];
}

export default function AdminRaidsPage() {
  const [weeks, setWeeks] = useState<RaidWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWeekDate, setNewWeekDate] = useState("");
  const [newRaid, setNewRaid] = useState({
    weekId: "",
    softresId: "",
    instance: "Siege of Orgrimmar",
    night: "1",
    raidDate: "",
  });
  const [saving, setSaving] = useState(false);

  async function loadWeeks() {
    const res = await fetch("/api/raid-weeks");
    const { weeks: data } = await res.json();
    setWeeks(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadWeeks(); }, []);

  async function createWeek() {
    if (!newWeekDate) return;
    setSaving(true);
    try {
      const res = await fetch("/api/raid-weeks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart: newWeekDate }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Failed to create week");
        return;
      }
      toast.success("Raid week created");
      setNewWeekDate("");
      loadWeeks();
    } finally {
      setSaving(false);
    }
  }

  async function createRaid() {
    if (!newRaid.weekId || !newRaid.softresId || !newRaid.raidDate) {
      toast.error("Fill in all fields");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/raids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekId: parseInt(newRaid.weekId, 10),
          softresId: newRaid.softresId.trim(),
          instance: newRaid.instance.trim(),
          night: parseInt(newRaid.night, 10),
          raidDate: newRaid.raidDate,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error ?? "Failed to create raid");
        return;
      }
      toast.success("Raid created! Soft reserves are syncing from Softres.it…");
      setNewRaid({ ...newRaid, softresId: "", raidDate: "" });
      loadWeeks();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <h1 className="text-2xl font-bold text-[--color-gold]">Raid Weeks</h1>

      {/* Create new week */}
      <section className="rounded-lg border border-[--color-border] bg-[--color-surface] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[--color-text-muted] uppercase tracking-wide">
          Create New Raid Week
        </h2>
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs text-[--color-text-muted] mb-1">
              Week Start (Monday)
            </label>
            <input
              type="date"
              value={newWeekDate}
              onChange={(e) => setNewWeekDate(e.target.value)}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            />
          </div>
          <button
            onClick={createWeek}
            disabled={saving || !newWeekDate}
            className="rounded-md bg-[--color-gold] px-4 py-2 text-sm font-semibold text-black hover:bg-[--color-gold-light] disabled:opacity-50 transition-colors"
          >
            Create Week
          </button>
        </div>
      </section>

      {/* Add raid night to a week */}
      <section className="rounded-lg border border-[--color-border] bg-[--color-surface] p-6 space-y-4">
        <h2 className="text-sm font-semibold text-[--color-text-muted] uppercase tracking-wide">
          Add Raid Night
        </h2>
        <p className="text-xs text-[--color-text-muted]">
          Adding a raid night will automatically sync soft reserves from Softres.it and compute roll streaks.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-[--color-text-muted] mb-1">Week</label>
            <select
              value={newRaid.weekId}
              onChange={(e) => setNewRaid({ ...newRaid, weekId: e.target.value })}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            >
              <option value="">— Select week —</option>
              {weeks.map((w) => (
                <option key={w.id} value={String(w.id)}>
                  {formatDate(w.weekStart)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[--color-text-muted] mb-1">Night</label>
            <select
              value={newRaid.night}
              onChange={(e) => setNewRaid({ ...newRaid, night: e.target.value })}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            >
              <option value="1">Night 1</option>
              <option value="2">Night 2</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-[--color-text-muted] mb-1">Softres.it ID</label>
            <input
              type="text"
              placeholder="e.g. tu8jdg"
              value={newRaid.softresId}
              onChange={(e) => setNewRaid({ ...newRaid, softresId: e.target.value })}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            />
          </div>

          <div>
            <label className="block text-xs text-[--color-text-muted] mb-1">Raid Date</label>
            <input
              type="date"
              value={newRaid.raidDate}
              onChange={(e) => setNewRaid({ ...newRaid, raidDate: e.target.value })}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-[--color-text-muted] mb-1">Instance</label>
            <input
              type="text"
              value={newRaid.instance}
              onChange={(e) => setNewRaid({ ...newRaid, instance: e.target.value })}
              className="w-full rounded-md border border-[--color-border] bg-[--color-surface-2] px-3 py-2 text-sm text-[--color-text] focus:outline-none focus:ring-1 focus:ring-[--color-gold]"
            />
          </div>
        </div>

        <button
          onClick={createRaid}
          disabled={saving}
          className="rounded-md bg-[--color-gold] px-4 py-2 text-sm font-semibold text-black hover:bg-[--color-gold-light] disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving & syncing reserves…" : "Add Raid Night"}
        </button>
      </section>

      {/* Existing weeks */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-[--color-text-muted] uppercase tracking-wide">
          All Weeks
        </h2>

        {loading ? (
          <p className="text-[--color-text-muted] animate-pulse">Loading…</p>
        ) : weeks.length === 0 ? (
          <p className="text-[--color-text-muted]">No raid weeks yet.</p>
        ) : (
          <div className="space-y-3">
            {weeks.map((week) => (
              <div
                key={week.id}
                className="rounded-lg border border-[--color-border] bg-[--color-surface] p-4"
              >
                <p className="font-medium text-[--color-text]">
                  Week of {formatDate(week.weekStart)}
                </p>
                {week.raids.length === 0 ? (
                  <p className="mt-1 text-sm text-[--color-text-muted]">No raids added yet</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {week.raids.map((raid) => (
                      <div key={raid.id} className="flex items-center gap-3 text-sm">
                        <span className="text-[--color-text-muted]">Night {raid.night}:</span>
                        <span className="text-[--color-text]">{raid.instance}</span>
                        <a
                          href={`https://softres.it/raid/${raid.softresId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-[--color-gold]/70 hover:text-[--color-gold]"
                        >
                          [{raid.softresId}] ↗
                        </a>
                        <span className="text-[--color-text-muted]">
                          {new Date(raid.raidDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
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
