"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Loading, useData } from "@/components/DataProvider";
import { SessionClient } from "./SessionClient";

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const { ready, getWorkout, phases } = useData();
  const workout = getWorkout(id);

  if (!workout) {
    return (
      <main className="mx-auto max-w-md px-5 pt-safe">
        {!ready ? (
          <Loading />
        ) : (
          <div className="flex flex-col gap-3 pt-10">
            <h1 className="font-display text-2xl font-bold">Session not found</h1>
            <Link href="/" className="text-muted underline">
              Back to Today
            </Link>
          </div>
        )}
      </main>
    );
  }
  const phase = phases.find((p) => p.id === workout.phase_id) ?? null;
  return <SessionClient key={workout.id} workout={workout} phase={phase} />;
}
