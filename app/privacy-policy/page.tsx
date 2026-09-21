import type { Metadata } from "next"
import Link from "next/link"
import { Calendar } from "lucide-react"

export const metadata: Metadata = {
  title: "Privacy Policy | Catch My Event",
  description:
    "Learn how Catch My Event collects, uses, and protects your information when you publish and discover events across Sri Lanka.",
}

export default function PrivacyPolicyPage() {
  const updatedYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-4xl flex-col gap-8 px-6 py-16">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 transition hover:border-sky-400 hover:text-white"
        >
          <Calendar className="h-4 w-4" aria-hidden="true" /> Back to Catch My Event
        </Link>

        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-300">Privacy Policy</p>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">How we handle your data</h1>
          <p className="max-w-2xl text-base text-slate-300">
            Catch My Event is committed to protecting your privacy. This policy explains what personal data we collect, how we
            use it to power event discovery, and the choices you have.
          </p>
          <p className="text-xs text-slate-400">Last updated: {updatedYear}</p>
        </header>

        <section className="space-y-6 rounded-3xl border border-white/5 bg-white/5 p-8 backdrop-blur">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">1. Information we collect</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              We collect information that helps us provide and improve the platform, including account details (name, email,
              phone number), event content (titles, descriptions, images, locations), and engagement data (likes, RSVPs, event
              views). We also store technical logs that keep the site secure and reliable.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">2. How we use your information</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
              <li>Enable you to publish events, manage listings, and respond to attendees.</li>
              <li>Power search results, map displays, and personalised recommendations.</li>
              <li>Send transactional messages about your account or hosted events.</li>
              <li>Improve platform performance, security, and new feature development.</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">3. Sharing &amp; data retention</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              We do not sell your data. Public event details are indexed by search engines to help guests find your listings.
              We only share personal information with service providers that help us operate Catch My Event (for example,
              authentication and analytics tools), each bound by strict confidentiality obligations. Account data is retained
              while you have an active profile or to meet legal obligations.
            </p>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">4. Your choices</h2>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
              <li>Update or delete your events at any time from the dashboard.</li>
              <li>Contact us to deactivate your profile or request data exports.</li>
              <li>Manage email preferences using the links included in our messages.</li>
            </ul>
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-white">5. Contact us</h2>
            <p className="text-sm leading-relaxed text-slate-300">
              Questions or privacy requests? Email us at{' '}
              <a href="mailto:kavindurukmal@gmail.com" className="font-medium text-sky-300 hover:text-sky-200">
                kavindurukmal@gmail.com
              </a>
              . We will respond as quickly as possible.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
