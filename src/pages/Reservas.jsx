import { useState, useEffect, useMemo, useRef } from "react";
import { collection, doc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { useCollection, useMutation } from "../hooks/useFirestore";
import { ESTADOS, SEDES, PAGO_ESTADOS, estadoInfo, sedeNombre, money } from "../lib/constantes";
import { Icono } from "../components/Iconos.jsx";

const POR_PAGINA = 20;

const fmtFechaSalto = (ts) =>
  ts?.toDate ? ts.toDate().toLocaleDateString("es-CO", { timeZone: "UTC" }) : "—";
const fmtFecha = (ts) => (ts?.toDate ? ts.toDate().toLocaleDateString("es-CO") : "—");
const fmtFechaHora = (ts) =>
  ts?.toDate ? ts.toDate().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" }) : "—";

const linkWa = (digitos) => `https://wa.me/${digitos.startsWith("57") && digitos.length >= 12 ? digitos : "57" + digitos}`;

export default function Reservas() {
  const { data: bookings, error } = useCollection("bookings");
  const { data: services } = useCollection("services");
  const { data: additionals } = useCollection("additionals");
  const { run, saving } = useMutation();

  const [fSede, setFSede] = useState("todas");
  const [fEstado, setFEstado] = useState("todos");
  const [fDesde, setFDesde] = useState("");
  const [fHasta, setFHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState(null);
  const [modal, setModal] = useState(false);

  const filtradas = useMemo(() => {
    let lista = [...(bookings || [])];
    lista.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    return lista.filter((r) => {
      if (fSede !== "todas" && r.sede !== fSede) return false;
      if (fEstado !== "todos" && r.estado !== fEstado) return false;
      const f = r.fecha?.toDate ? r.fecha.toDate() : null;
      if (fDesde && f && f < new Date(fDesde + "T00:00:00Z")) return false;
      if (fHasta && f && f > new Date(fHasta + "T23:59:59Z")) return false;
      if (busqueda.trim()) {
        const t = busqueda.toLowerCase();
        const campos = [r.numero, r.cliente?.nombre, r.cliente?.cedula, r.cliente?.telefono, r.cliente?.email]
          .join(" ").toLowerCase();
        if (!campos.includes(t)) return false;
      }
      return true;
    });
  }, [bookings, fSede, fEstado, fDesde, fHasta, busqueda]);

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const pag = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((pag - 1) * POR_PAGINA, pag * POR_PAGINA);

  async function cambiarEstado(id, estado, numero) {
    if (estado === "cancelada" && !window.confirm(`¿Cancelar la reserva ${numero || ""}? El cliente dejará de tenerla activa.`)) return;
    if (estado === "no-show" && !window.confirm(`¿Marcar la reserva ${numero || ""} como no-show (el cliente no llegó)?`)) return;
    await run(
      () => updateDoc(doc(db, "bookings", id), { estado, updatedAt: serverTimestamp() }),
      "Estado actualizado"
    );
  }
  async function guardarNota(id, notasInternas) {
    await run(
      () => updateDoc(doc(db, "bookings", id), { notasInternas, updatedAt: serverTimestamp() }),
      "Nota guardada"
    );
  }
  async function confirmarPagoWhatsapp(id, numero) {
    if (!window.confirm(`¿Confirmar el pago de la reserva ${numero || ""}? Quedará confirmada.`)) return;
    await run(
      () => updateDoc(doc(db, "bookings", id), {
        estado: "confirmada",
        "pago.estado": "aprobado",
        "pago.confirmadoPor": auth.currentUser?.uid || null,
        "pago.confirmadoAt": serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      "Pago confirmado"
    );
  }
  async function crearManual(payload) {
    const ok = await run(
      () => addDoc(collection(db, "bookings"), {
        ...payload,
        numero: "VC-M" + Date.now().toString().slice(-5),
        estado: "pendiente",
        origen: "manual",
        pago: { metodo: "manual", estado: "iniciado" },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
      "Reserva manual creada"
    );
    if (ok) setModal(false);
  }

  function exportarCSV() {
    const filas = [["Numero", "Fecha", "Sede", "Cliente", "Cedula", "Telefono", "Total", "Estado"]];
    filtradas.forEach((r) => {
      filas.push([
        r.numero || "", fmtFechaSalto(r.fecha) === "—" ? "" : fmtFechaSalto(r.fecha),
        sedeNombre(r.sede), r.cliente?.nombre || "", r.cliente?.cedula || "",
        r.cliente?.telefono || "", r.total || 0, r.estado || "",
      ]);
    });
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservas-vuelaclub-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold text-slate-900">Reservas</h1>
        <div className="flex gap-2">
          <button onClick={exportarCSV} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#008427] hover:text-[#008427] transition">
            Exportar CSV
          </button>
          <button onClick={() => setModal(true)} className="rounded-2xl bg-[#008427] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] transition">
            + Nueva reserva manual
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No se pudieron cargar las reservas. Verifica la conexión con Firebase.
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <input
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          placeholder="Buscar nº, nombre, cédula, teléfono…"
          className="w-72 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#008427]"
        />
        <select value={fSede} onChange={(e) => { setFSede(e.target.value); setPagina(1); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#008427]">
          <option value="todas">Todas las sedes</option>
          {SEDES.map((s) => <option key={s.key} value={s.key}>{s.nombre}</option>)}
        </select>
        <select value={fEstado} onChange={(e) => { setFEstado(e.target.value); setPagina(1); }} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#008427]">
          <option value="todos">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
        </select>
        <input type="date" value={fDesde} onChange={(e) => { setFDesde(e.target.value); setPagina(1); }} aria-label="Filtrar desde fecha" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-[#008427]" />
        <input type="date" value={fHasta} onChange={(e) => { setFHasta(e.target.value); setPagina(1); }} aria-label="Filtrar hasta fecha" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 outline-none focus:border-[#008427]" />
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4">Nº</th>
              <th className="px-6 py-4">Fecha salto</th>
              <th className="px-6 py-4">Sede</th>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bookings === null ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Cargando…</td></tr>
            ) : visibles.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Sin reservas que coincidan.</td></tr>
            ) : (
              visibles.map((r) => (
                <FilaReserva
                  key={r.id}
                  r={r}
                  services={services || []}
                  additionals={additionals || []}
                  abierta={abierta === r.id}
                  onToggle={() => setAbierta(abierta === r.id ? null : r.id)}
                  onEstado={cambiarEstado}
                  onNota={guardarNota}
                  onConfirmarPago={confirmarPagoWhatsapp}
                  saving={saving}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500 px-2">
        <span>{filtradas.length} reserva(s)</span>
        <div className="flex items-center gap-3">
          <button disabled={pag <= 1} onClick={() => setPagina(pag - 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:border-[#008427] transition">‹</button>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Página {pag} de {totalPaginas}</span>
          <button disabled={pag >= totalPaginas} onClick={() => setPagina(pag + 1)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white disabled:opacity-40 hover:border-[#008427] transition">›</button>
        </div>
      </div>

      {modal && (
        <ModalManual
          services={services || []}
          additionals={additionals || []}
          onClose={() => setModal(false)}
          onGuardar={crearManual}
          saving={saving}
        />
      )}
    </div>
  );
}

function FilaReserva({ r, services, additionals, abierta, onToggle, onEstado, onNota, onConfirmarPago, saving }) {
  const [nota, setNota] = useState(r.notasInternas || "");
  const notaServidor = useRef(r.notasInternas || "");
  useEffect(() => {
    const nueva = r.notasInternas || "";
    if (nueva !== notaServidor.current) {
      setNota((actual) => (actual === notaServidor.current ? nueva : actual));
      notaServidor.current = nueva;
    }
  }, [r.notasInternas]);
  const wa = (r.cliente?.telefono || "").replace(/\D/g, "");
  const nombreServicio = (id) => (services.find((s) => s.id === id) || {}).nombre || id || "—";
  const nombreAdic = (id) => (additionals.find((a) => a.id === id) || {}).nombre || id;

  return (
    <>
      <tr
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        tabIndex={0}
        aria-expanded={abierta}
        className="cursor-pointer hover:bg-slate-50/80 transition focus-visible:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#008427]"
      >
        <td className="px-6 py-4 font-bold text-slate-900">{r.numero || "—"}</td>
        <td className="px-6 py-4 text-slate-600">
          <span className="block font-semibold">{fmtFechaSalto(r.fecha)}</span>
          <span className="block text-xs text-slate-400">Reservada: {fmtFecha(r.createdAt)}</span>
        </td>
        <td className="px-6 py-4 text-slate-600">{sedeNombre(r.sede)}</td>
        <td className="px-6 py-4 font-semibold text-slate-800">{r.cliente?.nombre || "—"}</td>
        <td className="px-6 py-4 font-display font-bold text-[#008427]">{money(r.total)}</td>
        <td className="px-6 py-4">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${estadoInfo(r.estado).color}`}>
            {estadoInfo(r.estado).label}
          </span>
        </td>
      </tr>
      {abierta && (
        <tr className="bg-slate-50/80">
          <td colSpan={6} className="px-6 py-6">
            <div className="mb-6 flex flex-wrap gap-x-8 gap-y-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-xs">
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Icono name="paracaidas" className="h-4 w-4 text-[#008427]" />
                <span className="font-bold text-slate-900">Fecha del salto:</span> {fmtFechaSalto(r.fecha)}
              </p>
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Icono name="calendario" className="h-4 w-4 text-[#008427]" />
                <span className="font-bold text-slate-900">Reservada el:</span> {fmtFechaHora(r.createdAt)}
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Cliente</p>
                <p className="font-bold text-slate-900">{r.cliente?.nombre}</p>
                <p className="text-xs text-slate-500 mt-1">CC {r.cliente?.cedula || "—"} · {r.cliente?.edad ?? "—"} años</p>
                <p className="text-xs text-slate-500 mt-1">{r.cliente?.telefono || "—"}</p>
                <p className="text-xs text-slate-500 mt-1">{r.cliente?.email || "—"}</p>
                {wa && (
                  <a href={linkWa(wa)} target="_blank" rel="noreferrer"
                     className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-sm">
                    WhatsApp al cliente
                  </a>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Detalle</p>
                <p className="text-xs text-slate-600 mb-1.5"><strong className="text-slate-800">Base:</strong> {nombreServicio(r.servicioBase)}</p>
                <p className="text-xs text-slate-600 mb-1.5"><strong className="text-slate-800">Fotos:</strong> {r.servicioFotos ? nombreServicio(r.servicioFotos) : "—"}</p>
                <p className="text-xs text-slate-600 mb-1.5"><strong className="text-slate-800">Extras:</strong> {(r.adicionales || []).map(nombreAdic).join(", ") || "ninguno"}</p>
                <p className="text-xs text-slate-600 mb-2"><strong className="text-slate-800">Pago:</strong> {r.pago?.metodo || "—"} · {PAGO_ESTADOS[r.pago?.estado]?.label || r.pago?.estado || "—"}</p>
                <p className="text-sm font-display font-bold text-[#008427] pt-2 border-t border-slate-100">Total: {money(r.total)}</p>
                {r.pago?.tipo === "abono" && (
                  <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2.5">
                    <p className="text-xs font-bold text-amber-900">Reserva con abono (50%)</p>
                    <p className="text-xs text-amber-700 mt-0.5">Pagado: {money(r.pago?.montoACobrar ?? 0)}</p>
                    <p className="text-xs font-bold text-amber-900 mt-0.5">Cobrar en sede: {money(r.pago?.saldoPendiente ?? 0)}</p>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Estado y Gestión</p>
                {r.estado === "pendiente" && r.pago?.metodo === "whatsapp" && (
                  <button
                    onClick={() => onConfirmarPago(r.id, r.numero)}
                    disabled={saving}
                    className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#008427] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#00661e] disabled:opacity-50 transition"
                  >
                    <Icono name="check" className="h-4 w-4" /> Confirmar pago (WhatsApp)
                  </button>
                )}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {ESTADOS.map((e) => (
                    <button key={e.key} onClick={() => onEstado(r.id, e.key, r.numero)} disabled={saving}
                      className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                        r.estado === e.key ? e.color + " ring-2 ring-slate-400 shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}>
                      {e.label}
                    </button>
                  ))}
                </div>
                <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Notas internas</p>
                <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#008427]" />
                <button onClick={() => onNota(r.id, nota)} disabled={saving}
                  className="mt-2 w-full rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition">
                  Guardar nota
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ModalManual({ services, additionals, onClose, onGuardar, saving }) {
  const bases = services.filter((s) => s.tipo === "base" && s.activo !== false);
  const fotos = services.filter((s) => s.tipo === "fotos" && s.activo !== false);
  const [f, setF] = useState({
    nombre: "", telefono: "", cedula: "", email: "", edad: "",
    sede: SEDES[0].key, fecha: "", servicioBase: "", servicioFotos: "", adicionales: [],
  });
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const total =
    (services.find((s) => s.id === f.servicioBase)?.precio || 0) +
    (services.find((s) => s.id === f.servicioFotos)?.precio || 0) +
    f.adicionales.reduce((s, id) => s + (additionals.find((a) => a.id === id)?.precio || 0), 0);

  const set = (k, v) => { setF({ ...f, [k]: v }); if (aviso) setAviso(""); };
  const valido = f.nombre && f.telefono && f.cedula && f.fecha && f.servicioBase;

  function guardar() {
    const telDigitos = f.telefono.replace(/\D/g, "");
    if (telDigitos.length < 7) { setAviso("Revisa el teléfono: escríbelo completo, con todos sus dígitos."); return; }
    if (f.edad) {
      const edadNum = Number(f.edad);
      if (!Number.isInteger(edadNum) || edadNum < 1 || edadNum > 110) { setAviso("Revisa la edad: escríbela en números (ej. 25)."); return; }
      if (edadNum < 16) { setAviso("El salto requiere mínimo 16 años. Verifica la edad antes de crear la reserva."); return; }
    }
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setAviso("Revisa el correo: no parece una dirección válida."); return; }
    onGuardar({
      cliente: {
        nombre: f.nombre, telefono: f.telefono, cedula: f.cedula,
        email: f.email, edad: f.edad ? Number(f.edad) : null,
      },
      sede: f.sede,
      fecha: new Date(f.fecha),
      servicioBase: f.servicioBase,
      servicioFotos: f.servicioFotos || null,
      adicionales: f.adicionales,
      total,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-manual-titulo" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-manual-titulo" className="font-display text-xl font-extrabold text-slate-900">Nueva reserva manual</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <Icono name="equis" className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Nombre"><input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} className={inp} /></Campo>
            <Campo label="Teléfono"><input value={f.telefono} onChange={(e) => set("telefono", e.target.value)} className={inp} /></Campo>
            <Campo label="Cédula"><input value={f.cedula} onChange={(e) => set("cedula", e.target.value)} className={inp} /></Campo>
            <Campo label="Edad"><input type="number" value={f.edad} onChange={(e) => set("edad", e.target.value)} className={inp} /></Campo>
          </div>
          <Campo label="Email" full><input value={f.email} onChange={(e) => set("email", e.target.value)} className={inp} /></Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Sede">
              <select value={f.sede} onChange={(e) => set("sede", e.target.value)} className={inp}>
                {SEDES.map((s) => <option key={s.key} value={s.key}>{s.nombre}</option>)}
              </select>
            </Campo>
            <Campo label="Fecha"><input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} className={inp} /></Campo>
          </div>
          <Campo label="Paquete base" full>
            <select value={f.servicioBase} onChange={(e) => set("servicioBase", e.target.value)} className={inp}>
              <option value="">Selecciona…</option>
              {bases.map((s) => <option key={s.id} value={s.id}>{s.nombre} — {money(s.precio)}</option>)}
            </select>
          </Campo>
          <Campo label="Fotos / video" full>
            <select value={f.servicioFotos} onChange={(e) => set("servicioFotos", e.target.value)} className={inp}>
              <option value="">Sin fotos</option>
              {fotos.map((s) => <option key={s.id} value={s.id}>{s.nombre} — {money(s.precio)}</option>)}
            </select>
          </Campo>
        </div>
        <p className="mt-4 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Adicionales</p>
        <div className="flex flex-wrap gap-2">
          {additionals.filter((a) => a.activo !== false).map((a) => {
            const on = f.adicionales.includes(a.id);
            return (
              <button key={a.id} type="button"
                onClick={() => set("adicionales", on ? f.adicionales.filter((x) => x !== a.id) : [...f.adicionales, a.id])}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${on ? "bg-[#008427] text-white shadow-xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                {a.nombre}
              </button>
            );
          })}
        </div>
        {aviso && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">{aviso}</p>
        )}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="font-display text-base font-bold text-slate-900">Total: <span className="text-[#008427]">{money(total)}</span></span>
          <button onClick={guardar} disabled={!valido || saving}
            className="rounded-2xl bg-[#008427] px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] disabled:opacity-50 transition">
            {saving ? "Guardando…" : "Crear reserva"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#008427]";
function Campo({ label, children, full }) {
  return (
    <label className={`block ${full ? "col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      {children}
    </label>
  );
}