"use client";

import { useOptimistic, useTransition } from "react";
import { toggleFavorite } from "@/app/actions";
import { HeartIcon } from "./Icons";

export function FavButton({ id, value, title }: { id: string; value: boolean; title: string }) {
  const [opt, setOpt] = useOptimistic(value);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-label={opt ? `Remove ${title} from favorites` : `Favorite ${title}`}
      aria-pressed={opt}
      onClick={() =>
        start(async () => {
          setOpt(!opt);
          await toggleFavorite(id, !opt);
        })
      }
      className={`flex h-11 w-11 shrink-0 items-center justify-center ${opt ? "text-pink" : "text-muted"}`}
    >
      <HeartIcon filled={opt} />
    </button>
  );
}
