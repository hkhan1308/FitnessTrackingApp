export default function Loading() {
  return (
    <div className="space-y-3" aria-live="polite">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-muted" />
      <div className="h-28 animate-pulse rounded-xl bg-muted" />
      <div className="h-40 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
