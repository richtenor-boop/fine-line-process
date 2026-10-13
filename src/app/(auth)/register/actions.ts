"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { registerOrganization, isRegistrationOpen } from "@/lib/modules/organizations/service";
import { registerSchema } from "@/lib/modules/organizations/schema";

export interface RegisterActionState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function registerAction(
  _prevState: RegisterActionState,
  formData: FormData,
): Promise<RegisterActionState> {
  // Enforced here, not just by hiding the page: the action is callable directly.
  if (!(await isRegistrationOpen())) {
    return { error: "Sign-up is closed. Ask your administrator to add you under Settings → Users." };
  }

  const parsed = registerSchema.safeParse({
    organizationName: formData.get("organizationName"),
    ownerName: formData.get("ownerName"),
    ownerEmail: formData.get("ownerEmail"),
    ownerPassword: formData.get("ownerPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] = issue.message;
    return { fieldErrors };
  }

  try {
    await registerOrganization(parsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not create organization.";
    return { error: message };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.ownerEmail,
      password: parsed.data.ownerPassword,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Organization created — please sign in." };
    }
    throw error;
  }
}
