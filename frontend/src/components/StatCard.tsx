export default function StatCard({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <div
        className={`stat-value mt-1 text-2xl font-semibold ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
        {unit && <span className="ml-0.5 text-sm text-muted">{unit}</span>}
      </div>
    </div>
  );
}
