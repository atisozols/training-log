"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Phase, Reflection, WorkoutExercise } from "@/lib/types";
import { useData, type WorkoutFull } from "@/components/DataProvider";
import { IntervalTimer, beep, ensureAudio } from "@/components/IntervalTimer";
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
  else if (it.sets && it.duration_s)
    parts.push(it.duration_s >= 120 ? `${Math.round(it.duration_s / 60)} min` : `${it.sets} × ${it.duration_s} s`);
  else if (it.reps) parts.push(it.reps);
  if (it.intensity) parts.push(it.intensity);
  return parts.join(" · ");
}

export function SessionClient({ workout, phase }: { workout: WorkoutFull; phase: Phase | null }) {
  const router = useRouter();
  const { actions } = useData();
  const items = workout.items;
  const readOnly = workout.status === "done";
  const [open, setOpen] = useState<string | null>(readOnly ? null : (items.find((i) => !i.completed_at)?.id ?? null));
  const [now, setNow] = useState(Date.now());
  const [restEnd, setRestEnd] = useState<number | null>(null);
  const [restPulse, setRestPulse] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const started = !!workout.started_at;
  const nothingLogged = items.every((i) => !i.completed_at && i.set_logs.length === 0);

  useEffect(() => {
    if (readOnly || !started) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [readOnly, started]);

  useEffect(() => {
    if (restEnd && now >= restEnd) {
      setRestEnd(null);
      setRestPulse((n) => n + 1);
      beep(1175, 380, 0.35);
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {}
    }
  }, [now, restEnd]);

  const blocks = useMemo(
    () => BLOCK_ORDER.map((b) => ({ b, list: items.filter((i) => i.block === b) })).filter((x) => x.list.length),
    [items],
  );
  const total = items.length;
  const doneCount = items.filter((i) => i.completed_at).length;
  const startedAt = workout.started_at ? new Date(workout.started_at).getTime() : now;
  const [titleMain, ...titleRest] = workout.title.split("—");

  const setDone = (it: WorkoutExercise, val: boolean) => {
    actions.setExerciseDone(workout.id, it.id, val);
    if (val) {
      const idx = items.findIndex((i) => i.id === it.id);
      const nextOpen = items.slice(idx + 1).find((i) => !i.completed_at);
      setOpen(nextOpen?.id ?? null);
    }
  };

  const finish = async () => {
    setFinishing(true);
    try {
      await actions.finishWorkout(workout.id);
    } finally {
      router.push(`/session/${workout.id}/reflect`);
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
              : started
                ? fmt((now - startedAt) / 1000)
                : "Not started"}
          </div>
          {!readOnly && started && nothingLogged ? (
            <button
              type="button"
              onClick={() => actions.cancelStart(workout.id)}
              className="min-h-11 rounded-full border border-line px-3 text-[13px] text-muted"
            >
              Cancel start
            </button>
          ) : (
            <div className="min-w-11 text-right text-[13px] text-muted">
              {doneCount}/{total}
            </div>
          )}
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
                open={open === it.id}
                readOnly={readOnly}
                reflection={workout.reflection}
                workoutId={workout.id}
                onToggle={() => setDone(it, !it.completed_at)}
                onAutoDone={() => !it.completed_at && setDone(it, true)}
                onOpen={() => setOpen((o) => (o === it.id ? null : it.id))}
                onSetSaved={() => {
                  if (!it.rest_s) return;
                  ensureAudio();
                  setRestEnd(Date.now() + it.rest_s * 1000);
                }}
              />
            ))}
          </section>
        ))}
        {workout.notes && <p className="text-[13px] text-muted">{workout.notes}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink pb-safe">
        {!readOnly && !started ? (
          <div className="mx-auto max-w-md px-5 pt-3">
            <button
              type="button"
              onClick={() => actions.startWorkout(workout.id)}
              className="min-h-13 w-full rounded-full bg-yellow py-3.5 text-base font-semibold text-ink"
            >
              Start workout
            </button>
          </div>
        ) : !readOnly ? (
          <div className="mx-auto flex max-w-md items-center gap-3 px-5 pt-3">
            <button
              type="button"
              onClick={() => {
                ensureAudio();
                setRestEnd(restEnd ? null : Date.now() + 90_000);
              }}
              key={restPulse}
              className={`flex min-w-[92px] flex-col text-left ${restPulse ? "nudge" : ""}`}
            >
              <span className="text-[11px] uppercase tracking-wider text-muted">{restEnd ? "Rest" : "Rest timer"}</span>
              <span className="font-display text-[22px] font-semibold tabular-nums text-yellow">
                {restEnd ? fmt((restEnd - now) / 1000) : "1:30"}
              </span>
            </button>
            <button
              type="button"
              disabled={finishing}
              onClick={finish}
              className="min-h-13 flex-1 rounded-full bg-white py-3.5 text-base font-semibold text-ink disabled:opacity-60"
            >
              {finishing ? "Saving…" : "Finish → Reflect"}
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-md px-5 pt-3">
            <Link
              href={`/session/${workout.id}/reflect`}
              className="flex min-h-13 items-center justify-center rounded-full bg-white py-3.5 text-base font-semibold text-ink"
            >
              {workout.reflection?.pain_during != null ? "Edit reflection" : "Add reflection"}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

function ExerciseCard({
  it,
  open,
  readOnly,
  reflection,
  workoutId,
  onToggle,
  onAutoDone,
  onOpen,
  onSetSaved,
}: {
  it: WorkoutExercise;
  open: boolean;
  readOnly: boolean;
  reflection: Reflection | null;
  workoutId: string;
  onToggle: () => void;
  onAutoDone: () => void;
  onOpen: () => void;
  onSetSaved: () => void;
}) {
  const { actions } = useData();
  const done = !!it.completed_at;
  const isRehab = it.block === "rehab";
  const timeBased = !it.reps && !!it.duration_s;
  const loadType = it.exercise.load_type ?? "weight";
  const perSide = timeBased && /side/i.test(`${it.notes ?? ""} ${it.reps ?? ""}`);
  const sets = it.sets ?? 1;
  const setCount = Math.max(sets, it.set_logs.length);
  const logs = Object.fromEntries(it.set_logs.map((s) => [s.set_number, s]));
  const loggedTimed = it.set_logs.filter((s) => s.duration_s != null).length;
  const restForTimer = it.rest_s ?? (sets > 1 ? 30 : 0);
  // keep content mounted after first open so it can animate closed (and a running timer survives collapsing)
  const [mounted, setMounted] = useState(open);
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    setMounted(true);
    // bring the newly opened exercise into view once it has expanded
    const t = setTimeout(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      cardRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    }, 240);
    return () => clearTimeout(t);
  }, [open]);

  return (
    <div ref={cardRef} className="flex scroll-mt-60 scroll-mb-36 flex-col rounded-2xl border border-line bg-card">
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
          {done && <CheckIcon size={20} className="draw" />}
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
            {timeBased && !open && !readOnly ? " · timer" : ""}
            {it.set_logs.length > 0 && !open ? " · logged" : ""}
          </span>
        </button>
        {isRehab && <span className="rounded-full bg-blue px-2 py-1 text-[11px] font-semibold text-ink">REHAB</span>}
      </div>

      <div className="expander" data-open={open} aria-hidden={!open} inert={!open}>
        <div>
        {mounted && (
        <div className="flex flex-col gap-2 border-t border-line p-3">
          {(it.exercise.cues || it.notes) && (
            <p className="text-[13px] leading-snug text-muted">{[it.exercise.cues, it.notes].filter(Boolean).join(" · ")}</p>
          )}

          {timeBased && !readOnly && (
            <IntervalTimer
              sets={sets}
              work={it.duration_s!}
              rest={restForTimer}
              perSide={perSide}
              loggedSets={loggedTimed}
              onSetDone={(n, seconds) =>
                actions
                  .saveSet(workoutId, it.id, n, {
                    durationS: String(seconds),
                    pain: logs[n]?.pain?.toString() ?? "",
                  })
                  .catch(() => {})
              }
              onAllDone={onAutoDone}
            />
          )}

          <div
            className={`grid gap-2 text-[11px] uppercase tracking-wide text-muted ${
              timeBased ? "grid-cols-[36px_1fr_1fr]" : "grid-cols-[36px_1fr_1fr_1fr]"
            }`}
          >
            <div>Set</div>
            {timeBased ? (
              <div>Sec{perSide ? " / side" : ""}</div>
            ) : (
              <>
                <div>
                  {loadType === "band" ? "Band" : loadType === "stack" ? "Pin" : loadType === "bodyweight" ? "+kg" : "kg"}
                </div>
                <div>Reps</div>
              </>
            )}
            <div>Pain</div>
          </div>
          {Array.from({ length: setCount }, (_, i) => i + 1).map((n) => (
            <SetRow
              key={`${n}-${logs[n]?.duration_s ?? ""}`}
              n={n}
              timeBased={timeBased}
              loadType={loadType}
              readOnly={readOnly}
              initial={logs[n]}
              placeholder={{ reps: it.reps ?? "", sec: it.duration_s ? String(it.duration_s) : "" }}
              onSave={async (v) => {
                await actions.saveSet(workoutId, it.id, n, v);
                if (v.reps || (!timeBased && v.durationS)) onSetSaved();
              }}
            />
          ))}
          {isRehab && <SqueezeTest workoutId={workoutId} reflection={reflection} readOnly={readOnly} />}
        </div>
        )}
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full min-h-11 rounded-[10px] border border-line bg-card2 px-2.5 text-base text-white outline-none placeholder:text-[#808080] focus:border-white disabled:opacity-70";

function SetRow({
  n,
  timeBased,
  loadType,
  readOnly,
  initial,
  placeholder,
  onSave,
}: {
  n: number;
  timeBased: boolean;
  loadType: string;
  readOnly: boolean;
  initial?: {
    weight_kg: number | null;
    reps: number | null;
    duration_s: number | null;
    pain: number | null;
    band?: string | null;
  };
  placeholder: { reps: string; sec: string };
  onSave: (v: { weightKg: string; reps: string; durationS: string; pain: string; band: string }) => Promise<void>;
}) {
  const [v, setV] = useState({
    weightKg: initial?.weight_kg?.toString() ?? "",
    reps: initial?.reps?.toString() ?? "",
    durationS: initial?.duration_s?.toString() ?? "",
    pain: initial?.pain?.toString() ?? "",
    band: initial?.band ?? "",
  });
  const [saved, setSaved] = useState(JSON.stringify(v));
  const [error, setError] = useState(false);

  const commit = async () => {
    const s = JSON.stringify(v);
    if (s === saved) return;
    try {
      await onSave(v);
      setSaved(s);
      setError(false);
    } catch {
      setError(true);
    }
  };

  const field = (key: keyof typeof v, label: string, ph: string, mode: "decimal" | "numeric" | "text") => (
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
        onChange={(e) =>
          setV((o) => ({ ...o, [key]: mode === "text" ? e.target.value : e.target.value.replace(",", ".") }))
        }
        onBlur={commit}
        className={inputCls}
      />
    </label>
  );

  return (
    <div className={`grid items-center gap-2 ${timeBased ? "grid-cols-[36px_1fr_1fr]" : "grid-cols-[36px_1fr_1fr_1fr]"}`}>
      <div className={`text-sm ${error ? "text-pink" : "text-muted"}`}>{error ? "!" : n}</div>
      {timeBased ? (
        field("durationS", "Seconds", placeholder.sec || "sec", "numeric")
      ) : (
        <>
          {loadType === "band"
            ? field("band", "Band", "band", "text")
            : loadType === "stack"
              ? field("band", "Pin and gym", "e.g. 20", "text")
            : loadType === "bodyweight"
              ? field("weightKg", "Added kilograms", "BW", "decimal")
              : field("weightKg", "Kilograms", "kg", "decimal")}
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
  const { actions } = useData();
  const [effort, setEffort] = useState(reflection?.squeeze_effort?.toString() ?? "");
  const [pain, setPain] = useState(reflection?.squeeze_pain?.toString() ?? "");
  const commit = () => {
    if (effort || pain) actions.saveSqueeze(workoutId, effort, pain);
  };
  const cls =
    "min-h-11 rounded-[10px] border border-black/20 bg-white/40 px-2.5 text-base text-ink outline-none placeholder:text-black/50";
  return (
    <div className="mt-1 flex flex-col gap-2 rounded-xl bg-blue p-3 text-ink">
      <div className="text-[13px] font-semibold">Squeeze test · 3 s hard</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Effort 0–10
          <input inputMode="numeric" value={effort} disabled={readOnly} onChange={(e) => setEffort(e.target.value)} onBlur={commit} placeholder="e.g. 8" className={cls} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Pain 0–10
          <input inputMode="numeric" value={pain} disabled={readOnly} onChange={(e) => setPain(e.target.value)} onBlur={commit} placeholder="e.g. 2" className={cls} />
        </label>
      </div>
    </div>
  );
}
