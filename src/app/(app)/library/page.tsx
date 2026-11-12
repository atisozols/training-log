import { createClient } from "@/lib/supabase/server";
import type { Exercise } from "@/lib/types";

export const dynamic = "force-dynamic";

const GROUPS = [
  { key: "allowed", title: "Allowed", cls: "bg-green" },
  { key: "progressing", title: "Progressing", cls: "bg-blue" },
  { key: "avoid", title: "Avoid for now", cls: "bg-pink" },
];

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("exercises").select("*").order("name");
  const all = (data ?? []) as Exercise[];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1 pt-4">
        <div className="text-[13px] uppercase tracking-wider text-muted">{all.length} exercises</div>
        <h1 className="font-display text-[32px] font-bold">Library</h1>
      </header>
      {GROUPS.map((g) => {
        const list = all.filter((e) => e.status === g.key);
        if (!list.length) return null;
        return (
          <section key={g.key} className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted">
              <span className={`h-2.5 w-2.5 rounded-[3px] ${g.cls}`} />
              {g.title} · {list.length}
            </h2>
            {list.map((e) => (
              <div key={e.id} className="flex flex-col gap-1 rounded-2xl border border-line bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-medium">{e.name}</span>
                  {e.category && <span className="shrink-0 text-xs text-muted">{e.category}</span>}
                </div>
                {e.cues && <p className="text-[13px] text-muted">{e.cues}</p>}
                {e.status_note && <p className="text-[13px] text-white/80">{e.status_note}</p>}
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
