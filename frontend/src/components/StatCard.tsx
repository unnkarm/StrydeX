export default function StatCard({
  label,
  value,
  unit,
  accent = false,
  compact = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-border bg-surface ${compact ? "p-3" : "p-4"}`}>
      <div className="text-xs uppercase tracking-widest text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
      </div>
    </div>
  );
}
