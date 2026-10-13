import { Hero } from "@/components/marketing/hero";
import { SubjectStrip } from "@/components/marketing/subject-strip";
import { PillarsSection } from "@/components/marketing/pillars-section";
import { ResourcePreview } from "@/components/marketing/resource-preview";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { MissionSection } from "@/components/marketing/mission-section";
import { PricingTeaser } from "@/components/marketing/pricing-teaser";
import { FinalCta } from "@/components/marketing/final-cta";
import { Footer } from "@/components/marketing/footer";
import { NativeHomeRedirect } from "@/components/native-home-redirect";

export const metadata = {
  title:
    "Teacher Resource Bank — CPD Courses for Nigerian Teachers",
  description:
    "Structured professional development courses with completion certificates, plus lesson notes, schemes of work, question banks, and an AI teaching assistant — built for Nigerian teachers. ₦5,000 per term.",
};

export default function HomePage() {
  return (
    <>
      {/* No-op on the web; in the installed app it bounces to the app entry. */}
      <NativeHomeRedirect />
      <Hero />
      <PillarsSection />
      <MissionSection />
      <PricingTeaser />
      <FinalCta />
      {/* Footer lives only on the landing page, not on any authenticated
          or browsing screen that shares this same TeacherShell layout. */}
      <Footer />
    </>
  );
}
