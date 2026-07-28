import { LegalLayout, Section } from '../../components/Legal/LegalLayout';

// Plain-English Terms of Service for Dr Self Tape.
// This content is a reasonable starting point; have an attorney review
// it before significant scale or any contested situation.

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated="May 14, 2026">
      <p>
        Welcome to Dr Self Tape. These Terms of Service ("Terms") govern your access to and use of
        the Dr Self Tape website, mobile application, and related services (collectively, the
        "Service"), operated by Dr Self Tape LLC ("we," "us," "our"). By creating an account or
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
          recurring basis (monthly or annually, as you select) and auto-renew at the end of each
          billing period until you cancel.
        </p>
        <p>
          <strong>On iOS:</strong> payment is charged to your Apple ID at confirmation of purchase.
          Manage or cancel your subscription in Settings &rarr; [Your Name] &rarr; Subscriptions on
          your device, or via the App Store app. Apple's standard EULA at{' '}
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">
            apple.com/legal/internet-services/itunes/dev/stdeula
          </a>{' '}
          also applies to your subscription.
        </p>
        <p>
          <strong>On the web:</strong> payment is processed by Stripe, our web payment processor.
          You can cancel anytime from the in-app billing portal.
        </p>
        <p>
          Cancellation takes effect at the end of the current billing period. Except where required
          by law (e.g., consumer protection statutes), payments are non-refundable. We may change
          subscription prices on prospective renewals with at least 30 days' notice.
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
          have the necessary permissions to upload it, including, where required, permissions
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
          To the maximum extent permitted by law, Dr Self Tape LLC will not be liable for indirect,
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
          These Terms are governed by the laws of California, USA, without regard to its conflict
          of laws principles. You agree to the exclusive jurisdiction of the courts of
          California, USA for any dispute arising from these Terms.
        </p>
      </Section>

      <Section heading="13. Contact">
        <p>
          Questions about these Terms? Email <a href="mailto:info@drselftapes.com" style={{ color: '#7A5A18', fontWeight: 600 }}>info@drselftapes.com</a>.
          You can also write to us at: Dr Self Tape LLC, 1621 Vista Del Mar, Hollywood, CA 90028, USA.
        </p>
      </Section>

      <Section heading="14. Apple App Store: additional terms (iOS users)">
        <p>
          The following terms apply when you download and use the Dr Self Tape application (the
          "Licensed Application") from the Apple App Store on an Apple-branded device. These terms
          satisfy Apple's "Minimum Terms of Developer's End-User License Agreement" and supplement
          the rest of these Terms.
        </p>

        <p>
          <strong>14.1 Acknowledgement.</strong> You acknowledge that this agreement is concluded
          between you and Dr Self Tape LLC only, and not with Apple Inc. ("Apple"). Dr Self Tape
          LLC, not Apple, is solely responsible for the Licensed Application and its content.
        </p>

        <p>
          <strong>14.2 Scope of license.</strong> Dr Self Tape LLC grants you a non-transferable
          license to use the Licensed Application on any Apple-branded products that you own or
          control, as permitted by the Apple App Store Terms of Service, including Family Sharing
          and volume purchasing where Apple makes those features available.
        </p>

        <p>
          <strong>14.3 Maintenance and support.</strong> Dr Self Tape LLC is solely responsible for
          providing any maintenance and support services with respect to the Licensed Application.
          Apple has no obligation whatsoever to furnish any maintenance and support services with
          respect to the Licensed Application.
        </p>

        <p>
          <strong>14.4 Warranty.</strong> Dr Self Tape LLC is solely responsible for any product
          warranties, whether express or implied by law, to the extent not effectively disclaimed.
          In the event of any failure of the Licensed Application to conform to any applicable
          warranty, you may notify Apple, and Apple will refund the purchase price for the Licensed
          Application to you. To the maximum extent permitted by applicable law, Apple will have no
          other warranty obligation whatsoever with respect to the Licensed Application. Any other
          claims, losses, liabilities, damages, costs or expenses attributable to any failure to
          conform to any warranty will be the sole responsibility of Dr Self Tape LLC.
        </p>

        <p>
          <strong>14.5 Product claims.</strong> Dr Self Tape LLC, not Apple, is responsible for
          addressing any claims by you or any third party relating to the Licensed Application or
          your possession and/or use of the Licensed Application, including: (i) product liability
          claims; (ii) any claim that the Licensed Application fails to conform to any applicable
          legal or regulatory requirement; and (iii) claims arising under consumer protection,
          privacy, or similar legislation.
        </p>

        <p>
          <strong>14.6 Intellectual property rights.</strong> In the event of any third-party claim
          that the Licensed Application or your possession and use of it infringes that third
          party's intellectual property rights, Dr Self Tape LLC, not Apple, will be solely
          responsible for the investigation, defense, settlement and discharge of any such
          intellectual property infringement claim.
        </p>

        <p>
          <strong>14.7 Legal compliance.</strong> You represent and warrant that (i) you are not
          located in a country that is subject to a U.S. Government embargo, or that has been
          designated by the U.S. Government as a "terrorist supporting" country; and (ii) you are
          not listed on any U.S. Government list of prohibited or restricted parties.
        </p>

        <p>
          <strong>14.8 Developer name and contact.</strong> Dr Self Tape LLC, 1968 S. Coast Hwy
          #4490, Laguna Beach, CA 92651, USA. Email:{' '}
          <a href="mailto:info@drselftapes.com" style={{ color: '#7A5A18', fontWeight: 600 }}>info@drselftapes.com</a>.
          Direct any questions, complaints, or claims regarding the Licensed Application to this
          address.
        </p>

        <p>
          <strong>14.9 Third-party terms of agreement.</strong> You must comply with applicable
          third-party terms of agreement when using the Licensed Application, including, where
          applicable, your wireless carrier's data plan terms and any third-party service the
          Licensed Application interacts with (for example, casting platforms, video processing
          services, or AI providers).
        </p>

        <p>
          <strong>14.10 Third-party beneficiary.</strong> You acknowledge and agree that Apple, and
          Apple's subsidiaries, are third-party beneficiaries of this agreement, and that, upon
          your acceptance of the terms and conditions of this agreement, Apple will have the right
          (and will be deemed to have accepted the right) to enforce this agreement against you as
          a third-party beneficiary of this agreement.
        </p>
      </Section>
    </LegalLayout>
  );
}
