"use client";

import Link from "next/link";
import { useState } from "react";
import { Loading, useData } from "@/components/DataProvider";
import { computeXp, daysBetween, weekStreak } from "@/lib/game";
import { AlertIcon, FlameIcon, MoonIcon, PlayIcon } from "@/components/Icons";

const BLOCK_LABEL: Record<string, string> = {
  warmup: "Warm-up",
  rehab: "Rehab",
  strength: "Strength",
  upper: "Upper",
  conditioning: "Conditioning",
  cooldown: "Cool-down",
};
const BLOCK_ORDER = ["warmup", "rehab", "strength", "upper", "conditioning", "cooldown"];

export default function TodayPage() {
  const { ready, owner, email, activeProgram: program, activePhases: phases, currentPhase, nextWorkout: next, done, actions } =
    useData();

  if (!ready) return <Loading />;
  if (!owner) {
    return (
      <div className="flex min-h-[70dvh] flex-col justify-center gap-3">
        <h1 className="font-display text-3xl font-bold">Almost there</h1>
        <p className="text-muted">Signed in as {email}. This account isn&apos;t activated yet.</p>
      </div>
    );
  }

  const now = new Date();
  const { xp, level, pct } = computeXp(done);
  const streak = weekStreak(done, now);
  const latestSqueeze = done.find((w) => w.reflection?.squeeze_effort != null)?.reflection ?? null;
  const pendingMorning = done.find(
    (w) =>
      w.completed_at &&
      w.reflection?.pain_next_morning == null &&
      new Date(w.completed_at).toDateString() !== now.toDateString(),
  );
  const daysLeft = program?.target_date ? Math.max(0, daysBetween(now, new Date(program.target_date))) : null;
  const blockCounts = next
    ? BLOCK_ORDER.map((b) => ({ b, n: next.items.filter((x) => x.block === b).length })).filter((x) => x.n)
    : [];
  const [titleMain, ...titleRest] = (next?.title ?? "").split("—");
  const dateLabel = now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-3.5">
      <header className="flex flex-col gap-1 pt-4">
        <div className="text-[13px] uppercase tracking-wider text-muted">{dateLabel}</div>
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[32px] font-bold">Today</h1>
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-card px-3 py-1.5 text-[13px] text-muted">
            <FlameIcon size={16} className="text-pink" />
            {streak}-week streak
          </div>
        </div>
      </header>

      {program && (
        <section className="flex flex-col gap-3 rounded-3xl bg-pink p-[18px] text-ink">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-medium">{program.name}</div>
            {daysLeft !== null && (
              <div className="shrink-0 text-[13px] font-bold">
                {daysLeft} days to{" "}
                {new Date(program.target_date!).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </div>
            )}
          </div>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${phases.length || 1}, minmax(0, 1fr))` }}>
            {phases.map((p) => (
              <div
                key={p.id}
                className={`h-2 rounded ${p.completed_on ? "bg-ink" : currentPhase?.id === p.id ? "bg-ink/60" : "bg-black/20"}`}
              />
            ))}
          </div>
          <div className="grid gap-1.5 text-xs text-black/70" style={{ gridTemplateColumns: `repeat(${phases.length || 1}, minmax(0, 1fr))` }}>
            {phases.map((p) => (
              <div key={p.id} className={currentPhase?.id === p.id ? "font-semibold text-ink" : ""}>
                {p.position} · {p.name.split(" ")[0]}
              </div>
            ))}
          </div>
        </section>
      )}

      {next ? (
        <section className="flex flex-col gap-3.5 rounded-3xl bg-yellow p-5 text-ink">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold uppercase tracking-wider">{next.started_at ? "In progress" : "Next up"}</div>
            {next.est_duration_min && <div className="text-[13px] font-medium">~{next.est_duration_min} min</div>}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="font-display text-[28px] font-bold leading-tight">{titleMain.trim()}</div>
            {titleRest.length > 0 && <div className="text-base font-medium">{titleRest.join("—").trim()}</div>}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {blockCounts.map(({ b, n }) => (
              <span key={b} className="rounded-full bg-black/10 px-2.5 py-1 text-xs font-medium">
                {BLOCK_LABEL[b] ?? b} · {n}
              </span>
            ))}
          </div>
          {next.rules && (
            <div className="flex items-start gap-2 text-[13px] font-medium">
              <AlertIcon size={16} className="mt-0.5 shrink-0" />
              <span>{next.rules}</span>
            </div>
          )}
          <Link
            href={`/session/${next.id}`}
            className="flex min-h-13 items-center justify-center gap-2 rounded-full bg-ink py-3.5 text-base font-semibold text-white"
          >
            <PlayIcon size={18} />
            {next.started_at ? "Continue session" : "Start session"}
          </Link>
        </section>
      ) : (
        <section className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-display text-xl font-semibold">No session planned</h2>
          <p className="mt-1 text-sm text-muted">Reflect on your last one and ask Claude for the next.</p>
        </section>
      )}

      {pendingMorning && (
        <MorningCheckIn
          key={pendingMorning.id}
          title={pendingMorning.title.split("—")[0].trim()}
          onPick={(v) => actions.saveMorning(pendingMorning.id, v)}
        />
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <section className="flex flex-col gap-1.5 rounded-[22px] bg-blue p-4 text-ink">
          <div className="text-[13px] font-semibold">Squeeze test</div>
          <div className="font-display text-2xl font-bold">
            {latestSqueeze ? `${latestSqueeze.squeeze_effort} / ${latestSqueeze.squeeze_pain ?? "–"}` : "—"}
          </div>
          <div className="text-xs">{latestSqueeze ? "effort / pain · latest" : "Baseline set after session 1"}</div>
        </section>
        <section className="flex flex-col gap-1.5 rounded-[22px] bg-green p-4 text-ink">
          <div className="text-[13px] font-semibold">Level {level}</div>
          <div className="font-display text-2xl font-bold">{xp} XP</div>
          <div className="h-1.5 overflow-hidden rounded bg-black/20">
            <div className="h-1.5 bg-ink" style={{ width: `${pct}%` }} />
          </div>
        </section>
      </div>
    </div>
  );
}

function MorningCheckIn({ title, onPick }: { title: string; onPick: (v: number) => void }) {
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
            aria-label={`Pain ${v}`}
            onClick={() => {
              setPicked(v);
              onPick(v);
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
