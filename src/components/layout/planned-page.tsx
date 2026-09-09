import { Card, CardContent } from "@/components/ui/card";

/**
 * Placeholder for a nav destination whose module hasn't shipped yet. Never claim a mocked or
 * planned capability is operational — see docs/05-mvp-plan.md and STATUS.md.
 */
export function PlannedPage({ title, phase, description }: { title: string; phase: number; description: string }) {
  return (
    <div className="mx-auto max-w-2xl py-16 text-center">
      <h1 className="text-xl font-semibold text-foreground">{title}</h1>
      <Card className="mt-6 text-left">
        <CardContent className="space-y-2">
          <p className="text-sm font-medium text-primary">Planned — Phase {phase}</p>
          <p className="text-sm text-muted">{description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
