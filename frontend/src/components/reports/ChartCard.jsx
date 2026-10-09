import React, { useState } from "react";
import { Table2, BarChart3 } from "lucide-react";
import Button from "../ui/Button";

// Contenedor de gráfica con alternativa accesible "Ver como tabla"
export default function ChartCard({ title, subtitle, children, table, className = "" }) {
  const [asTable, setAsTable] = useState(false);
  return (
    <section className={`card p-4 min-w-0 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[14.5px] sm:text-[14px] font-semibold">{title}</h2>
          {subtitle && <p className="text-[12.5px] text-ink2 mt-0.5">{subtitle}</p>}
        </div>
        {table && (
          <Button size="sm" icon={asTable ? BarChart3 : Table2} onClick={() => setAsTable((v) => !v)} aria-pressed={asTable} className="flex-none">
            {asTable ? "Ver gráfica" : "Ver como tabla"}
          </Button>
        )}
      </div>
      {asTable && table ? (
        <table className="w-full text-[13px] num">
          <thead><tr>{table.head.map((h) => <th key={h} className="text-left font-semibold text-ink2 bg-surface2 px-2.5 py-2 border-b border-line2">{h}</th>)}</tr></thead>
          <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-2.5 py-2 border-b border-line2">{c}</td>)}</tr>)}</tbody>
        </table>
      ) : children}
    </section>
  );
}
