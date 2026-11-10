import { useState, useMemo } from "react";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCollection, useMutation, textoErrorFirestore } from "../hooks/useFirestore";
import { SEDES, estadoInfo } from "../lib/constantes";

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DIAS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const IconLock = ({ className = "h-3.5 w-3.5" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className} aria-hidden="true">
    <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

function Metric({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="font-display mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default function Calendario() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const [sede, setSede] = useState(SEDES[0].key);
  const [view, setView] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
  const [sel, setSel] = useState(null);
  const { run, saving } = useMutation();

  const { data: bookings, error: errorBookings } = useCollection("bookings");
  const { data: services } = useCollection("services");
  const { data: blockedDates, error: errorBloqueos } = useCollection("blocked/" + sede + "/dates");
  
  const errorCarga = errorBookings || errorBloqueos;
  const blockedSet = useMemo(() => new Set((blockedDates || []).map((d) => d.id)), [blockedDates]);

  const nombreServicio = (id) => (services?.find((s) => s.id === id) || {}).nombre || id || "—";

  const confirmadasPorDia = useMemo(() => {
    const map = {};
    (bookings || []).forEach((b) => {
      if (b.sede !== sede || b.estado !== "confirmada") return;
      const f = b.fecha?.toDate ? b.fecha.toDate() : null;
      if (!f) return;
      const k = f.toISOString().slice(0, 10);
      if (!map[k]) map[k] = [];
      map[k].push(b);
    });
    return map;
  }, [bookings, sede]);

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  const bloqueadaSel = sel ? blockedSet.has(iso(sel)) : false;
  const personasDe = (b) => (b?.servicioBase === "grupo" ? 2 : 1);

  const ymView = `${year}-${String(month + 1).padStart(2, "0")}`;
  const reservasMes = (bookings || []).filter(
    (b) => b.sede === sede && b.estado === "confirmada" &&
    (b.fecha?.toDate ? b.fecha.toDate().toISOString().slice(0, 7) : "") === ymView
  );
  const totalReservasMes = reservasMes.length;
  const totalSaltosMes = reservasMes.reduce((s, b) => s + personasDe(b), 0);
  const fechasCerradasMes = [...blockedSet].filter((id) => id.startsWith(ymView + "-")).length;

  const reservasDia = sel ? confirmadasPorDia[iso(sel)] || [] : [];
  const saltosDia = reservasDia.reduce((s, b) => s + personasDe(b), 0);

  async function toggleBloqueo() {
    if (!sel) return;
    const ref = doc(db, "blocked", sede, "dates", iso(sel));
    if (bloqueadaSel) await run(() => deleteDoc(ref), "Fecha abierta");
    else await run(() => setDoc(ref, { bloqueada: true, createdAt: serverTimestamp() }), "Fecha cerrada");
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">Calendario</h1>
        <select value={sede} onChange={(e) => { setSede(e.target.value); setSel(null); }}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-[#008427]">
          {SEDES.map((s) => <option key={s.key} value={s.key}>{s.nombre}</option>)}
        </select>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Disponibilidad por sede: abre o cierra fechas a mano. Los días con reservas pagadas aparecen marcados.
      </p>

      {errorCarga && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          {textoErrorFirestore(errorCarga)} Lo que ves puede estar incompleto: no cierres ni abras fechas hasta recargar.
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Metric label="Reservas del mes" value={totalReservasMes} />
        <Metric label="Saltos pagados" value={totalSaltosMes} />
        <Metric label="Fechas cerradas" value={fechasCerradasMes} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Calendario */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-display text-base font-bold text-slate-900">{MESES[month]} {year}</span>
            <div className="flex gap-2">
              <button onClick={() => setView(new Date(year, month - 1, 1))} aria-label="Mes anterior" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-[#008427] hover:text-[#008427]">‹</button>
              <button onClick={() => setView(new Date(year, month + 1, 1))} aria-label="Mes siguiente" className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-[#008427] hover:text-[#008427]">›</button>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
            {DIAS.map((d) => <div key={d} className="text-xs font-semibold uppercase text-slate-400">{d}</div>)}
            {cells.map((date, i) => {
              if (!date) return <div key={`e${i}`} />;
              const k = iso(date);
              const past = date < hoy;
              const isSel = sel && iso(sel) === k;
              const cerrada = blockedSet.has(k);
              const esHoy = k === iso(hoy);
              const n = (confirmadasPorDia[k] || []).length;

              let cellCls;
              if (isSel) cellCls = "bg-[#008427] font-bold text-white shadow-md shadow-emerald-900/30";
              else if (past) cellCls = "text-slate-300 cursor-not-allowed";
              else if (cerrada) cellCls = "bg-red-50 text-red-600 hover:bg-red-100";
              else cellCls = "bg-slate-50 text-slate-700 hover:bg-emerald-50";
              const ringCls = esHoy && !isSel ? " ring-1 ring-inset ring-emerald-500/60" : "";
              const estado = cerrada ? ", cerrada" : past ? ", fecha pasada" : "";
              const conReservas = n > 0 ? `, ${n} reserva(s) pagada(s)` : "";

              return (
                <button key={k} disabled={past} onClick={() => setSel(date)}
                  aria-label={`${date.getDate()} de ${MESES[month]} ${year}${estado}${conReservas}`}
                  aria-pressed={!!isSel}
                  className={`flex aspect-square flex-col justify-between rounded-2xl p-2 text-left transition ${cellCls}${ringCls}`}>
                  <span className="flex items-center justify-between text-sm leading-none">
                    <span>{date.getDate()}</span>
                    {cerrada && !isSel && <IconLock />}
                  </span>
                  {n > 0 && (
                    <span className={`ml-auto flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                      isSel ? "bg-white text-[#008427]" : "bg-slate-900 text-white"
                    }`}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500 pt-4 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold text-white">N</span>
              reservas pagadas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-red-50 ring-1 ring-inset ring-red-300" /> fecha cerrada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-md bg-[#008427]" /> seleccionado
            </span>
          </div>
        </div>

        {/* Panel del día */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {!sel ? (
            <p className="text-sm text-slate-400">Selecciona una fecha del calendario.</p>
          ) : (
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                {sel.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
              </h2>
              <p className="text-xs text-slate-400">{SEDES.find((s) => s.key === sede)?.nombre}</p>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/60">
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span>Estado:</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    bloqueadaSel ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {bloqueadaSel ? "Cerrada" : "Disponible"}
                  </span>
                </div>
                <button onClick={toggleBloqueo} disabled={saving}
                  className={`mt-3 w-full rounded-2xl px-4 py-3 text-sm font-bold text-white disabled:opacity-50 transition shadow-md ${
                    bloqueadaSel ? "bg-[#008427] hover:bg-[#00661e]" : "bg-red-600 hover:bg-red-700"
                  }`}>
                  {bloqueadaSel ? "Abrir fecha" : "Cerrar fecha"}
                </button>
              </div>

              <div className="mt-6 flex gap-8 border-t border-slate-100 pt-4">
                <div>
                  <p className="font-display text-2xl font-bold text-slate-900">{saltosDia}</p>
                  <p className="text-xs text-slate-500">saltos</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-slate-900">{reservasDia.length}</p>
                  <p className="text-xs text-slate-500">reservas</p>
                </div>
              </div>

              <div className="mt-6">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Reservas pagadas</p>
                {reservasDia.length === 0 ? (
                  <p className="text-sm text-slate-400">Sin reservas pagadas este día.</p>
                ) : (
                  <ul className="space-y-3">
                    {reservasDia.map((r) => (
                      <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                        <p className="text-sm font-bold text-slate-900">{r.cliente?.nombre || "—"}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-500">{nombreServicio(r.servicioBase)} · {personasDe(r)} pers</span>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${estadoInfo(r.estado).color}`}>
                            {estadoInfo(r.estado).label}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}