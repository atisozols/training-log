"use client";

import { useParams } from "next/navigation";
import { Loading, useData } from "@/components/DataProvider";
import { ReflectForm } from "./ReflectForm";

const DEFAULT_PROMPT = "How is it sitting with you to be off football right now?";

export default function ReflectPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, getWorkout } = useData();
  const workout = getWorkout(id);
  if (!workout) {
    return (
      <main className="mx-auto max-w-md px-5 pt-safe">
        {ready ? <p className="pt-10 text-muted">Session not found.</p> : <Loading />}
      </main>
    );
  }
  const minutes =
    workout.started_at && workout.completed_at
      ? Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 60000)
      : null;
  return (
    <ReflectForm
      key={workout.id}
      workout={workout}
      reflection={workout.reflection}
      minutes={minutes}
      exerciseNames={workout.items.map((i) => i.exercise.name)}
      prompt={workout.reflection?.journal_prompt ?? DEFAULT_PROMPT}
    />
  );
}
