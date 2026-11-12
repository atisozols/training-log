import { signIn, signUp } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-end gap-8 px-5 pb-safe pt-safe">
      <div className="flex flex-col gap-3">
        <div className="text-sm uppercase tracking-wider text-muted">Copenhagen</div>
        <h1 className="font-display text-4xl font-bold uppercase leading-[1.05]">
          Train smart.
          <br />
          Heal properly.
        </h1>
      </div>

      <form className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-h-12 rounded-2xl border border-line bg-card px-4 text-base text-white outline-none focus:border-white"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-muted">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="min-h-12 rounded-2xl border border-line bg-card px-4 text-base text-white outline-none focus:border-white"
          />
        </label>

        {error && <p className="rounded-2xl bg-pink px-4 py-3 text-sm font-medium text-ink">{error}</p>}
        {created && (
          <p className="rounded-2xl bg-green px-4 py-3 text-sm font-medium text-ink">
            Account created. It needs to be activated before you can sign in.
          </p>
        )}

        <button
          formAction={signIn}
          className="mt-2 min-h-13 rounded-full bg-white py-3.5 text-base font-semibold text-ink"
        >
          Sign in
        </button>
        <button
          formAction={signUp}
          className="min-h-12 rounded-full border border-line py-3 text-sm font-medium text-white"
        >
          Create account
        </button>
      </form>
    </main>
  );
}
