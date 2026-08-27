import { getSession } from "@/lib/auth/session";
import { Showcase } from "@/components/Showcase";
import { RankedListDashboard } from "@/components/RankedListDashboard";

export default async function HomePage() {
  const session = await getSession();
  return session ? <RankedListDashboard session={session} /> : <Showcase />;
}
