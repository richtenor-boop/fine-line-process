import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isRegistrationOpen } from "@/lib/modules/organizations/service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  if (!(await isRegistrationOpen())) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign-up is closed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted">
          <p>This CRM already has an owner. Ask your administrator to add you under Settings → Users.</p>
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <RegisterForm />;
}
