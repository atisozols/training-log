import { getActiveProgram, getUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";
import type { Program } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const user = await getUser();
  const { program, phases, currentPhase } = await getActiveProgram();
  const supabase = await createClient();
  const { data: planned } = await supabase.from("programs").select("*").eq("status", "planned").order("start_date");

  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex flex-col gap-1 pt-4">
        <div className="text-[13px] text-muted">{user?.email}</div>
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

      {phases.map((p) => (
        <section
          key={p.id}
          className={`flex flex-col gap-1.5 rounded-3xl p-4 ${
            currentPhase?.id === p.id ? "bg-white text-ink" : "border border-line bg-card"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">
              Phase {p.position} · {p.name}
            </h3>
            <span className="text-xs">
              {p.completed_on ? "Done" : currentPhase?.id === p.id ? "Current" : "Later"}
            </span>
          </div>
          {p.focus && <p className={`text-[13px] ${currentPhase?.id === p.id ? "" : "text-muted"}`}>{p.focus}</p>}
          {p.progression_criteria && (
            <p className={`text-[13px] ${currentPhase?.id === p.id ? "" : "text-muted"}`}>
              <span className="font-semibold">Move on when:</span> {p.progression_criteria}
            </p>
          )}
        </section>
      ))}

      {((planned ?? []) as Program[]).map((p) => (
        <section key={p.id} className="flex flex-col gap-1 rounded-3xl border border-dashed border-line p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue">Up next</div>
          <h3 className="font-semibold">{p.name}</h3>
          {p.goal && <p className="text-[13px] text-muted">{p.goal}</p>}
        </section>
      ))}

      <form action={signOut}>
        <button className="mt-2 min-h-12 w-full rounded-full border border-line py-3 text-sm font-medium">Sign out</button>
      </form>
    </div>
  );
}
