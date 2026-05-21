import { LegalLayout, Section } from '../../components/Legal/LegalLayout';

// Privacy Policy for Dr Self Tape.
// App Store and Google Play both require a Privacy Policy URL for any
// app that handles user accounts or payments; this URL is what they
// link to in store listings.

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="May 14, 2026">
      <p>
        This Privacy Policy explains how Dr Self Tape LLC ("we," "us," "our") collects, uses, and
        shares information when you use Dr Self Tape — our website, mobile app, and related
        services (the "Service").
      </p>

      <Section heading="Information we collect">
        <p><strong>Account information.</strong> When you create an account: name, email, phone
        number, role (actor / casting director / coach / agent), and password (stored as a
        cryptographic hash — we never see your raw password).</p>

        <p><strong>Profile content.</strong> Headshots, bio, union status, genres, years of
        experience, and other details you choose to add to your profile.</p>

        <p><strong>Practice content.</strong> Scripts you upload, scenes you generate with AI,
        rehearsal recordings, journal entries, and audition tracking notes. This is your
        content — we host it so you can access it across devices.</p>

        <p><strong>Communications.</strong> Messages you send to scene partners, coaches, or
        casting directors through the Service.</p>

        <p><strong>Payment information.</strong> We do not store credit card numbers. Payments
        are processed by Stripe, which holds card data subject to PCI-DSS. We store your Stripe
        customer ID and subscription state so we can show your plan and tokens.</p>

        <p><strong>Usage data.</strong> Pages visited, features used, device type, and approximate
        location (derived from IP address). Used to improve the product and diagnose issues.</p>

        <p><strong>Cookies and local storage.</strong> We use cookies and browser storage to keep
        you logged in, remember your preferences (theme, filters, tutorial progress), and run
        analytics. You can clear these from your browser at any time.</p>
      </Section>

      <Section heading="How we use information">
        <ul style={{ paddingLeft: 22, margin: '8px 0' }}>
          <li>Provide the Service — let you log in, store your content, match you with scene partners, run AI features.</li>
          <li>Process payments and manage subscriptions.</li>
          <li>Send service emails (account activity, password resets, billing receipts).</li>
          <li>Improve the product — understand which features are used, fix bugs, develop new functionality.</li>
          <li>Detect fraud and enforce our Terms of Service.</li>
          <li>Comply with legal obligations.</li>
        </ul>
        <p>
          We do not sell your personal information.
        </p>
      </Section>

      <Section heading="Third-party services we use">
        <p>
          To run the Service, we share specific data with the following processors. Each is bound
          by its own privacy policy, which we encourage you to review:
        </p>
        <ul style={{ paddingLeft: 22, margin: '8px 0' }}>
          <li><strong>Stripe</strong> — payment processing and subscription management.</li>
          <li><strong>OpenAI and Anthropic</strong> — AI scene generation, feedback, and transcription. Inputs you submit to AI features (scripts, audio, prompts) are sent to these providers.</li>
          <li><strong>Daily.co</strong> — real-time video sessions for the AI Scene Partner and live rehearsals.</li>
          <li><strong>Sentry</strong> — error monitoring. Stack traces and a limited set of breadcrumbs are sent on crash.</li>
          <li><strong>PostHog</strong> — product analytics. Pseudonymous event data is sent so we can understand feature usage. Personally identifiable info is not attached unless you are logged in (in which case we send your user ID).</li>
          <li><strong>Railway and Vercel</strong> — infrastructure hosting.</li>
          <li><strong>Amazon S3 / Cloudflare R2</strong> — storage for headshots, recordings, and other media.</li>
          <li><strong>Wix</strong> — booking integration for coaching sessions.</li>
        </ul>
      </Section>

      <Section heading="How long we keep your data">
        <p>
          We retain account and profile data for as long as your account is active. If you delete
          your account, we delete your profile, recordings, and content within 30 days, except
          where retention is required for legal, tax, or fraud-prevention purposes. Stripe retains
          payment records independently per its own policy.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>Depending on where you live, you may have the right to:</p>
        <ul style={{ paddingLeft: 22, margin: '8px 0' }}>
          <li>Access a copy of the personal data we hold about you.</li>
          <li>Correct inaccurate information.</li>
          <li>Delete your account and associated data.</li>
          <li>Object to or restrict certain types of processing.</li>
          <li>Export your data in a portable format.</li>
        </ul>
        <p>
          To exercise any of these rights, email <a href="mailto:info@drselftapes.com" style={{ color: '#7A5A18', fontWeight: 600 }}>info@drselftapes.com</a> from the address associated with your account. We will respond within 30 days.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          The Service is not directed to children under 13. We do not knowingly collect personal
          information from children under 13. If you believe a child has provided information to
          us, please contact us and we will delete it.
        </p>
      </Section>

      <Section heading="Security">
        <p>
          We use industry-standard practices to protect your data — TLS in transit, encrypted
          storage at rest, JWT-based authentication, and limited employee access. No system is
          perfectly secure, and we cannot guarantee absolute protection. If we become aware of a
          breach affecting your data, we will notify you as required by law.
        </p>
      </Section>

      <Section heading="International users">
        <p>
          We are based in California, USA and our infrastructure providers may store data in the
          United States and other countries. By using the Service from outside California, USA, you
          consent to the transfer of your data to these locations.
        </p>
      </Section>

      <Section heading="Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. Material changes will be announced
          via email or an in-app notice at least 30 days before they take effect. The "Last
          updated" date at the top of this page shows when changes were last made.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          Questions about this Privacy Policy or your data? Email <a href="mailto:info@drselftapes.com" style={{ color: '#7A5A18', fontWeight: 600 }}>info@drselftapes.com</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
