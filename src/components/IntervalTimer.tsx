"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// ---------- sound + wake lock helpers
let audioCtx: AudioContext | null = null;
export function ensureAudio() {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (AC) audioCtx = new AC();
  }
  if (audioCtx?.state === "suspended") audioCtx.resume();
}
export function beep(freq = 880, ms = 140, vol = 0.3) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start(t);
  o.stop(t + ms / 1000 + 0.03);
}
function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {}
}

function useWakeLock(active: boolean) {
  const lock = useRef<any>(null);
  useEffect(() => {
    const nav = navigator as any;
    if (!active || !nav.wakeLock) return;
    let cancelled = false;
    const request = async () => {
      try {
        const l = await nav.wakeLock.request("screen");
        if (cancelled) l.release();
        else lock.current = l;
      } catch {}
    };
    request();
    const onVis = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      lock.current?.release?.();
      lock.current = null;
    };
  }, [active]);
}

// ---------- plan
type Step = { kind: "work" | "rest" | "switch"; seconds: number; set: number; side?: "Left" | "Right" };

function buildPlan(sets: number, work: number, rest: number, perSide: boolean): Step[] {
  const steps: Step[] = [];
  for (let s = 1; s <= sets; s++) {
    if (perSide) {
      steps.push({ kind: "work", seconds: work, set: s, side: "Left" });
      steps.push({ kind: "switch", seconds: 5, set: s });
      steps.push({ kind: "work", seconds: work, set: s, side: "Right" });
    } else {
      steps.push({ kind: "work", seconds: work, set: s });
    }
    if (s < sets && rest > 0) steps.push({ kind: "rest", seconds: rest, set: s });
  }
  return steps;
}

const fmt = (sec: number) => {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export function IntervalTimer({
  sets,
  work,
  rest,
  perSide,
  loggedSets,
  onSetDone,
  onAllDone,
}: {
  sets: number;
  work: number;
  rest: number;
  perSide: boolean;
  loggedSets: number;
  onSetDone: (set: number, seconds: number) => void;
  onAllDone: () => void;
}) {
  const plan = useMemo(() => buildPlan(sets, work, rest, perSide), [sets, work, rest, perSide]);
  const firstStep = useMemo(() => {
    // resume after already-logged sets
    const idx = plan.findIndex((s) => s.kind === "work" && s.set > loggedSets);
    return idx === -1 ? 0 : idx;
  }, [plan, loggedSets]);

  const [idx, setIdx] = useState(firstStep);
  const [status, setStatus] = useState<"idle" | "running" | "paused" | "finished">(
    loggedSets >= sets ? "finished" : "idle",
  );
  const [endAt, setEndAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(plan[firstStep]?.seconds ?? work);
  const lastBeep = useRef<number | null>(null);
  const workedInSet = useRef(0);

  useWakeLock(status === "running");

  const step = plan[idx];

  const advance = useCallback(
    (completed: boolean, elapsed: number) => {
      const cur = plan[idx];
      if (!cur) return;
      if (cur.kind === "work") {
        workedInSet.current = Math.max(workedInSet.current, completed ? cur.seconds : Math.round(elapsed));
        const setEnds = !perSide || cur.side === "Right";
        if (setEnds) {
          onSetDone(cur.set, workedInSet.current);
          workedInSet.current = 0;
        }
      }
      const nextIdx = idx + 1;
      if (nextIdx >= plan.length) {
        setStatus("finished");
        setEndAt(null);
        setRemaining(0);
        beep(1320, 500, 0.35);
        buzz([300, 120, 300]);
        onAllDone();
        return;
      }
      const nxt = plan[nextIdx];
      setIdx(nextIdx);
      setRemaining(nxt.seconds);
      setEndAt(Date.now() + nxt.seconds * 1000);
      lastBeep.current = null;
      beep(nxt.kind === "work" ? 1175 : 660, 380, 0.35);
      buzz(nxt.kind === "work" ? [250] : [120, 80, 120]);
    },
    [idx, plan, perSide, onSetDone, onAllDone],
  );

  useEffect(() => {
    if (status !== "running" || !endAt) return;
    const t = setInterval(() => {
      const left = (endAt - Date.now()) / 1000;
      setRemaining(left);
      const whole = Math.ceil(left);
      if (whole <= 3 && whole >= 1 && lastBeep.current !== whole) {
        lastBeep.current = whole;
        beep(880, 110, 0.25);
      }
      if (left <= 0) {
        clearInterval(t);
        advance(true, step.seconds);
      }
    }, 200);
    return () => clearInterval(t);
  }, [status, endAt, advance, step]);

  const start = () => {
    ensureAudio();
    beep(1175, 200, 0.3);
    setStatus("running");
    setEndAt(Date.now() + remaining * 1000);
    lastBeep.current = null;
  };
  const pause = () => {
    setStatus("paused");
    setEndAt(null);
  };
  const skip = () => {
    ensureAudio();
    const elapsed = step ? step.seconds - Math.max(0, remaining) : 0;
    if (status !== "running") setStatus("running");
    advance(false, elapsed);
  };
  const reset = () => {
    setIdx(0);
    setStatus("idle");
    setEndAt(null);
    setRemaining(plan[0]?.seconds ?? work);
    workedInSet.current = 0;
  };

  const label =
    status === "finished"
      ? "All sets done"
      : step?.kind === "rest"
        ? "Rest"
        : step?.kind === "switch"
          ? "Switch sides"
          : `Work${step?.side ? ` · ${step.side}` : ""}`;

  const total = step?.seconds ?? work;
  const pct = status === "finished" ? 100 : Math.min(100, Math.max(0, ((total - remaining) / total) * 100));
  const tone =
    status === "finished"
      ? "bg-green"
      : step?.kind === "work"
        ? "bg-yellow"
        : step?.kind === "switch"
          ? "bg-pink"
          : "bg-blue";

  return (
    <div className={`flex flex-col gap-3 rounded-xl p-3 text-ink ${tone}`}>
      <div className="flex items-center justify-between text-[13px] font-semibold">
        <span>{label}</span>
        <span>
          Set {Math.min(step?.set ?? sets, sets)}/{sets}
        </span>
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="font-display text-5xl font-bold tabular-nums leading-none" aria-live="polite">
          {status === "finished" ? "✓" : fmt(remaining)}
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: sets }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${
                i + 1 < (step?.set ?? sets + 1) || status === "finished" ? "bg-ink" : "bg-black/20"
              }`}
            />
          ))}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded bg-black/15">
        <div className="h-1.5 bg-ink" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex gap-2">
        {status === "running" ? (
          <button type="button" onClick={pause} className="min-h-11 flex-1 rounded-full bg-ink text-sm font-semibold text-white">
            Pause
          </button>
        ) : status === "finished" ? (
          <button type="button" onClick={reset} className="min-h-11 flex-1 rounded-full bg-ink text-sm font-semibold text-white">
            Run again
          </button>
        ) : (
          <button type="button" onClick={start} className="min-h-11 flex-1 rounded-full bg-ink text-sm font-semibold text-white">
            {status === "paused" ? "Resume" : idx > 0 ? "Continue" : "Start timer"}
          </button>
        )}
        {status !== "finished" && (
          <button type="button" onClick={skip} className="min-h-11 rounded-full border border-black/30 px-4 text-sm font-semibold">
            Skip
          </button>
        )}
      </div>
    </div>
  );
}
