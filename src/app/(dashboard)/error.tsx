"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({ error }: { error: Error & { digest?: string } }) {
  const isForbidden = error.name === "ForbiddenError";

  return (
    <div className="mx-auto max-w-lg py-16">
      <Card>
        <CardContent className="space-y-2 pt-5">
          <h1 className="text-lg font-semibold text-foreground">
            {isForbidden ? "You don't have access to this page" : "Something went wrong"}
          </h1>
          <p className="text-sm text-muted">
            {isForbidden
              ? "Ask an administrator to grant the required permission on your role."
              : "Please try again, or contact support if the problem persists."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
