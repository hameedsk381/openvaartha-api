import { Link } from "react-router-dom";
import PolicyLayout from "@/components/PolicyLayout";
import { BRAND } from "@/lib/brand";

const EditorialStandardsPage = () => (
  <PolicyLayout
    eyebrow="How we work"
    title="Editorial Standards"
    intro="The principles that guide how Open Vaartha reports, sources, and publishes — and how we stay accountable to readers."
    description="Open Vaartha's editorial standards: independence, sourcing and verification, use of AI, and accountability to readers."
    updated="9 July 2026"
  >
    <h2>Independence</h2>
    <p>
      {BRAND.name} is an independent, youth-led news initiative operated by Gen Z and
      supported by the FOSS Andhra Foundation. Our editorial decisions answer to readers,
      not to advertisers or funders. We do not sell coverage, and sponsorship — where it
      ever exists — is disclosed clearly and never influences reporting.
    </p>

    <h2>Sourcing and verification</h2>
    <p>
      We aim to verify information before we publish it. Where a story draws on another
      outlet, a document, or an official statement, we attribute it and, wherever possible,
      link to the primary source so readers can check the record themselves. When facts are
      still developing or unconfirmed, we say so plainly rather than presenting uncertainty
      as fact.
    </p>

    <h2>Use of AI</h2>
    <p>
      Some articles on {BRAND.name} — particularly summaries of stories aggregated from
      publicly available sources — are drafted or rewritten with the assistance of AI tools
      and then published under our editorial standards. AI-assisted articles are always
      derived from cited sources, and we take responsibility for their accuracy. We are
      committed to correcting any errors promptly and transparently, whatever their origin.
      We do not use AI to fabricate quotes, events, or sources.
    </p>

    <h2>Corrections and accountability</h2>
    <p>
      Getting it right matters more than getting it first. When we make a mistake, we fix it
      openly and note the change. If you spot an error, please tell us — see our{" "}
      <Link to="/corrections">Corrections Policy</Link> for how we handle it.
    </p>

    <h2>Open by default</h2>
    <p>
      We publish in the open: our journalism is free to read, without paywalls, and the
      platform itself is open source. We believe transparency about how the news is made is
      part of earning trust.
    </p>

    <h2>Contact</h2>
    <p>
      Questions about our standards, or want to get involved? Reach us at{" "}
      <a href={`mailto:${BRAND.contactEmail}`}>{BRAND.contactEmail}</a> or through any of the
      channels on our <Link to="/contact">Contact</Link> page.
    </p>
  </PolicyLayout>
);

export default EditorialStandardsPage;
