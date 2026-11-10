import { useMemo } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCollection, useMutation } from "../hooks/useFirestore";
import { SEDES, estadoInfo, sedeNombre, money } from "../lib/constantes";

export default function Dashboard() {
  const { data: bookings, error } = useCollection("bookings");
  const { run } = useMutation();

  const m = useMemo(() => calcular(bookings || []), [bookings]);

  async function cambiar(id, estado, numero) {
    if (estado === "cancelada" && !window.confirm(`¿Cancelar la reserva ${numero || ""}?`)) return;
    await run(
      () => updateDoc(doc(db, "bookings", id), { estado, updatedAt: serverTimestamp() }),
      "Reserva actualizada"
    );
  }

  return (
    <div className="p-8">
      <h1 className="font-display mb-6 text-2xl font-bold text-slate-900">Resumen</h1>

      {error && <Aviso>No se pudieron cargar las reservas. Verifica la conexión con Firebase.</Aviso>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI titulo="Reservas próximas" valor={m.proximas} />
        <KPI titulo="Ingresos del mes" valor={money(m.ingresosMes)} acento="text-[#008427]" />
        <KPI titulo="Pendientes" valor={m.pendientes} acento="text-amber-600" />
        <KPI titulo="Confirmadas" valor={m.confirmadas} acento="text-emerald-600" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel titulo="Ingresos — últimas 8 semanas">
          <BarChart semanas={m.semanas} />
        </Panel>

        <Panel titulo="Resumen por sede">
          <div className="space-y-3">
            {SEDES.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="text-slate-600 font-medium">{s.nombre}</span>
                <span className="text-slate-500">
                  <b className="text-slate-900">{m.porSede[s.key]?.n || 0}</b> reservas ·{" "}
                  {money(m.porSede[s.key]?.ingresos || 0)}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel titulo="Últimas reservas" className="mt-6">
        {bookings === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : m.ultimas.length === 0 ? (
          <p className="text-sm text-slate-400">Sin reservas todavía.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {m.ultimas.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="min-w-[160px]">
                  <p className="text-sm font-bold text-slate-900">{r.cliente?.nombre || "—"}</p>
                  <p className="text-xs text-slate-400">
                    {r.numero} · {sedeNombre(r.sede)}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoInfo(r.estado).color}`}>
                  {estadoInfo(r.estado).label}
                </span>
                <span className="font-display text-sm font-bold text-[#008427]">{money(r.total)}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => cambiar(r.id, "confirmada", r.numero)}
                    className="rounded-xl bg-[#008427] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#00661e] transition"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => cambiar(r.id, "cancelada", r.numero)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function calcular(bookings) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const mesActual = hoy.getMonth();
  const anioActual = hoy.getFullYear();
  const fechaDe = (r) => {
    const t = r.fecha?.toDate ? r.fecha.toDate() : null;
    return t ? new Date(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) : null;
  };
  const pagada = (r) => r.pago?.estado === "aprobado" || ["confirmada", "completada"].includes(r.estado);

  let proximas = 0, pendientes = 0, confirmadas = 0, ingresosMes = 0;
  const porSede = {};
  bookings.forEach((r) => {
    const f = fechaDe(r);
    if (f && f >= hoy && ["pendiente", "confirmada"].includes(r.estado)) proximas++;
    if (r.estado === "pendiente") pendientes++;
    if (r.estado === "confirmada") confirmadas++;
    if (f && f.getMonth() === mesActual && f.getFullYear() === anioActual && pagada(r)) {
      ingresosMes += r.total || 0;
    }
    if (!porSede[r.sede]) porSede[r.sede] = { n: 0, ingresos: 0 };
    porSede[r.sede].n++;
    if (pagada(r)) porSede[r.sede].ingresos += r.total || 0;
  });

  const semanas = [];
  for (let i = 7; i >= 0; i--) {
    const ini = new Date(hoy);
    ini.setDate(ini.getDate() - i * 7 - 6);
    const fin = new Date(hoy);
    fin.setDate(fin.getDate() - i * 7);
    let total = 0;
    bookings.forEach((r) => {
      const f = fechaDe(r);
      if (f && f >= ini && f <= fin && pagada(r)) total += r.total || 0;
    });
    semanas.push(total);
  }

  const ultimas = [...bookings]
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    .slice(0, 10);

  return { proximas, pendientes, confirmadas, ingresosMes, porSede, semanas, ultimas };
}

function KPI({ titulo, valor, acento = "text-slate-900" }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{titulo}</p>
      <p className={`font-display mt-1 text-3xl font-extrabold ${acento}`}>{valor}</p>
    </div>
  );
}

function Panel({ titulo, children, className = "" }) {
  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-sm ${className}`}>
      <h2 className="font-display mb-4 text-base font-bold text-slate-900">{titulo}</h2>
      {children}
    </div>
  );
}

function Aviso({ children }) {
  return (
    <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {children}
    </div>
  );
}

function BarChart({ semanas }) {
  const max = Math.max(1, ...semanas);
  return (
    <svg viewBox="0 0 320 120" className="w-full">
      {semanas.map((v, i) => {
        const h = (v / max) * 90;
        const x = 10 + i * 38;
        return (
          <g key={i}>
            <rect x={x} y={100 - h} width={26} height={h} rx={6} fill="#008427" opacity={0.85} />
            <text x={x + 13} y={114} textAnchor="middle" fontSize={8} fill="#64748b" fontWeight="600">
              S{i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}