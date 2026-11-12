"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Reflection, Workout } from "@/lib/types";
import { useData } from "@/components/DataProvider";
import { BackIcon, HeartIcon, MoonIcon, StarIcon } from "@/components/Icons";

const tone = (v: number) => (v <= 3 ? "#6BD66B" : v <= 5 ? "#EDE65B" : "#E57FB8");
const label = (v: number) => (v <= 3 ? "all good" : v <= 5 ? "hold progression" : "step back");

export function ReflectForm({
  workout,
  reflection,
  minutes,
  exerciseNames,
  prompt,
}: {
  workout: Workout;
  reflection: Reflection | null;
  minutes: number | null;
  exerciseNames: string[];
  prompt: string;
}) {
  const [pain, setPain] = useState<number>(reflection?.pain_during ?? 0);
  const [where, setWhere] = useState<string[]>(
    reflection?.pain_during_where ? reflection.pain_during_where.split(", ") : [],
  );
  const [energy, setEnergy] = useState<number>(reflection?.energy ?? 3);
  const [stars, setStars] = useState<number>(workout.rating ?? 0);
  const [fav, setFav] = useState<boolean>(workout.is_favorite);
  const [journal, setJournal] = useState<string>(reflection?.journal ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { actions } = useData();
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await actions.saveReflection(
        workout.id,
        {
          pain_during: pain,
          pain_during_where: where.length ? where.join(", ") : null,
          energy,
          journal_prompt: prompt,
          journal: journal.trim() || null,
        },
        { rating: stars || null, is_favorite: fav },
      );
      router.push("/history");
    } catch {
      setError("Couldn't save. Check your connection and try again.");
      setSaving(false);
    }
  };

  const uniqueNames = Array.from(new Set(exerciseNames.filter((n) => !/^bike/i.test(n))));
  const toggleWhere = (n: string) =>
    setWhere((w) => (w.includes(n) ? w.filter((x) => x !== n) : [...w.filter((x) => x !== "Nowhere"), n]));

  return (
    <main className="mx-auto max-w-md px-5 pb-safe pt-safe">
      <form onSubmit={onSubmit} className="flex flex-col gap-3.5 pb-8">
        <div className="flex items-center justify-between pt-2">
          <Link
            href={`/session/${workout.id}`}
            aria-label="Back to session"
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card"
          >
            <BackIcon size={20} />
          </Link>
          <button
            type="button"
            onClick={() => setFav((f) => !f)}
            aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={fav}
            className={`flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-card ${fav ? "text-pink" : "text-white"}`}
          >
            <HeartIcon filled={fav} />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="text-[13px] text-muted">
            {workout.title.split("—")[0].trim()} done{minutes ? ` · ${minutes} min` : ""}
          </div>
          <h1 className="font-display text-[28px] font-bold">How did it feel?</h1>
        </div>

        <section className="flex flex-col gap-2.5 rounded-[22px] border border-line bg-card p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">Groin pain during</h2>
            <div className="text-[13px] font-semibold" style={{ color: tone(pain) }}>
              {pain}/10 · {label(pain)}
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 11 }, (_, v) => (
              <button
                key={v}
                type="button"
                aria-label={`Pain ${v}`}
                aria-pressed={pain === v}
                onClick={() => setPain(v)}
                className="min-h-11 rounded-xl border text-[15px] font-semibold"
                style={
                  pain === v
                    ? { background: tone(v), borderColor: tone(v), color: "#000" }
                    : { background: "#1c1c1c", borderColor: "#2e2e2e", color: "#fff" }
                }
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">0–3 fine · 4–5 hold progression · 6+ step back</p>
        </section>

        <section className="flex flex-col gap-2.5 rounded-[22px] border border-line bg-card p-4">
          <h2 className="text-[15px] font-semibold">Where did you feel it?</h2>
          <div className="flex flex-wrap gap-1.5">
            {[...uniqueNames, "Nowhere"].map((n) => {
              const on = where.includes(n);
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={on}
                  onClick={() => (n === "Nowhere" ? setWhere(on ? [] : ["Nowhere"]) : toggleWhere(n))}
                  className={`min-h-10 rounded-full border px-3 text-[13px] ${
                    on ? "border-white bg-white text-ink" : "border-line bg-card2 text-white"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <section className="flex flex-col gap-1 rounded-[22px] bg-blue p-4 text-ink">
            <div className="text-[13px] font-semibold">Squeeze test</div>
            <div className="font-display text-2xl font-bold">
              {reflection?.squeeze_effort != null
                ? `${reflection.squeeze_effort} / ${reflection.squeeze_pain ?? "–"}`
                : "—"}
            </div>
            <div className="text-xs">effort / pain</div>
          </section>
          <section className="flex flex-col gap-2 rounded-[22px] border border-line bg-card p-4">
            <div className="text-xs text-muted">Energy</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-label={`Energy ${v}`}
                  onClick={() => setEnergy(v)}
                  className={`min-h-10 flex-1 rounded-[10px] ${v <= energy ? "bg-blue" : "bg-line"}`}
                />
              ))}
            </div>
            <div className="text-xs text-muted">{energy} of 5</div>
          </section>
        </div>

        <section className="flex items-center justify-between rounded-[22px] border border-line bg-card p-4">
          <h2 className="text-[15px] font-semibold">Rate this workout</h2>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((v) => (
              <button
                key={v}
                type="button"
                aria-label={`${v} stars`}
                onClick={() => setStars(v === stars ? 0 : v)}
                className={`flex h-11 w-9 items-center justify-center ${v <= stars ? "text-yellow" : "text-[#5c5c5c]"}`}
              >
                <StarIcon filled={v <= stars} />
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2.5 rounded-[22px] border border-line bg-card p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-pink">Journal</div>
          <label htmlFor="journal" className="text-[15px] font-medium leading-snug">
            {prompt}
          </label>
          <textarea
            id="journal"
            rows={4}
            value={journal}
            onChange={(e) => setJournal(e.target.value)}
            placeholder="A few honest lines…"
            className="w-full resize-y rounded-xl border border-line bg-card2 px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-[#808080] focus:border-white"
          />
        </section>

        <div className="flex items-center gap-2.5 px-1 text-[13px] text-muted">
          <MoonIcon size={18} className="text-blue" />
          <span>Tomorrow morning, log your next-morning pain on Today.</span>
        </div>

        {error && <p className="rounded-2xl bg-pink px-4 py-3 text-sm font-medium text-ink">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="min-h-13 rounded-full bg-white py-3.5 text-base font-semibold text-ink disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save reflection"}
        </button>
      </form>
    </main>
  );
}
