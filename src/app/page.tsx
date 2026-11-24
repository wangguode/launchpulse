import { getAllAudits } from "@/data/audits";
import HomeClient from "@/components/HomeClient";

export default function HomePage() {
  const sampleAudits = getAllAudits();
  return <HomeClient sampleAudits={sampleAudits} />;
}
