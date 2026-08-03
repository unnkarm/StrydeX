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
        compact ? "min-w-0 px-4 py-3.5" : "px-5 py-4"
      }`}
    >
      <div
        className={`uppercase text-muted ${
          compact
            ? "min-h-8 text-[10px] leading-4 tracking-[0.14em]"
            : "text-xs tracking-widest"
        }`}
      >
        {label}
      </div>
      <div
        className={`stat-value font-medium ${compact ? "mt-1 text-2xl leading-none" : "mt-1 text-3xl"} ${
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
        {unit && (
          <span className={`ml-1 text-muted ${compact ? "text-xs" : "text-base"}`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
