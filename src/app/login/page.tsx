import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getPublicDemoAccounts } from "@/lib/demo";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage(props: PageProps<"/login">) {
  if (await getSession()) redirect("/");

  const { as } = await props.searchParams;
  const demoAccounts = getPublicDemoAccounts();
  const prefill = typeof as === "string" ? (demoAccounts.find((a) => a.barEnrolmentNo === as) ?? null) : null;

  return <LoginForm demoAccounts={demoAccounts} prefill={prefill} />;
}
