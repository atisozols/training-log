"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";
import type { Exercise, Phase, Program, Reflection, SetLog, Workout, WorkoutExercise } from "@/lib/types";

export type WorkoutFull = Workout & { items: WorkoutExercise[]; reflection: Reflection | null };

type Store = {
  email: string | null;
  owner: boolean;
  programs: Program[];
  phases: Phase[];
  workouts: WorkoutFull[];
  exercises: Exercise[];
};

const EMPTY: Store = { email: null, owner: true, programs: [], phases: [], workouts: [], exercises: [] };
const CACHE_KEY = "training-log:store:v1";

type Ctx = Store & {
  ready: boolean;
  refresh: () => Promise<void>;
  activeProgram: Program | null;
  activePhases: Phase[];
  currentPhase: Phase | null;
  nextWorkout: WorkoutFull | null;
  done: WorkoutFull[];
  getWorkout: (id: string) => WorkoutFull | undefined;
  actions: {
    startWorkout: (id: string) => void;
    cancelStart: (id: string) => void;
    setExerciseDone: (workoutId: string, itemId: string, done: boolean) => void;
    saveSet: (
      workoutId: string,
      itemId: string,
      setNumber: number,
      v: { weightKg?: string; reps?: string; durationS?: string; pain?: string },
    ) => Promise<void>;
    saveSqueeze: (workoutId: string, effort: string, pain: string) => void;
    finishWorkout: (id: string) => Promise<void>;
    saveReflection: (
      workoutId: string,
      r: Partial<Reflection>,
      w: { rating: number | null; is_favorite: boolean },
    ) => Promise<void>;
    saveMorning: (workoutId: string, pain: number) => void;
    toggleFavorite: (workoutId: string) => void;
    signOut: () => Promise<void>;
  };
};

const DataCtx = createContext<Ctx | null>(null);

export function useData() {
  const c = useContext(DataCtx);
  if (!c) throw new Error("useData outside DataProvider");
  return c;
}

const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
const clamp010 = (v: number | null) => (v === null ? null : Math.max(0, Math.min(10, Math.round(v))));

