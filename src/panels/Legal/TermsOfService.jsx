import { LegalLayout, Section } from '../../components/Legal/LegalLayout';

// Plain-English Terms of Service for Dr Self Tape.
// PLACEHOLDERS the user MUST fill in before relying on this in front
// of users or App Store/Google Play review:
//   - [LEGAL_ENTITY] — registered company name (e.g. "Dr Self Tape LLC")
//   - [JURISDICTION] — governing law state/country (e.g. "California, USA")
// This content is a reasonable starting point; have an attorney review
// it before significant scale or any contested situation.

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="May 14, 2026">
      <p>
        Welcome to Dr Self Tape. These Terms of Service ("Terms") govern your access to and use of
        the Dr Self Tape website, mobile application, and related services (collectively, the
        "Service"), operated by [LEGAL_ENTITY] ("we," "us," "our"). By creating an account or
        using the Service, you agree to these Terms. If you do not agree, do not use the Service.
      </p>

      <Section heading="1. Eligibility">
        <p>
          You must be at least 13 years old to create an account, and at least 18 years old to
          enter a paid subscription. You confirm that the information you provide is accurate and
          that you have the authority to enter this agreement.
        </p>
      </Section>

      <Section heading="2. Your account">
        <p>
          You are responsible for safeguarding your login credentials and for any activity on your
          account. Notify us immediately if you suspect unauthorized access. We may suspend or
          terminate accounts that violate these Terms or applicable law.
        </p>
      </Section>

      <Section heading="3. Subscriptions and billing">
        <p>
          Some features require a paid subscription. Subscriptions are billed in advance on a
          recurring basis (monthly or annually, as you select) through Stripe, our payment
          processor. Subscriptions auto-renew at the end of each billing period until you cancel
          via the in-app billing portal.
        </p>
        <p>
          You can cancel anytime; cancellation takes effect at the end of the current billing
          period. Except where required by law (e.g., consumer protection statutes), payments are
          non-refundable. We may change subscription prices on prospective renewals with at least
          30 days' notice.
        </p>
      </Section>

      <Section heading="4. AI-generated content">
        <p>
          The Service uses third-party AI providers to generate scenes, feedback, and other
          outputs. AI output may be inaccurate, incomplete, or unsuitable for your purpose. You
          are responsible for reviewing AI output before relying on it. We make no warranty that
          AI features will produce any particular result, and you should not use AI feedback as a
          substitute for professional coaching, casting decisions, or legal/medical advice.
        </p>
      </Section>

      <Section heading="5. Your content">
        <p>
          You retain ownership of recordings, scripts, notes, and other content you upload or
          create through the Service ("Your Content"). You grant us a worldwide, non-exclusive,
          royalty-free license to host, process, and display Your Content solely for the purpose
          of providing the Service to you and the people you share it with.
        </p>
        <p>
          You represent that Your Content does not infringe any third-party rights and that you
          have the necessary permissions to upload it — including, where required, permissions
          from copyright holders of scripts you analyze and scene partners you record with.
        </p>
      </Section>

      <Section heading="6. Acceptable use">
        <p>You agree not to:</p>
        <ul style={{ paddingLeft: 22, margin: '8px 0' }}>
          <li>Use the Service to harass, defame, or harm others.</li>
          <li>Upload content that is illegal, obscene, or that you do not have the right to use.</li>
          <li>Reverse engineer, scrape, or attempt to extract source code from the Service.</li>
          <li>Use the Service to train competing AI models.</li>
          <li>Resell, sublicense, or impersonate another person to access the Service.</li>
        </ul>
      </Section>

      <Section heading="7. Marketplace and scene partner connections">
        <p>
          The Service may enable you to connect, message, or book sessions with other users
          ("Scene Partners"). We do not employ Scene Partners and we are not a party to any
          agreement between you and another user. You interact with other users at your own risk.
        </p>
      </Section>

      <Section heading="8. Termination">
        <p>
          You may delete your account at any time from the in-app settings. We may suspend or
          terminate your account for material breach of these Terms, fraudulent activity, or as
          required by law. Upon termination, your access to the Service ends and your stored
          content may be deleted, except where retention is required by law.
        </p>
      </Section>

      <Section heading="9. Disclaimers">
        <p>
          The Service is provided "as is" without warranty of any kind, express or implied,
          including merchantability, fitness for a particular purpose, and non-infringement. We do
          not warrant that the Service will be uninterrupted, secure, or error-free, or that AI
          outputs will be accurate.
        </p>
      </Section>

      <Section heading="10. Limitation of liability">
        <p>
          To the maximum extent permitted by law, [LEGAL_ENTITY] will not be liable for indirect,
          incidental, consequential, or punitive damages arising from your use of the Service. Our
          total liability for any claim related to the Service is limited to the greater of
          (a) the amount you paid us in the twelve months before the claim arose, or (b) USD $100.
        </p>
      </Section>

      <Section heading="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. When we make material changes, we will
          notify you via email or an in-app notice at least 30 days before the change takes
          effect. Continued use of the Service after a change constitutes acceptance.
        </p>
      </Section>

      <Section heading="12. Governing law">
        <p>
          These Terms are governed by the laws of [JURISDICTION], without regard to its conflict
          of laws principles. You agree to the exclusive jurisdiction of the courts of
          [JURISDICTION] for any dispute arising from these Terms.
        </p>
      </Section>

      <Section heading="13. Contact">
        <p>
          Questions about these Terms? Email <a href="mailto:info@drselftapes.com" style={{ color: '#7A5A18', fontWeight: 600 }}>info@drselftapes.com</a>.
        </p>
      </Section>
    </LegalLayout>
  );
}
