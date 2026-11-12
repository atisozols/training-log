import type { Reflection, Workout, WorkoutExercise } from "./types";

export const XP = {
  session: 40,
  reflection: 10,
  morningCheckIn: 10,
  greenSession: 10, // pain during and next morning both ≤ 3
};
export const XP_PER_LEVEL = 200;

export type DoneWorkout = Workout & { reflection: Reflection | null; items: WorkoutExercise[] };

export function isGreen(r: Reflection | null) {
  return (
    !!r &&
    r.pain_during !== null &&
    r.pain_during <= 3 &&
    r.pain_next_morning !== null &&
    r.pain_next_morning <= 3
  );
}

export function computeXp(done: DoneWorkout[]) {
  let xp = 0;
  for (const w of done) {
    xp += XP.session;
    if (w.reflection?.pain_during !== null && w.reflection?.pain_during !== undefined) xp += XP.reflection;
    if (w.reflection?.pain_next_morning !== null && w.reflection?.pain_next_morning !== undefined)
      xp += XP.morningCheckIn;
    if (isGreen(w.reflection)) xp += XP.greenSession;
  }
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { xp, level, into, pct: Math.round((into / XP_PER_LEVEL) * 100) };
}

function isoWeekKey(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-${week}`;
}

/** Consecutive ISO weeks with ≥1 done session, counting back from this week (or last week if this week is still empty). */
export function weekStreak(done: DoneWorkout[], now = new Date()) {
  const weeks = new Set(done.filter((w) => w.completed_at).map((w) => isoWeekKey(new Date(w.completed_at!))));
  let streak = 0;
  const cursor = new Date(now);
  if (!weeks.has(isoWeekKey(cursor))) cursor.setDate(cursor.getDate() - 7);
  while (weeks.has(isoWeekKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

export function greenRun(done: DoneWorkout[]) {
  // longest run of consecutive green sessions (chronological)
  let best = 0;
  let cur = 0;
  for (const w of [...done].sort((a, b) => (a.completed_at ?? "").localeCompare(b.completed_at ?? ""))) {
    if (isGreen(w.reflection)) {
      cur += 1;
      best = Math.max(best, cur);
    } else cur = 0;
  }
  return best;
}

export type Badge = { key: string; name: string; earned: boolean; hint: string };

export function computeBadges(opts: {
  done: DoneWorkout[];
  streak: number;
  phase1Cleared: boolean;
  programCompleted: boolean;
}): Badge[] {
  const { done, streak, phase1Cleared, programCompleted } = opts;
  const did = (needle: string) =>
    done.some((w) => w.items.some((i) => i.exercise?.name.toLowerCase().includes(needle)));
  return [
    { key: "first", name: "First session", earned: done.length >= 1, hint: "Finish a session" },
    {
      key: "baseline",
      name: "Baseline set",
      earned: done.some((w) => w.reflection?.squeeze_effort != null),
      hint: "Log a squeeze test",
    },
    { key: "green3", name: "3 green in a row", earned: greenRun(done) >= 3, hint: "3 sessions ≤3/10, also next morning" },
    { key: "streak3", name: "3-week streak", earned: streak >= 3, hint: "Train 3 weeks in a row" },
    { key: "phase1", name: "Phase 1 cleared", earned: phase1Cleared, hint: "Pass phase 1 criteria" },
    { key: "copeshort", name: "Short Copenhagen", earned: did("copenhagen plank (short"), hint: "First short-lever Copenhagen" },
    { key: "nordic", name: "First Nordic", earned: did("nordic"), hint: "First Nordic curl session" },
    { key: "copelong", name: "Long Copenhagen", earned: did("copenhagen plank (long"), hint: "First long-lever Copenhagen" },
    { key: "pitch", name: "Back on the pitch", earned: programCompleted, hint: "Complete the rehab plan" },
  ];
}

export function painTone(v: number | null | undefined) {
  if (v === null || v === undefined) return "bg-card2 text-muted";
  if (v <= 3) return "bg-green text-ink";
  if (v <= 5) return "bg-yellow text-ink";
  return "bg-pink text-ink";
}

export function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}
