"use client";

import Link from "next/link";
import { useState } from "react";
import { Loading, useData } from "@/components/DataProvider";
import { computeBadges, computeXp, painTone, weekStreak } from "@/lib/game";
import { CheckIcon, ChevronIcon, FlameIcon, HeartIcon, LockIcon } from "@/components/Icons";

const PHASE_COLOR: Record<number, string> = { 1: "bg-green", 2: "bg-blue", 3: "bg-pink" };
const WEEK = 7 * 86400000;

export default function HistoryPage() {
  const { ready, activeProgram: program, activePhases: phases, done, nextWorkout: next, actions } = useData();
  const [favOnly, setFavOnly] = useState(false);
  if (!ready) return <Loading />;

  const now = new Date();
  const { xp, level, into, pct } = computeXp(done);
  const streak = weekStreak(done, now);
  const phasePos = Object.fromEntries(phases.map((p) => [p.id, p.position]));
  const badges = computeBadges({
    done,
    streak,
    phase1Cleared: !!phases.find((p) => p.position === 1)?.completed_on,
    programCompleted: program?.status === "completed",
  });

  let weeks: { cls: string; current: boolean }[] = [];
  let weekIdx = 0;
  if (program?.start_date && program?.target_date) {
    const start = new Date(program.start_date).getTime();
    const end = new Date(program.target_date).getTime();
    const count = Math.max(1, Math.ceil((end - start) / WEEK));
    weekIdx = Math.floor((now.getTime() - start) / WEEK);
    weeks = Array.from({ length: count }, (_, i) => {
      const ws = start + i * WEEK;
      const inWeek = done.filter((w) => {
        const t = w.completed_at ? new Date(w.completed_at).getTime() : 0;
        return t >= ws && t < ws + WEEK;
      });
      const pos = inWeek.length ? Math.max(...inWeek.map((w) => phasePos[w.phase_id ?? ""] ?? 1)) : 0;
      return { cls: pos ? (PHASE_COLOR[pos] ?? "bg-green") : "bg-line", current: i === weekIdx };
    });
  }

  const chart = done.filter((w) => w.reflection?.pain_during != null).slice(0, 10).reverse();
  const list = favOnly ? done.filter((w) => w.is_favorite) : done;

  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex flex-col gap-1 pt-4">
        {weeks.length > 0 && (
          <div className="text-[13px] uppercase tracking-wider text-muted">
            Week {Math.min(weeks.length, weekIdx + 1)} of {weeks.length}
          </div>
        )}
        <h1 className="font-display text-[32px] font-bold">Big picture</h1>
      </header>

      {program && weeks.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4">
          <h2 className="text-[15px] font-semibold">
            Road to {new Date(program.target_date!).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}
          </h2>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((w, i) => (
              <div key={i} className={`h-7 rounded ${w.cls} ${w.current ? "outline-2 outline-offset-1 outline-white" : ""}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted">
            {phases.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-[3px] ${PHASE_COLOR[p.position] ?? "bg-green"}`} />
                {p.name}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-3xl bg-green p-4 text-ink">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <div className="font-display text-2xl font-bold">Level {level}</div>
            <div className="text-xs font-medium">
              {into} / 200 XP · {xp} total · {streak}-week streak
            </div>
          </div>
          <FlameIcon size={28} />
        </div>
        <div className="h-2 overflow-hidden rounded bg-black/20">
          <div className="h-2 bg-ink" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        {badges.map((b) => (
          <div
            key={b.key}
            title={b.hint}
            className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 text-center ${
              b.earned ? "bg-yellow text-ink" : "border border-line bg-card text-muted"
            }`}
          >
            {b.earned ? <CheckIcon size={20} /> : <LockIcon size={18} />}
            <div className="text-[11px] font-medium leading-tight">{b.name}</div>
          </div>
        ))}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-card p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-semibold">Groin pain per session</h2>
          <div className="text-xs text-muted">0–10</div>
        </div>
        {chart.length === 0 ? (
          <p className="text-sm text-muted">Shows up after your first reflection.</p>
        ) : (
          <>
            <div className="relative flex h-32 items-end gap-2 border-b border-line pb-1">
              <div className="absolute inset-x-0 border-t border-dashed border-[#5c5c5c]" style={{ bottom: `${0.3 * 120 + 4}px` }} />
              {chart.map((w) => (
                <div key={w.id} className="flex h-[120px] flex-1 items-end justify-center gap-0.5">
                  <div className="w-2.5 rounded-t-[3px] bg-yellow" style={{ height: `${Math.max(2, (w.reflection!.pain_during! / 10) * 120)}px` }} />
                  <div
                    className="w-2.5 rounded-t-[3px] bg-blue"
                    style={{
                      height: `${w.reflection!.pain_next_morning == null ? 0 : Math.max(2, (w.reflection!.pain_next_morning / 10) * 120)}px`,
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3.5 text-xs text-muted">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-yellow" />During</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px] bg-blue" />Next morning</span>
              <span className="flex items-center gap-1.5"><span className="w-3.5 border-t border-dashed border-muted" />3/10 limit</span>
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Workouts</h2>
          <div className="flex rounded-xl border border-line bg-card p-[3px]">
            {[false, true].map((f) => (
              <button
                key={String(f)}
                type="button"
                onClick={() => setFavOnly(f)}
                aria-pressed={favOnly === f}
                className={`min-h-9 rounded-[9px] px-3 text-[13px] font-medium ${favOnly === f ? "bg-white text-ink" : "text-muted"}`}
              >
                {f ? "Favorites" : "All"}
              </button>
            ))}
          </div>
        </div>

        {next && (
          <Link href={`/session/${next.id}`} className="flex items-center justify-between rounded-[22px] bg-yellow p-4 text-ink">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Next up</span>
              <span className="text-[15px] font-semibold">{next.title}</span>
            </div>
            <ChevronIcon size={20} />
          </Link>
        )}

        {list.length === 0 && (
          <p className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
            {favOnly ? "No favorites yet. Tap the heart on a workout you liked." : "No finished workouts yet."}
          </p>
        )}

        {list.map((w) => {
          const d = w.completed_at ? new Date(w.completed_at) : null;
          const r = w.reflection;
          const meta = [
            r?.squeeze_effort != null ? `Squeeze ${r.squeeze_effort}/${r.squeeze_pain ?? "–"}` : null,
            w.started_at && w.completed_at
              ? `${Math.round((new Date(w.completed_at).getTime() - new Date(w.started_at).getTime()) / 60000)} min`
              : null,
            w.rating ? "★".repeat(w.rating) : null,
          ]
            .filter(Boolean)
            .join(" · ");
          return (
            <div key={w.id} className="flex items-center gap-3 rounded-2xl border border-line bg-card py-2.5 pl-3.5 pr-1.5">
              <Link href={`/session/${w.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex min-w-[38px] flex-col items-center">
                  <span className="font-display text-lg font-semibold">{d?.getDate() ?? "–"}</span>
                  <span className="text-[11px] uppercase text-muted">{d?.toLocaleDateString("en-GB", { month: "short" }) ?? ""}</span>
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-medium">{w.title}</span>
                  <span className="truncate text-xs text-muted">{meta || "No reflection yet"}</span>
                </div>
              </Link>
              <span className={`rounded-full px-2 py-1 text-xs font-semibold ${painTone(r?.pain_during)}`}>
                {r?.pain_during ?? "–"}/10
              </span>
              <button
                type="button"
                onClick={() => actions.toggleFavorite(w.id)}
                aria-label={w.is_favorite ? `Remove ${w.title} from favorites` : `Favorite ${w.title}`}
                aria-pressed={w.is_favorite}
                className={`flex h-11 w-11 shrink-0 items-center justify-center ${w.is_favorite ? "text-pink" : "text-muted"}`}
              >
                <HeartIcon filled={w.is_favorite} />
              </button>
            </div>
          );
        })}
      </section>
    </div>
  );
}
