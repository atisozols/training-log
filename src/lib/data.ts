import { createClient } from "./supabase/server";
import type { Phase, Program, Reflection, Workout, WorkoutExercise } from "./types";
import type { DoneWorkout } from "./game";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function isOwner() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_owner");
  return data === true;
}

export async function getActiveProgram() {
  const supabase = await createClient();
  const { data: program } = await supabase
    .from("programs")
    .select("*")
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle<Program>();
  if (!program) return { program: null, phases: [] as Phase[], currentPhase: null as Phase | null };
  const { data: phases } = await supabase
    .from("phases")
    .select("*")
    .eq("program_id", program.id)
    .order("position");
  const list = (phases ?? []) as Phase[];
  const currentPhase =
    [...list].reverse().find((p) => p.started_on && !p.completed_on) ?? list.find((p) => !p.completed_on) ?? null;
  return { program, phases: list, currentPhase };
}

export async function getNextWorkout() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*, workout_exercises(block)")
    .eq("status", "planned")
    .order("session_number", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data as (Workout & { workout_exercises: { block: string }[] }) | null;
}

export async function getDoneWorkouts(): Promise<DoneWorkout[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("workouts")
    .select("*, reflections(*), workout_exercises(exercise:exercises(name))")
    .eq("status", "done")
    .order("completed_at", { ascending: false });
  return (data ?? []).map((w: any) => ({
    ...w,
    reflection: (Array.isArray(w.reflections) ? w.reflections[0] : w.reflections) ?? null,
    exerciseNames: (w.workout_exercises ?? []).map((we: any) => we.exercise?.name).filter(Boolean),
  }));
}

export async function getWorkout(id: string) {
  const supabase = await createClient();
  const { data: workout } = await supabase.from("workouts").select("*").eq("id", id).maybeSingle<Workout>();
  if (!workout) return null;
  const { data: items } = await supabase
    .from("workout_exercises")
    .select("*, exercise:exercises(*), set_logs(*)")
    .eq("workout_id", id)
    .order("position");
  const { data: reflection } = await supabase
    .from("reflections")
    .select("*")
    .eq("workout_id", id)
    .maybeSingle<Reflection>();
  let phase: Phase | null = null;
  if (workout.phase_id) {
    const { data } = await supabase.from("phases").select("*").eq("id", workout.phase_id).maybeSingle<Phase>();
    phase = data;
  }
  return {
    workout,
    phase,
    reflection,
    items: ((items ?? []) as WorkoutExercise[]).map((it) => ({
      ...it,
      set_logs: [...(it.set_logs ?? [])].sort((a, b) => a.set_number - b.set_number),
    })),
  };
}
