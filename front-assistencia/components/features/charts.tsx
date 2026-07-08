type MonthlyPoint = {
  month: string;
  value: number;
};

export function LineChartCard({ data }: { data: MonthlyPoint[] }) {
  const maxValue = Math.max(...data.map((item) => Number(item.value) || 0), 1);
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : (index / (data.length - 1)) * 100;
    const y = 96 - ((Number(item.value) || 0) / maxValue) * 84;
    return `${x},${y}`;
  });

  return (
    <section className="rounded border bg-card p-5 shadow-subtle">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Vendas e serviços mensais</h2>
          <p className="text-sm text-muted-foreground">Volume consolidado dos últimos 6 meses</p>
        </div>
      </div>
      <div className="h-64">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
          <defs>
            <linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#DC2626" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#DC2626" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polyline fill="none" stroke="hsl(var(--border))" strokeWidth="0.4" points="0,80 100,80" />
          {points.length ? (
            <>
              <polygon fill="url(#line-fill)" points={`0,100 ${points.join(" ")} 100,100`} />
              <polyline fill="none" stroke="#DC2626" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" points={points.join(" ")} />
            </>
          ) : null}
        </svg>
      </div>
      <div className="mt-3 grid grid-cols-6 text-center text-xs text-muted-foreground">
        {data.map((item) => (
          <span key={item.month}>{item.month}</span>
        ))}
      </div>
    </section>
  );
}

export function DonutChartCard({ counts }: { counts: Array<{ label: string; value: number; color: string }> }) {
  const total = counts.reduce((sum, item) => sum + item.value, 0);
  let current = 0;
  const gradient = total
    ? counts
        .map((item) => {
          const start = current;
          current += (item.value / total) * 100;
          return `${item.color} ${start}% ${current}%`;
        })
        .join(", ")
    : "hsl(var(--muted)) 0 100%";

  return (
    <section className="rounded border bg-card p-5 shadow-subtle">
      <h2 className="font-semibold">Status das OS</h2>
      <p className="text-sm text-muted-foreground">Distribuição operacional atual</p>
      <div className="mt-6 grid place-items-center">
        <div
          aria-label="Gráfico de rosca de status de OS"
          className="grid h-44 w-44 place-items-center rounded-full"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="grid h-24 w-24 place-items-center rounded-full bg-card text-center">
            <span className="text-2xl font-semibold">{total}</span>
            <span className="-mt-3 text-xs text-muted-foreground">OS</span>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-3">
        {counts.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm" style={{ background: item.color }} />
              {item.label}
            </span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}
