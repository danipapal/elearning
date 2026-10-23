import type { WeekCount } from "@/types/database";

const weekFormat = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", timeZone: "UTC" });

// Barras verticales por semana (una sola serie). Cada barra muestra su valor
// al pasar el mouse o con el foco, y hay una tabla equivalente para lectores de pantalla.
export function WeekBars({ title, data }: { title: string; data: WeekCount[] }) {
  const max = Math.max(1, ...data.map((item) => item.count));
  return (
    <figure className="grid gap-3">
      <figcaption className="font-medium">{title}</figcaption>
      <div className="flex h-36 items-end gap-1.5 border-b" aria-hidden>
        {data.map((item) => (
          <div key={item.week} className="group relative flex h-full flex-1 flex-col justify-end">
            <span className="text-muted-foreground pointer-events-none mb-1 text-center text-xs tabular-nums opacity-0 group-hover:opacity-100">
              {item.count}
            </span>
            <div
              className="bg-primary group-hover:bg-primary/80 min-h-px rounded-t-[4px]"
              style={{ height: `${(item.count / max) * 100}%` }}
              title={`Semana del ${weekFormat.format(new Date(item.week))}: ${item.count}`}
            />
          </div>
        ))}
      </div>
      <div className="text-muted-foreground flex justify-between text-xs" aria-hidden>
        <span>{data[0] && weekFormat.format(new Date(data[0].week))}</span>
        <span>Esta semana</span>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Semana</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.week}>
              <td>{weekFormat.format(new Date(item.week))}</td>
              <td>{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

// Fila con barra horizontal: etiqueta, barra proporcional y valor.
export function BarRow({
  label,
  sublabel,
  value,
  max,
  display,
}: {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  display?: string;
}) {
  const width = max > 0 ? (value / max) * 100 : 0;
  return (
    <li className="grid gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 truncate">
          {label}
          {sublabel && <span className="text-muted-foreground"> · {sublabel}</span>}
        </span>
        <span className="text-muted-foreground shrink-0 tabular-nums">{display ?? value}</span>
      </div>
      <div className="bg-muted h-2 overflow-hidden rounded-full" aria-hidden>
        <div className="bg-primary h-full rounded-full" style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}
