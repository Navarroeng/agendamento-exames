"use client";

const SERIES = [
  {
    key: "favoraveis" as const,
    label: "Favoráveis",
    color: "#22c55e",
    text: "text-[#166534]",
  },
  {
    key: "atencao" as const,
    label: "Em atenção",
    color: "#eab308",
    text: "text-[#854d0e]",
  },
  {
    key: "desfavoraveis" as const,
    label: "Desfavoráveis",
    color: "#f43f5e",
    text: "text-[#9f1239]",
  },
];

export function PortalGraficoResultadoGeral({
  favoraveis,
  atencao,
  desfavoraveis,
}: {
  favoraveis: number;
  atencao: number;
  desfavoraveis: number;
}) {
  const valores = {
    favoraveis,
    atencao,
    desfavoraveis,
  };
  const total = favoraveis + atencao + desfavoraveis;
  const max = Math.max(1, favoraveis, atencao, desfavoraveis);

  return (
    <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-[minmax(0,14rem)_1fr]">
      <Donut
        favoraveis={favoraveis}
        atencao={atencao}
        desfavoraveis={desfavoraveis}
        total={total}
      />
      <ul className="space-y-3">
        {SERIES.map((s) => {
          const valor = valores[s.key];
          const pct = total === 0 ? 0 : Math.round((valor / max) * 100);
          return (
            <li key={s.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className={`text-sm font-semibold ${s.text}`}>
                  {s.label}
                </span>
                <span
                  className={`text-xl font-semibold tabular-nums tracking-tight ${s.text}`}
                >
                  {valor}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#eef2f7]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${valor === 0 ? 0 : Math.max(pct, 6)}%`,
                    backgroundColor: s.color,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Donut({
  favoraveis,
  atencao,
  desfavoraveis,
  total,
}: {
  favoraveis: number;
  atencao: number;
  desfavoraveis: number;
  total: number;
}) {
  const size = 168;
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;

  const parts =
    total === 0
      ? []
      : [
          { color: "#22c55e", value: favoraveis },
          { color: "#eab308", value: atencao },
          { color: "#f43f5e", value: desfavoraveis },
        ].filter((p) => p.value > 0);

  let offset = 0;

  return (
    <div className="flex justify-center">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Resultado geral: ${favoraveis} favoráveis, ${atencao} em atenção, ${desfavoraveis} desfavoráveis`}
      >
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#eef2f7"
          strokeWidth={stroke}
        />
        {parts.map((part) => {
          const len = (part.value / total) * c;
          const dash = `${len} ${c - len}`;
          const el = (
            <circle
              key={part.color}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={part.color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += len;
          return el;
        })}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          className="fill-[#0b1f4d]"
          style={{ fontSize: 28, fontWeight: 650 }}
        >
          {total}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-[#64748b]"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          categorias
        </text>
      </svg>
    </div>
  );
}
