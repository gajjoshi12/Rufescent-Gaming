import Link from "next/link";
import { Mark } from "@/components/brand/Logo";
import { LinkButton } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main
      id="main"
      className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center px-6 pb-[var(--shell-pad-bottom)] text-center"
    >
      <Mark size={56} />
      <p className="mt-6 font-display text-5xl font-semibold text-gilt tnum">404</p>
      <h1 className="mt-2 text-lg font-semibold">This market isn&rsquo;t running</h1>
      <p className="mt-2 text-sm leading-relaxed text-white/50">
        The page you were looking for has been settled, moved or never existed. Try the sports lobby
        for what&rsquo;s live right now.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <LinkButton href="/sports" variant="gold">
          Browse sports
        </LinkButton>
        <LinkButton href="/" variant="subtle">
          Back home
        </LinkButton>
      </div>

      <p className="mt-8 text-[0.6875rem] text-white/30">
        18+ only ·{" "}
        <Link href="/responsible-gambling" className="text-gold-300/70 underline-offset-2 hover:underline">
          Gamble responsibly
        </Link>
      </p>
    </main>
  );
}
