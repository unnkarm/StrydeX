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
    <div
      className={`rounded-lg border border-border bg-surface ${
        compact ? "min-w-0 px-4 py-3.5" : "p-4"
      }`}
    >
      <p
        className={`uppercase text-muted ${
          compact ? "min-h-8 text-[10px] leading-4 tracking-[0.14em]" : "text-xs tracking-wide"
        }`}
      >
        {label}
      </p>
      <div
        className={`stat-value mt-1 font-semibold ${compact ? "text-2xl leading-none" : "text-2xl"} ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
        {unit && (
          <span className={`ml-0.5 text-muted ${compact ? "text-xs" : "text-sm"}`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
