import { notFound } from "next/navigation";
import { getWorkout } from "@/lib/data";
import { SessionClient } from "./SessionClient";

export const dynamic = "force-dynamic";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWorkout(id);
  if (!data) notFound();
  return <SessionClient {...data} />;
}
