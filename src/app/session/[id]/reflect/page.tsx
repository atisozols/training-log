import { notFound } from "next/navigation";
import { getWorkout } from "@/lib/data";
import { ReflectForm } from "./ReflectForm";

export const dynamic = "force-dynamic";

const DEFAULT_PROMPT = "How is it sitting with you to be off football right now?";

export default async function ReflectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWorkout(id);
  if (!data) notFound();
  const { workout, reflection, items } = data;
  const minutes =
    workout.started_at && workout.completed_at
      ? Math.round((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 60000)
      : null;
  return (
    <ReflectForm
      workout={workout}
      reflection={reflection}
      minutes={minutes}
      exerciseNames={items.map((i) => i.exercise.name)}
      prompt={reflection?.journal_prompt ?? DEFAULT_PROMPT}
    />
  );
}
