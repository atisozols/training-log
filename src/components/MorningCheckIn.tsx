"use client";

import { useState, useTransition } from "react";
import { saveMorning } from "@/app/actions";
import { MoonIcon } from "./Icons";

export function MorningCheckIn({ workoutId, title }: { workoutId: string; title: string }) {
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<number | null>(null);
  return (
    <section className="flex flex-col gap-3 rounded-[22px] border border-line bg-card p-4">
      <div className="flex items-center gap-3">
        <MoonIcon className="text-blue" />
        <div className="flex flex-col">
          <h2 className="text-[15px] font-semibold">Morning check-in</h2>
          <p className="text-xs text-muted">Groin pain this morning, after {title}</p>
        </div>
      </div>
      <div className="grid grid-cols-6 gap-1.5">
        {Array.from({ length: 11 }, (_, v) => (
          <button
            key={v}
            type="button"
            disabled={pending}
            aria-label={`Pain ${v}`}
            onClick={() => {
              setPicked(v);
              start(() => saveMorning(workoutId, v));
            }}
            className={`min-h-11 rounded-xl border text-[15px] font-semibold ${
              picked === v ? "border-white bg-white text-ink" : "border-line bg-card2 text-white"
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </section>
  );
}
