"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { Phase, Reflection, Workout, WorkoutExercise } from "@/lib/types";
import { finishWorkout, saveSet, saveSqueeze, setExerciseDone, startWorkout } from "@/app/actions";
import { AlertIcon, BackIcon, CheckIcon } from "@/components/Icons";

const BLOCK_LABEL: Record<string, string> = {
  warmup: "Warm-up",
  rehab: "Adductor rehab",
  strength: "Strength",
  upper: "Upper body",
  conditioning: "Conditioning",
  cooldown: "Cool-down",
};
const BLOCK_ORDER = ["warmup", "rehab", "strength", "upper", "conditioning", "cooldown"];

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

function rx(it: WorkoutExercise) {
  const parts: string[] = [];
  if (it.sets && it.reps) parts.push(`${it.sets} × ${it.reps}`);
  else if (it.sets && it.duration_s) parts.push(it.duration_s >= 120 ? `${Math.round(it.duration_s / 60)} min` : `${it.sets} × ${it.duration_s} s`);
  else if (it.reps) parts.push(it.reps);
  if (it.intensity) parts.push(it.intensity);
  return parts.join(" · ");
}

export function SessionClient({
  workout,
  phase,
  reflection,
  items,
}: {
  workout: Workout;
  phase: Phase | null;
  reflection: Reflection | null;
  items: WorkoutExercise[];
}) {
  const readOnly = workout.status === "done";
  const [done, setDone] = useState<Record<string, boolean>>(
    Object.fromEntries(items.map((i) => [i.id, !!i.completed_at])),
  );
  const [open, setOpen] = useState<string | null>(
    readOnly ? null : (items.find((i) => !i.completed_at)?.id ?? null),
  );
  const [startedAt] = useState<number>(() =>
    workout.started_at ? new Date(workout.started_at).getTime() : Date.now(),
  );
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [finishing, startFinish] = useTransition();

  useEffect(() => {
    if (!readOnly && !workout.started_at) startWorkout(workout.id);
  }, [readOnly, workout.id, workout.started_at]);

  useEffect(() => {
    if (readOnly) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [readOnly]);

  useEffect(() => {
    if (restEnd && now >= restEnd) {
      setRestEnd(null);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    }
  }, [now, restEnd]);

  const blocks = useMemo(
    () =>
      BLOCK_ORDER.map((b) => ({ b, list: items.filter((i) => i.block === b) })).filter((x) => x.list.length),
    [items],
  );
  const total = items.length;
  const doneCount = Object.values(done).filter(Boolean).length;
  const [titleMain, ...titleRest] = workout.title.split("—");

  const toggle = (id: string) => {
    const val = !done[id];
    setDone((d) => ({ ...d, [id]: val }));
    setExerciseDone(id, val);
    if (val) {
      const idx = items.findIndex((i) => i.id === id);
      const nextOpen = items.slice(idx + 1).find((i) => !done[i.id]);
      setOpen(nextOpen?.id ?? null);
    }
  };

  return (
    <main className="mx-auto max-w-md pb-40">
      <div className="sticky top-0 z-10 flex flex-col gap-3 bg-ink/95 px-5 pb-3 pt-safe backdrop-blur">
        <div className="flex items-center justify-between pt-2">
          <Link
            href={readOnly ? "/history" : "/"}
            aria-label="Back"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card"
          >
            <BackIcon size={20} />
          </Link>
          <div className="font-display text-[22px] font-semibold tabular-nums">
            {readOnly
              ? workout.completed_at
                ? new Date(workout.completed_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
                : "Done"
              : fmt((now - startedAt) / 1000)}
          </div>
          <div className="min-w-11 text-right text-[13px] text-muted">
            {doneCount}/{total}
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          <div className="text-[13px] text-muted">
            {titleMain.trim()}
            {phase ? ` · Phase ${phase.position}` : ""}
          </div>
          <h1 className="font-display text-[26px] font-bold leading-tight">
            {titleRest.length ? titleRest.join("—").trim() : titleMain.trim()}
          </h1>
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-line">
          <div className="h-1.5 bg-green transition-all" style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }} />
        </div>
        {workout.rules && !readOnly && (
          <div className="flex items-start gap-2.5 rounded-2xl bg-pink px-3 py-2.5 text-[13px] font-medium text-ink">
            <AlertIcon size={18} className="mt-px shrink-0" />
            <span>{workout.rules}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 px-5 pt-2">
        {blocks.map(({ b, list }) => (
          <section key={b} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{BLOCK_LABEL[b] ?? b}</h2>
            {list.map((it) => (
              <ExerciseCard
                key={it.id}
                it={it}
                done={!!done[it.id]}
                open={open === it.id}
                readOnly={readOnly}
                reflection={reflection}
                workoutId={workout.id}
                onToggle={() => toggle(it.id)}
                onOpen={() => setOpen((o) => (o === it.id ? null : it.id))}
                onSetSaved={() => it.rest_s && setRestEnd(Date.now() + it.rest_s * 1000)}
              />
            ))}
          </section>
        ))}
        {workout.notes && <p className="text-[13px] text-muted">{workout.notes}</p>}
      </div>

      {!readOnly ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink pb-safe">
          <div className="mx-auto flex max-w-md items-center gap-3 px-5 pt-3">
            <button
              type="button"
              onClick={() => setRestEnd(restEnd ? null : Date.now() + 90_000)}
              className="flex min-w-[92px] flex-col text-left"
            >
              <span className="text-[11px] uppercase tracking-wider text-muted">{restEnd ? "Rest" : "Rest timer"}</span>
              <span className="font-display text-[22px] font-semibold tabular-nums text-yellow">
                {restEnd ? fmt((restEnd - now) / 1000) : "1:30"}
              </span>
            </button>
            <button
              type="button"
              disabled={finishing}
              onClick={() => startFinish(() => finishWorkout(workout.id))}
              className="min-h-13 flex-1 rounded-full bg-white py-3.5 text-base font-semibold text-ink disabled:opacity-60"
            >
              {finishing ? "Saving…" : "Finish → Reflect"}
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink pb-safe">
          <div className="mx-auto max-w-md px-5 pt-3">
            <Link
              href={`/session/${workout.id}/reflect`}
              className="flex min-h-13 items-center justify-center rounded-full bg-white py-3.5 text-base font-semibold text-ink"
            >
              {reflection?.pain_during != null ? "Edit reflection" : "Add reflection"}
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

function ExerciseCard({
  it,
  done,
  open,
  readOnly,
  reflection,
  workoutId,
  onToggle,
  onOpen,
  onSetSaved,
}: {
  it: WorkoutExercise;
  done: boolean;
  open: boolean;
  readOnly: boolean;
  reflection: Reflection | null;
  workoutId: string;
  onToggle: () => void;
  onOpen: () => void;
  onSetSaved: () => void;
}) {
  const isRehab = it.block === "rehab";
  const timeBased = !it.reps && !!it.duration_s;
  const setCount = Math.max(it.sets ?? 1, it.set_logs.length);
  const logs = Object.fromEntries(it.set_logs.map((s) => [s.set_number, s]));
  const hasLogs = it.set_logs.length > 0;

  return (
    <div className="flex flex-col rounded-2xl border border-line bg-card">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <button
          type="button"
          onClick={onToggle}
          disabled={readOnly}
          aria-label={`Mark ${it.exercise.name} ${done ? "not done" : "done"}`}
          aria-pressed={done}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 ${
            done ? "border-green bg-green text-ink" : "border-[#3a3a3a]"
          }`}
        >
          {done && <CheckIcon size={20} />}
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-expanded={open}
          className="flex min-h-11 flex-1 flex-col items-start justify-center gap-0.5 text-left"
        >
          <span className="text-[15px] font-medium">{it.exercise.name}</span>
          <span className="text-[13px] text-muted">
            {rx(it)}
            {hasLogs && !open ? " · logged" : ""}
          </span>
        </button>
        {isRehab && <span className="rounded-full bg-blue px-2 py-1 text-[11px] font-semibold text-ink">REHAB</span>}
      </div>

      {open && (
        <div className="flex flex-col gap-2 border-t border-line p-3">
          {(it.exercise.cues || it.notes) && (
            <p className="text-[13px] leading-snug text-muted">
              {[it.exercise.cues, it.notes].filter(Boolean).join(" · ")}
            </p>
          )}
          <div
            className={`grid gap-2 text-[11px] uppercase tracking-wide text-muted ${
              timeBased ? "grid-cols-[36px_1fr_1fr]" : "grid-cols-[36px_1fr_1fr_1fr]"
            }`}
          >
            <div>Set</div>
            {timeBased ? <div>Sec</div> : <><div>kg</div><div>Reps</div></>}
            <div>Pain</div>
          </div>
          {Array.from({ length: setCount }, (_, i) => i + 1).map((n) => (
            <SetRow
              key={n}
              n={n}
              timeBased={timeBased}
              readOnly={readOnly}
              initial={logs[n]}
              placeholder={{ reps: it.reps ?? "", sec: it.duration_s ? String(it.duration_s) : "" }}
              onSave={async (v) => {
                await saveSet({ workoutExerciseId: it.id, setNumber: n, ...v });
                if (v.reps || v.durationS) onSetSaved();
              }}
            />
          ))}
          {isRehab && <SqueezeTest workoutId={workoutId} reflection={reflection} readOnly={readOnly} />}
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full min-h-11 rounded-[10px] border border-line bg-card2 px-2.5 text-[15px] text-white outline-none placeholder:text-[#808080] focus:border-white disabled:opacity-70";

function SetRow({
  n,
  timeBased,
  readOnly,
  initial,
  placeholder,
  onSave,
}: {
  n: number;
  timeBased: boolean;
  readOnly: boolean;
  initial?: { weight_kg: number | null; reps: number | null; duration_s: number | null; pain: number | null };
  placeholder: { reps: string; sec: string };
  onSave: (v: { weightKg: string; reps: string; durationS: string; pain: string }) => Promise<void>;
}) {
  const [v, setV] = useState({
    weightKg: initial?.weight_kg?.toString() ?? "",
    reps: initial?.reps?.toString() ?? "",
    durationS: initial?.duration_s?.toString() ?? "",
    pain: initial?.pain?.toString() ?? "",
  });
  const [saved, setSaved] = useState(JSON.stringify(v));
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");

  const commit = async () => {
    const s = JSON.stringify(v);
    if (s === saved) return;
    setState("saving");
    try {
      await onSave(v);
      setSaved(s);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const field = (key: keyof typeof v, label: string, ph: string, mode: "decimal" | "numeric") => (
    <label className="flex">
      <span className="sr-only">
        {label} set {n}
      </span>
      <input
        inputMode={mode}
        type="text"
        value={v[key]}
        placeholder={ph}
        disabled={readOnly}
        onChange={(e) => setV((o) => ({ ...o, [key]: e.target.value.replace(",", ".") }))}
        onBlur={commit}
        className={inputCls}
      />
    </label>
  );

  return (
    <div
      className={`grid items-center gap-2 ${timeBased ? "grid-cols-[36px_1fr_1fr]" : "grid-cols-[36px_1fr_1fr_1fr]"}`}
    >
      <div className={`text-sm ${state === "error" ? "text-pink" : "text-muted"}`}>{state === "error" ? "!" : n}</div>
      {timeBased ? (
        field("durationS", "Seconds", placeholder.sec || "sec", "numeric")
      ) : (
        <>
          {field("weightKg", "Kilograms", "kg", "decimal")}
          {field("reps", "Reps", placeholder.reps.replace(/\/.*/, "") || "reps", "numeric")}
        </>
      )}
      {field("pain", "Pain", "0–10", "numeric")}
    </div>
  );
}

function SqueezeTest({
  workoutId,
  reflection,
  readOnly,
}: {
  workoutId: string;
  reflection: Reflection | null;
  readOnly: boolean;
}) {
  const [effort, setEffort] = useState(reflection?.squeeze_effort?.toString() ?? "");
  const [pain, setPain] = useState(reflection?.squeeze_pain?.toString() ?? "");
  const commit = () => {
    if (effort || pain) saveSqueeze(workoutId, effort || null, pain || null);
  };
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl bg-blue p-3 text-ink">
      <div className="text-[13px] font-semibold">Squeeze test · 3 s hard</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Effort 0–10
          <input
            inputMode="numeric"
            value={effort}
            disabled={readOnly}
            onChange={(e) => setEffort(e.target.value)}
            onBlur={commit}
            placeholder="e.g. 8"
            className="min-h-11 rounded-[10px] border border-black/20 bg-white/40 px-2.5 text-[15px] text-ink outline-none placeholder:text-black/50"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Pain 0–10
          <input
            inputMode="numeric"
            value={pain}
            disabled={readOnly}
            onChange={(e) => setPain(e.target.value)}
            onBlur={commit}
            placeholder="e.g. 2"
            className="min-h-11 rounded-[10px] border border-black/20 bg-white/40 px-2.5 text-[15px] text-ink outline-none placeholder:text-black/50"
          />
        </label>
      </div>
    </div>
  );
}