function normalize(rows: any[]): WorkoutFull[] {
  return rows.map((w) => {
    const { workout_exercises, reflections, ...rest } = w;
    const reflection = (Array.isArray(reflections) ? reflections[0] : reflections) ?? null;
    const items = ((workout_exercises ?? []) as WorkoutExercise[])
      .map((it) => ({ ...it, set_logs: [...(it.set_logs ?? [])].sort((a, b) => a.set_number - b.set_number) }))
      .sort((a, b) => a.position - b.position);
    return { ...rest, items, reflection } as WorkoutFull;
  });
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<Store>(EMPTY);
  const [ready, setReady] = useState(false);
  const loading = useRef(false);
  const storeRef = useRef(store);
  storeRef.current = store;
  const supabase = getSupabase();

  // Instant start from the last cached snapshot
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        setStore(JSON.parse(raw));
        setReady(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(store));
    } catch {}
  }, [store, ready]);

  const refresh = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try {
      const [{ data: sess }, owner, programs, phases, workouts, exercises] = await Promise.all([
        supabase.auth.getSession(),
        supabase.rpc("is_owner"),
        supabase.from("programs").select("*").order("start_date"),
        supabase.from("phases").select("*").order("position"),
        supabase
          .from("workouts")
          .select("*, reflections(*), workout_exercises(*, exercise:exercises(*), set_logs(*))")
          .order("session_number"),
        supabase.from("exercises").select("*").order("name"),
      ]);
      if (workouts.error) throw workouts.error;
      setStore({
        email: sess.session?.user.email ?? null,
        owner: owner.data === true,
        programs: (programs.data ?? []) as Program[],
        phases: (phases.data ?? []) as Phase[],
        workouts: normalize(workouts.data ?? []),
        exercises: (exercises.data ?? []) as Exercise[],
      });
      setReady(true);
    } catch (e) {
      console.error("refresh failed", e);
      setReady(true);
    } finally {
      loading.current = false;
    }
  }, [supabase]);

  useEffect(() => {
    refresh();
    const onVis = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [refresh]);

  // ---- local state helpers
  const patchWorkout = useCallback((id: string, fn: (w: WorkoutFull) => WorkoutFull) => {
    setStore((s) => ({ ...s, workouts: s.workouts.map((w) => (w.id === id ? fn(w) : w)) }));
  }, []);
  const patchReflection = useCallback(
    (workoutId: string, patch: Partial<Reflection>) =>
      patchWorkout(workoutId, (w) => ({
        ...w,
        reflection: {
          ...(w.reflection ?? ({ id: "local", workout_id: workoutId, created_at: new Date().toISOString() } as Reflection)),
          ...patch,
        } as Reflection,
      })),
    [patchWorkout],
  );

  const actions = useMemo<Ctx["actions"]>(
    () => ({
      startWorkout(id) {
        const now = new Date().toISOString();
        patchWorkout(id, (w) => (w.started_at ? w : { ...w, started_at: now }));
        supabase.from("workouts").update({ started_at: now }).eq("id", id).is("started_at", null).then();
      },
      cancelStart(id) {
        patchWorkout(id, (w) => ({ ...w, started_at: null }));
        supabase.from("workouts").update({ started_at: null }).eq("id", id).eq("status", "planned").then();
      },
      setExerciseDone(workoutId, itemId, done) {
        const at = done ? new Date().toISOString() : null;
        patchWorkout(workoutId, (w) => ({
          ...w,
          items: w.items.map((i) => (i.id === itemId ? { ...i, completed_at: at } : i)),
        }));
        supabase.from("workout_exercises").update({ completed_at: at }).eq("id", itemId).then();
      },
      async saveSet(workoutId, itemId, setNumber, v) {
        const row = {
          workout_exercise_id: itemId,
          set_number: setNumber,
          weight_kg: num(v.weightKg),
          reps: num(v.reps),
          duration_s: num(v.durationS),
          pain: clamp010(num(v.pain)),
          logged_at: new Date().toISOString(),
        };
        const empty = row.weight_kg === null && row.reps === null && row.duration_s === null && row.pain === null;
        patchWorkout(workoutId, (w) => ({
          ...w,
          items: w.items.map((i) => {
            if (i.id !== itemId) return i;
            const others = i.set_logs.filter((s) => s.set_number !== setNumber);
            const logs = empty ? others : [...others, { id: `local-${setNumber}`, ...row } as SetLog];
            return { ...i, set_logs: logs.sort((a, b) => a.set_number - b.set_number) };
          }),
        }));
        const res = empty
          ? await supabase.from("set_logs").delete().eq("workout_exercise_id", itemId).eq("set_number", setNumber)
          : await supabase.from("set_logs").upsert(row, { onConflict: "workout_exercise_id,set_number" });
        if (res.error) throw res.error;
      },
      saveSqueeze(workoutId, effort, pain) {
        const patch = { squeeze_effort: clamp010(num(effort)), squeeze_pain: clamp010(num(pain)) };
        patchReflection(workoutId, patch);
        supabase
          .from("reflections")
          .upsert({ workout_id: workoutId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "workout_id" })
          .then();
      },
      async finishWorkout(id) {
        const now = new Date().toISOString();
        patchWorkout(id, (w) => ({ ...w, status: "done", completed_at: now }));
        await supabase.from("workouts").update({ status: "done", completed_at: now }).eq("id", id);
      },
      async saveReflection(workoutId, r, w) {
        const patch = {
          pain_during: r.pain_during ?? null,
          pain_during_where: r.pain_during_where ?? null,
          energy: r.energy ?? null,
          journal_prompt: r.journal_prompt ?? null,
          journal: r.journal ?? null,
        };
        patchReflection(workoutId, patch);
        patchWorkout(workoutId, (x) => ({ ...x, rating: w.rating, is_favorite: w.is_favorite }));
        const [a, b] = await Promise.all([
          supabase
            .from("reflections")
            .upsert({ workout_id: workoutId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "workout_id" }),
          supabase.from("workouts").update({ rating: w.rating, is_favorite: w.is_favorite }).eq("id", workoutId),
        ]);
        if (a.error) throw a.error;
        if (b.error) throw b.error;
      },
      saveMorning(workoutId, pain) {
        patchReflection(workoutId, { pain_next_morning: clamp010(pain) });
        supabase
          .from("reflections")
          .upsert(
            { workout_id: workoutId, pain_next_morning: clamp010(pain), updated_at: new Date().toISOString() },
            { onConflict: "workout_id" },
          )
          .then();
      },
      toggleFavorite(workoutId) {
        const next = !storeRef.current.workouts.find((w) => w.id === workoutId)?.is_favorite;
        patchWorkout(workoutId, (w) => ({ ...w, is_favorite: next }));
        supabase.from("workouts").update({ is_favorite: next }).eq("id", workoutId).then();
      },
      async signOut() {
        try {
          localStorage.removeItem(CACHE_KEY);
        } catch {}
        await supabase.auth.signOut();
        window.location.href = "/login";
      },
    }),
    [patchReflection, patchWorkout, supabase],
  );

  const value = useMemo<Ctx>(() => {
    const activeProgram =
      [...store.programs].reverse().find((p) => p.status === "active") ?? null;
    const activePhases = activeProgram ? store.phases.filter((p) => p.program_id === activeProgram.id) : [];
    const currentPhase =
      [...activePhases].reverse().find((p) => p.started_on && !p.completed_on) ??
      activePhases.find((p) => !p.completed_on) ??
      null;
    const nextWorkout = store.workouts.find((w) => w.status === "planned") ?? null;
    const done = store.workouts
      .filter((w) => w.status === "done")
      .sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""));
    return {
      ...store,
      ready,
      refresh,
      activeProgram,
      activePhases,
      currentPhase,
      nextWorkout,
      done,
      getWorkout: (id) => store.workouts.find((w) => w.id === id),
      actions,
    };
  }, [store, ready, refresh, actions]);

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function Loading() {
  return (
    <div className="flex flex-col gap-3.5 pt-8" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-40 animate-pulse rounded-xl bg-card" />
      <div className="h-28 animate-pulse rounded-3xl bg-card" />
      <div className="h-56 animate-pulse rounded-3xl bg-card" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="h-28 animate-pulse rounded-[22px] bg-card" />
        <div className="h-28 animate-pulse rounded-[22px] bg-card" />
      </div>
    </div>
  );
}
