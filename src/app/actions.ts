"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const clamp010 = (v: number | null) => (v === null ? null : Math.max(0, Math.min(10, Math.round(v))));

export async function startWorkout(workoutId: string) {
  const supabase = await createClient();
  await supabase.from("workouts").update({ started_at: new Date().toISOString() }).eq("id", workoutId).is("started_at", null);
  revalidatePath("/");
}

export async function setExerciseDone(workoutExerciseId: string, done: boolean) {
  const supabase = await createClient();
  await supabase
    .from("workout_exercises")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", workoutExerciseId);
}

export async function saveSet(input: {
  workoutExerciseId: string;
  setNumber: number;
  weightKg?: number | string | null;
  reps?: number | string | null;
  durationS?: number | string | null;
  pain?: number | string | null;
}) {
  const supabase = await createClient();
  const row = {
    workout_exercise_id: input.workoutExerciseId,
    set_number: input.setNumber,
    weight_kg: num(input.weightKg),
    reps: num(input.reps),
    duration_s: num(input.durationS),
    pain: clamp010(num(input.pain)),
    logged_at: new Date().toISOString(),
  };
  const empty = row.weight_kg === null && row.reps === null && row.duration_s === null && row.pain === null;
  if (empty) {
    await supabase
      .from("set_logs")
      .delete()
      .eq("workout_exercise_id", input.workoutExerciseId)
      .eq("set_number", input.setNumber);
    return;
  }
  const { error } = await supabase.from("set_logs").upsert(row, { onConflict: "workout_exercise_id,set_number" });
  if (error) throw new Error(error.message);
}

export async function saveSqueeze(workoutId: string, effort: string | number | null, pain: string | number | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("reflections").upsert(
    { workout_id: workoutId, squeeze_effort: clamp010(num(effort)), squeeze_pain: clamp010(num(pain)), updated_at: new Date().toISOString() },
    { onConflict: "workout_id" },
  );
  if (error) throw new Error(error.message);
}

export async function finishWorkout(workoutId: string) {
  const supabase = await createClient();
  await supabase
    .from("workouts")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", workoutId);
  revalidatePath("/");
  revalidatePath("/history");
  redirect(`/session/${workoutId}/reflect`);
}

export async function saveReflection(formData: FormData) {
  const supabase = await createClient();
  const workoutId = String(formData.get("workout_id"));
  const where = formData.getAll("where").map(String).filter(Boolean);
  const rating = num(formData.get("rating"));
  const favorite = formData.get("favorite") === "on" || formData.get("favorite") === "true";

  const { error } = await supabase.from("reflections").upsert(
    {
      workout_id: workoutId,
      pain_during: clamp010(num(formData.get("pain_during"))),
      pain_during_where: where.length ? where.join(", ") : null,
      energy: num(formData.get("energy")),
      journal_prompt: String(formData.get("journal_prompt") ?? "") || null,
      journal: String(formData.get("journal") ?? "").trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workout_id" },
  );
  if (error) throw new Error(error.message);

  await supabase
    .from("workouts")
    .update({ rating: rating && rating >= 1 && rating <= 5 ? rating : null, is_favorite: favorite })
    .eq("id", workoutId);

  revalidatePath("/");
  revalidatePath("/history");
  redirect("/history?saved=1");
}

export async function saveMorning(workoutId: string, pain: number) {
  const supabase = await createClient();
  await supabase
    .from("reflections")
    .upsert(
      { workout_id: workoutId, pain_next_morning: clamp010(pain), updated_at: new Date().toISOString() },
      { onConflict: "workout_id" },
    );
  revalidatePath("/");
  revalidatePath("/history");
}

export async function toggleFavorite(workoutId: string, value: boolean) {
  const supabase = await createClient();
  await supabase.from("workouts").update({ is_favorite: value }).eq("id", workoutId);
  revalidatePath("/history");
}
