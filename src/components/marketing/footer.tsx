import Link from "next/link";
import { Logomark } from "@/components/brand/logomark";

export function Footer() {
  return (
    <footer className="bg-ink py-14 text-warm-400">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <Logomark size={30} animated={false} />
              <span className="text-sm font-semibold text-white">
                Teacher Resource Bank
              </span>
            </div>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-warm-400">
              Nigerian curriculum lesson notes, schemes of work, CPD courses, and offline AI for teachers.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Browse</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/courses"
                  className="transition-colors hover:text-mint-300"
                >
                  CPD Courses
                </Link>
              </li>
              <li>
                <Link
                  href="/subjects/primary/p1"
                  className="transition-colors hover:text-mint-300"
                >
                  Primary
                </Link>
              </li>
              <li>
                <Link
                  href="/subjects/junior-secondary/jss1"
                  className="transition-colors hover:text-mint-300"
                >
                  Junior Secondary
                </Link>
              </li>
              <li>
                <Link
                  href="/subjects/senior-secondary/sss1"
                  className="transition-colors hover:text-mint-300"
                >
                  Senior Secondary
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Resources</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/guidance"
                  className="transition-colors hover:text-mint-300"
                >
                  Teaching Guidance
                </Link>
              </li>
              <li>
                <Link
                  href="/#pricing"
                  className="transition-colors hover:text-mint-300"
                >
                  Pricing
                </Link>
              </li>
              <li>
                <Link
                  href="/sign-up"
                  className="transition-colors hover:text-mint-300"
                >
                  Create an account
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-white">Account</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/sign-in"
                  className="transition-colors hover:text-mint-300"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/my-library"
                  className="transition-colors hover:text-mint-300"
                >
                  My Library
                </Link>
              </li>
              <li>
                <Link
                  href="/my-library/certificates"
                  className="transition-colors hover:text-mint-300"
                >
                  Certificates
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-warm-800 pt-8 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Teacher Resource Bank. All rights
            reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
