import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicLeadForm } from "@/lib/modules/lead-forms/service";
import { PublicLeadForm } from "./public-lead-form";

export const metadata: Metadata = {
  title: "Get a cash offer",
  robots: { index: false, follow: false },
};

export default async function PublicLeadFormPage({ params }: PageProps<"/f/[token]">) {
  const { token } = await params;
  const form = await getPublicLeadForm(token);
  if (!form) notFound();

  return (
    <div className="flex min-h-screen w-full justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <p className="text-sm font-medium text-muted">{form.organizationName}</p>
          <h1 className="mt-1 text-2xl font-semibold text-foreground">
            {form.headline || "Get a fair cash offer for your house"}
          </h1>
        </div>
        <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
          <PublicLeadForm publicToken={token} />
        </div>
      </div>
    </div>
  );
}
