import type { Metadata } from "next"
import Link from "next/link"
import { ShieldCheck } from "lucide-react"

export const metadata: Metadata = {
  title: "Terms & Conditions | Catch My Event",
  description:
    "Review the terms and conditions for using Catch My Event to publish and discover the best happenings around Sri Lanka.",
}

export default function TermsPage() {
  const updatedYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-900 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-300 hover:text-white"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Back to Catch My Event
        </Link>

        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Terms &amp; Conditions</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Use Catch My Event responsibly</h1>
          <p className="max-w-2xl text-base text-slate-300">
            These terms explain your responsibilities when publishing events, engaging with other members, and exploring the
            platform. By using Catch My Event, you agree to follow them.
          </p>
          <p className="text-xs text-slate-400">Last updated: {updatedYear}</p>
        </header>

        <section className="space-y-6 rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">1. Account responsibilities</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Keep your login credentials secure and ensure your profile information stays accurate. You are responsible for the
              activity that happens through your account, so please notify us immediately if you suspect unauthorised access.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">2. Event publishing guidelines</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
              <li>Only publish events that you have permission to host or promote.</li>
              <li>Provide clear, accurate details so guests can make informed decisions.</li>
              <li>Respect local laws, copyrights, and community standards when sharing content.</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">3. Prohibited conduct</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Do not use Catch My Event to spam, mislead, or harass others. We may remove content or suspend accounts that share
              violent, hateful, discriminatory, or illegal material. Help keep the community safe by reporting concerning events
              or behaviour.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">4. Liability &amp; indemnity</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Event hosts are fully responsible for the experiences they organise. Catch My Event provides discovery tools but
              does not control the quality, safety, or legality of listed events. You agree to indemnify us from claims arising
              from events you create or actions you take on the platform.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">5. Updates &amp; contact</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              We may update these terms to reflect new features or regulations. We will notify you about material changes. For
              questions or concerns, contact{' '}
              <a href="mailto:kavindurukmal@gmail.com" className="font-medium text-sky-300 hover:text-sky-200">
                kavindurukmal@gmail.com
              </a>
              .
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
