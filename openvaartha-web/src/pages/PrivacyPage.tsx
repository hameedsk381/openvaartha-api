import { Link } from "react-router-dom";
import PolicyLayout from "@/components/PolicyLayout";
import { BRAND } from "@/lib/brand";

const PrivacyPage = () => (
  <PolicyLayout
    eyebrow="Your data"
    title="Privacy Policy"
    intro="What we collect, why we collect it, and how you can control it."
    description="Open Vaartha's privacy policy: what data we collect, why, and how to exercise your rights."
    updated="9 July 2026"
  >
    <h2>Who this applies to</h2>
    <p>
      This policy covers {BRAND.name} ({BRAND.url}).
      It applies to anyone who reads, subscribes to, comments on, or creates an account with
      {" "}{BRAND.name}.
    </p>

    <h2>What we collect</h2>
    <ul>
      <li>
        <strong>Account data</strong> — if you register or sign in (including via Google
        Sign-In), we store your name, email address, and a securely hashed password (or, for
        Google accounts, a Google account identifier — we never see or store your Google
        password).
      </li>
      <li>
        <strong>Content you create</strong> — comments, saved articles, reading history, and
        contributor submissions you choose to make.
      </li>
      <li>
        <strong>Newsletter</strong> — if you subscribe, we store the email address you provide.
      </li>
      <li>
        <strong>Usage analytics</strong> — we use Google Analytics (GA4) to understand
        aggregate traffic patterns (pages viewed, approximate location, device type). This
        does not identify you personally.
      </li>
      <li>
        <strong>Session tokens</strong> — signing in stores an authentication token in your
        browser's local storage so you stay signed in between visits.
      </li>
    </ul>

    <h2>What we don't do</h2>
    <p>
      We do not sell your personal data to third parties. We do not run third-party
      advertising trackers beyond the analytics described above.
    </p>

    <h2>How we use your data</h2>
    <p>
      To operate your account, show you your saved articles and reading history, send the
      newsletter you subscribed to, moderate comments, and understand how the platform is
      used so we can improve it.
    </p>

    <h2>Third parties</h2>
    <p>
      We use Google (Analytics and, optionally, Sign-In) and standard infrastructure providers
      (hosting, email delivery, cloud storage for images) to operate the platform. These
      providers process data on our behalf under their own privacy terms.
    </p>

    <h2>Your rights</h2>
    <p>
      You can request access to, correction of, or deletion of your personal data, or
      unsubscribe from the newsletter at any time (every newsletter email includes an
      unsubscribe link). To exercise these rights, email{" "}
      <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>.
    </p>

    <h2>Data retention</h2>
    <p>
      We keep account and content data for as long as your account is active. If you request
      deletion, we remove your personal data within a reasonable time, except where we are
      required to retain records by law.
    </p>

    <h2>Children's privacy</h2>
    <p>{BRAND.name} is not directed at children under 13, and we do not knowingly collect data from them.</p>

    <h2>Governing law</h2>
    <p>
      This policy is governed by the laws of India. Any disputes are subject to the
      jurisdiction of the courts of Andhra Pradesh, India.
    </p>

    <h2>Changes to this policy</h2>
    <p>
      We may update this policy as the platform evolves. Material changes will be reflected
      here with an updated date at the top of this page.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about this policy or your data: <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>.
      See also our <Link to="/terms">Terms of Use</Link>.
    </p>
  </PolicyLayout>
);

export default PrivacyPage;
