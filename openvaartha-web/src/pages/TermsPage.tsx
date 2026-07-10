import { Link } from "react-router-dom";
import PolicyLayout from "@/components/PolicyLayout";
import { BRAND } from "@/lib/brand";

const TermsPage = () => (
  <PolicyLayout
    eyebrow="The fine print"
    title="Terms of Use"
    intro="The rules for using Open Vaartha — kept as short as we could make them."
    description="Open Vaartha's terms of use: acceptable use, content ownership, contributor submissions, and disclaimers."
    updated="9 July 2026"
  >
    <h2>Acceptance</h2>
    <p>
      By accessing or using {BRAND.name} ({BRAND.url}), you agree to these terms. If you do
      not agree, please do not use the site.
    </p>

    <h2>Using the site</h2>
    <p>
      {BRAND.name} is free to read, without paywalls. You agree not to misuse the platform —
      including attempting to disrupt service, scrape content at abusive volume, impersonate
      others, or post unlawful, harassing, or defamatory content in comments or contributions.
    </p>

    <h2>Accounts</h2>
    <p>
      You are responsible for keeping your account credentials secure and for activity that
      happens under your account. You must provide accurate information when registering.
    </p>

    <h2>Comments and contributions</h2>
    <p>
      If you comment or submit a contribution, you retain ownership of what you write, but you
      grant {BRAND.name} a non-exclusive, royalty-free licence to publish, display, and
      moderate it on the platform. We may remove content that violates these terms or our{" "}
      <Link to="/editorial">Editorial Standards</Link> at our discretion.
    </p>

    <h2>Our content</h2>
    <p>
      Unless otherwise noted, articles and original content published by {BRAND.name} are
      free to read and share with attribution. The {BRAND.name} platform (the software itself)
      is open source — see our <Link to="/contact">Contact</Link> page for the repository.
      Third-party content we aggregate or cite remains the property of its original source and
      is attributed accordingly.
    </p>

    <h2>No warranty</h2>
    <p>
      We work to keep {BRAND.name} accurate and available, but the site and its content are
      provided "as is," without warranties of any kind, express or implied. We do not
      guarantee the site will be error-free, uninterrupted, or available at all times.
    </p>

    <h2>Limitation of liability</h2>
    <p>
      To the fullest extent permitted by law, {BRAND.name} and the FOSS Andhra Foundation are
      not liable for any indirect, incidental, or consequential damages arising from your use
      of the site.
    </p>

    <h2>Changes to these terms</h2>
    <p>
      We may update these terms as the platform evolves. Continued use of the site after
      changes are posted constitutes acceptance of the updated terms.
    </p>

    <h2>Governing law</h2>
    <p>
      These terms are governed by the laws of India, and any disputes are subject to the
      exclusive jurisdiction of the courts of Andhra Pradesh, India.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about these terms: <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a>.
      See also our <Link to="/privacy">Privacy Policy</Link>.
    </p>
  </PolicyLayout>
);

export default TermsPage;
