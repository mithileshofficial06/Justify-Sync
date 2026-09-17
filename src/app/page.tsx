import { getSession } from "@/lib/auth/session";
import { getPublicDemoAccounts } from "@/lib/demo";
import { LandingPage } from "@/components/landing/LandingPage";
import { RankedListDashboard } from "@/components/RankedListDashboard";

export default async function HomePage() {
  const session = await getSession();
  return session ? (
    <RankedListDashboard session={session} />
  ) : (
    <LandingPage demoAccounts={getPublicDemoAccounts()} />
  );
}
