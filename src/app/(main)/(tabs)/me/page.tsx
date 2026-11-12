"use client";

import { Loading, useData } from "@/components/DataProvider";

export default function MePage() {
  const { ready, email, activeProgram: program, activePhases: phases, currentPhase, programs, actions } = useData();
  if (!ready) return <Loading />;
  const planned = programs.filter((p) => p.status === "planned");

  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex flex-col gap-1 pt-4">
        <div className="text-[13px] text-muted">{email}</div>
        <h1 className="font-display text-[32px] font-bold">Me</h1>
      </header>

      {program && (
        <section className="flex flex-col gap-3 rounded-3xl bg-pink p-[18px] text-ink">
          <div className="text-xs font-semibold uppercase tracking-wider">Active plan</div>
          <h2 className="font-display text-xl font-bold">{program.name}</h2>
          {program.goal && <p className="text-sm">{program.goal}</p>}
        </section>
      )}

      {program?.principles && (
        <section className="flex flex-col gap-2 rounded-3xl border border-line bg-card p-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">Principles</h2>
          <p className="text-sm leading-relaxed">{program.principles}</p>
          {program.notes && <p className="text-sm leading-relaxed text-muted">{program.notes}</p>}
        </section>
      )}

      {phases.map((p) => {
        const cur = currentPhase?.id === p.id;
        return (
          <section
            key={p.id}
            className={`flex flex-col gap-1.5 rounded-3xl p-4 ${cur ? "bg-white text-ink" : "border border-line bg-card"}`}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">
                Phase {p.position} · {p.name}
              </h3>
              <span className="text-xs">{p.completed_on ? "Done" : cur ? "Current" : "Later"}</span>
            </div>
            {p.focus && <p className={`text-[13px] ${cur ? "" : "text-muted"}`}>{p.focus}</p>}
            {p.progression_criteria && (
              <p className={`text-[13px] ${cur ? "" : "text-muted"}`}>
                <span className="font-semibold">Move on when:</span> {p.progression_criteria}
              </p>
            )}
          </section>
        );
      })}

      {planned.map((p) => (
        <section key={p.id} className="flex flex-col gap-1 rounded-3xl border border-dashed border-line p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue">Up next</div>
          <h3 className="font-semibold">{p.name}</h3>
          {p.goal && <p className="text-[13px] text-muted">{p.goal}</p>}
        </section>
      ))}

      <button
        type="button"
        onClick={() => actions.signOut()}
        className="mt-2 min-h-12 w-full rounded-full border border-line py-3 text-sm font-medium"
      >
        Sign out
      </button>
    </div>
  );
}
