import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRegistrationOpen } from "@/lib/modules/organizations/service";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return <LoginForm showRegisterLink={await isRegistrationOpen()} />;
}
