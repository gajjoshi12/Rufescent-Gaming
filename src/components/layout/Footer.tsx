import Link from "next/link";
import { Mark } from "@/components/brand/Logo";
import { Divider } from "@/components/ui/primitives";

/**
 * Site footer. The responsible-gambling and age-verification block is
 * mandatory on every page, so this component is rendered by the root
 * layout rather than by individual routes.
 */
export function Footer() {
  return (
    <footer className="mt-12 border-t border-white/8 bg-obsidian-950/70">
      <div className="mx-auto max-w-[104rem] px-4 py-10 sm:px-6">
        {/* --- Compliance block --- */}
        <section
          aria-labelledby="responsible-gambling-heading"
          className="glass mb-8 rounded-2xl border-gold-400/15 p-5 sm:p-6"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <span
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-ember-400/60 bg-ember-500/12 font-display text-sm font-bold text-ember-200"
            >
              18+
            </span>

            <div className="min-w-0 flex-1">
              <h2 id="responsible-gambling-heading" className="text-sm font-semibold text-white">
                Play responsibly
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-white/50">
                Gambling involves risk and should never be treated as a way to make money. Only stake
                what you can afford to lose. Rufescent Gaming is strictly for adults aged 18 and over;
                accounts are subject to identity and age verification before withdrawal. If gambling
                stops being entertainment, use our deposit limits, reality checks, cool-off and
                self-exclusion tools at any time.
              </p>

              <ul className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.6875rem]">
                <li>
                  <Link
                    href="/responsible-gambling"
                    className="font-medium text-gold-300 underline-offset-2 hover:underline"
                  >
                    Responsible gambling tools
                  </Link>
                </li>
                <li>
                  <Link
                    href="/responsible-gambling#self-exclusion"
                    className="text-white/50 underline-offset-2 hover:text-white hover:underline"
                  >
                    Self-exclusion
                  </Link>
                </li>
                <li>
                  <Link
                    href="/responsible-gambling#support"
                    className="text-white/50 underline-offset-2 hover:text-white hover:underline"
                  >
                    Get support
                  </Link>
                </li>
                <li className="text-white/35">Helpline: 1800-599-0019 (24×7, free)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* --- Link columns --- */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <FooterColumn
            title="Products"
            links={[
              { label: "Sports betting", href: "/sports" },
              { label: "In-play", href: "/sports/live" },
              { label: "Casino", href: "/casino" },
              { label: "Poker room", href: "/casino/poker" },
              { label: "Fantasy", href: "/fantasy" },
            ]}
          />
          <FooterColumn
            title="Account"
            links={[
              { label: "Wallet", href: "/wallet" },
              { label: "Deposits & withdrawals", href: "/wallet#deposit" },
              { label: "Verification (KYC)", href: "/wallet#kyc" },
              { label: "Settings", href: "/profile" },
            ]}
          />
          <FooterColumn
            title="Safer gambling"
            links={[
              { label: "Deposit limits", href: "/responsible-gambling#limits" },
              { label: "Reality checks", href: "/responsible-gambling#reality-check" },
              { label: "Take a break", href: "/responsible-gambling#self-exclusion" },
              { label: "Self-assessment", href: "/responsible-gambling#assessment" },
            ]}
          />
          <FooterColumn
            title="Legal"
            links={[
              { label: "Terms & conditions", href: "/responsible-gambling#terms" },
              { label: "Privacy policy", href: "/responsible-gambling#privacy" },
              { label: "Betting rules", href: "/responsible-gambling#rules" },
              { label: "Complaints", href: "/responsible-gambling#support" },
            ]}
          />
        </div>

        <Divider className="my-7" />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Mark size={26} />
            <p className="text-[0.6875rem] text-white/35">
              © {new Date().getUTCFullYear()} Rufescent Gaming. Demonstration build — no real money
              or wagering is involved.
            </p>
          </div>

          <ul className="flex items-center gap-3" aria-label="Compliance marks">
            {["18+", "GamCare", "SSL", "RNG Certified"].map((mark) => (
              <li
                key={mark}
                className="rounded border border-white/10 px-2 py-1 text-[0.5625rem] font-semibold uppercase tracking-wider text-white/30"
              >
                {mark}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-2.5 text-[0.625rem] font-semibold uppercase tracking-widest text-white/30">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-xs text-white/50 transition-colors hover:text-gold-200"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
