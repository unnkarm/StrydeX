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
    <div className="rounded-lg border border-border bg-surface px-5 py-4">
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div
        className={`stat-value mt-1 text-3xl font-medium ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
        {unit && <span className="ml-1 text-base text-muted">{unit}</span>}
      </div>
    </div>
  );
}
