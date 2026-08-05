"use client";

export default function CircularMeter({
  value,
  displayMin,
  displayMax,
  optimalRange,
  label,
}: {
  value: number | undefined;
  displayMin: number;
  displayMax: number;
  optimalRange: [number, number];
  label: string;
}) {
  const size = 108;
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const clampedRatio = (v: number) =>
    Math.max(0, Math.min(1, (v - displayMin) / (displayMax - displayMin)));

  const valueRatio = value !== undefined ? clampedRatio(value) : 0;
  const optLoRatio = clampedRatio(optimalRange[0]);
  const optHiRatio = clampedRatio(optimalRange[1]);

  const inRange = value !== undefined && value >= optimalRange[0] && value <= optimalRange[1];

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2b362c" strokeWidth={stroke} />
        {/* optimal-range band */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#3a4a3b"
          strokeWidth={stroke}
          strokeDasharray={`${(optHiRatio - optLoRatio) * circumference} ${circumference}`}
          strokeDashoffset={-optLoRatio * circumference}
          strokeLinecap="round"
        />
        {/* value */}
        {value !== undefined && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={inRange ? "#d4ff4f" : "#e4572e"}
            strokeWidth={stroke}
            strokeDasharray={`${Math.max(valueRatio * circumference, 2)} ${circumference}`}
            strokeLinecap="round"
          />
        )}
      </svg>
      <div className="-mt-[70px] flex flex-col items-center">
        <span className="stat-value text-xl font-medium text-foreground">
          {value !== undefined ? `${Math.round(value)}\u00b0` : "\u2014"}
        </span>
      </div>
      <div className="mt-[38px] text-center text-[11px] text-muted">
        {label}
        <div>
          Expected: {optimalRange[0]}°–{optimalRange[1]}°
        </div>
      </div>
    </div>
  );
}
