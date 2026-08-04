export default function StatCard({
  label,
  value,
  unit,
  accent = false,
          accent ? "text-accent" : "text-foreground"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
