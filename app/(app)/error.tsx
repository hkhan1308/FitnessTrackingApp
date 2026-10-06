"use client";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <h1 className="text-lg font-semibold">Could not load your log</h1>
      <p className="text-sm text-muted-foreground">{error.message || "Something went wrong."}</p>
      <Button className="h-11" onClick={reset}>Try again</Button>
    </div>
  );
}
