import { useState, useEffect } from "react";
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCollection, useMutation } from "../hooks/useFirestore";
import { subirImagen, etiquetaFase, textoErrorSubida } from "../lib/upload";
import { SERVICES_SEED, money, slugId, slugIdVivo } from "../lib/constantes";
import { Icono } from "../components/Iconos.jsx";

const TIPOS = [
  { key: "base", label: "Paquete base (salto)" },
  { key: "fotos", label: "Fotos / video" },
];

export default function Servicios() {
  const { data: services, error } = useCollection("services");
  const { run, saving } = useMutation();
  const [editar, setEditar] = useState(null);

  async function sembrar() {
    if (!window.confirm("¿Crear el catálogo inicial? Esto escribe los 6 servicios semilla.")) return;
    const batch = writeBatch(db);
    SERVICES_SEED.forEach(({ id, ...resto }) => batch.set(doc(db, "services", id), resto));
    await run(() => batch.commit(), "Catálogo de servicios creado");
  }

  async function guardar(item) {
    const { id, ...resto } = item;
    const ok = await run(() => setDoc(doc(db, "services", id), resto, { merge: true }), "Servicio guardado");
    if (ok) setEditar(null);
  }

  const lista = [...(services || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return (
    <div className="p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Servicios</h1>
        <button onClick={() => setEditar({ nuevo: true, id: "", nombre: "", descripcion: "", precio: 0, tipo: "base", foto: "", activo: true, orden: lista.length + 1 })}
          className="rounded-2xl bg-[#008427] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] transition">
          + Nuevo servicio
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Paquetes de salto y de fotos. Sin borrado: para retirar uno, desactívalo.
      </p>

      {error && <Aviso>No se pudo cargar. Verifica la conexión con Firebase.</Aviso>}

      {!error && services && services.length === 0 && (
        <SeedBox onSeed={sembrar} saving={saving}
          texto="No hay servicios. Crea el catálogo inicial de Vuela Club (2 paquetes base + 4 de fotos)." />
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((s) => (
          <div key={s.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start gap-4">
                {s.foto ? (
                  <img src={s.foto} alt={s.nombre} className="h-16 w-16 rounded-2xl object-cover border border-slate-200 shrink-0" />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-[#008427] shrink-0"><Icono name="paracaidas" className="h-7 w-7" /></div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-bold text-slate-900">{s.nombre}</p>
                  <p className="font-display text-lg font-extrabold text-[#008427] mt-0.5">{money(s.precio)}</p>
                  <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                    s.activo !== false ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                  }`}>
                    {s.tipo === "base" ? "Base" : "Fotos"} · {s.activo !== false ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={() => setEditar({ ...s })}
              className="mt-6 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#008427] hover:text-[#008427] transition">
              Editar
            </button>
          </div>
        ))}
      </div>

      {editar && (
        <ModalServicio item={editar} onClose={() => setEditar(null)} onGuardar={guardar} saving={saving} />
      )}
    </div>
  );
}

function ModalServicio({ item, onClose, onGuardar, saving }) {
  const [f, setF] = useState(item);
  const [estadoFoto, setEstadoFoto] = useState(null);
  const [errorFoto, setErrorFoto] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const subiendoFoto = !!estadoFoto && estadoFoto.fase !== "listo";
  const set = (k, v) => { setF({ ...f, [k]: v }); if (err) setErr(""); };

  async function onFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorFoto("");
    setEstadoFoto({ fase: "preparando" });
    try {
      const url = await subirImagen(file, "servicios", setEstadoFoto);
      setF((prev) => ({ ...prev, foto: url }));
    } catch (err) {
      console.error("[Servicios] subir imagen falló:", err);
      setEstadoFoto(null);
      setErrorFoto(textoErrorSubida(err));
    }
    e.target.value = "";
  }

  function intentarGuardar() {
    const id = slugId(f.id);
    if (!id) {
      setErr("El ID no es válido. Usa letras, números o guiones.");
      return;
    }
    if (Number(f.precio) < 0) {
      setErr("El precio no puede ser negativo.");
      return;
    }
    setErr("");
    onGuardar({ ...f, id });
  }

  const valido = f.id.trim() && f.nombre.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-servicio-titulo" className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-servicio-titulo" className="font-display text-xl font-extrabold text-slate-900">{f.nuevo ? "Nuevo servicio" : "Editar servicio"}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <Icono name="equis" className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <Campo label="ID (sin espacios)">
            <input value={f.id} disabled={!f.nuevo} onChange={(e) => set("id", slugIdVivo(e.target.value))} className={inp + (f.nuevo ? "" : " bg-slate-50 text-slate-500")} />
          </Campo>
          <Campo label="Nombre"><input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} className={inp} /></Campo>
          <Campo label="Descripción"><textarea value={f.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} rows={2} className={inp} /></Campo>
          <div className="grid grid-cols-2 gap-4">
            <Campo label="Precio (COP)"><input type="number" min={0} value={f.precio} onChange={(e) => set("precio", Number(e.target.value))} className={inp} /></Campo>
            <Campo label="Tipo">
              <select value={f.tipo} onChange={(e) => set("tipo", e.target.value)} className={inp}>
                {TIPOS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </Campo>
          </div>
          <Campo label="Foto">
            <p className="mb-2 text-xs text-slate-500">
              Una foto que muestre la experiencia del paquete. La optimizamos por ti.
            </p>
            <div className="flex items-center gap-3">
              {f.foto && <img src={f.foto} alt="" className="h-12 w-12 rounded-xl object-cover border border-slate-200" />}
              <input
                type="file"
                accept="image/*,.heic,.heif"
                onChange={onFoto}
                className="text-xs text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-[#008427] file:px-4 file:py-2.5 file:text-xs file:font-bold file:text-white hover:file:bg-[#00661e]"
              />
            </div>
            {estadoFoto && <EstadoFoto estado={estadoFoto} />}
            {errorFoto && (
              <p role="alert" className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">
                {errorFoto}
              </p>
            )}
          </Campo>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 pt-2 cursor-pointer">
            <input type="checkbox" checked={f.activo !== false} onChange={(e) => set("activo", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#008427] focus:ring-[#008427]" />
            Activo en la plataforma
          </label>
        </div>
        {err && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{err}</p>}
        <button onClick={intentarGuardar} disabled={!valido || saving || subiendoFoto}
          className="mt-6 w-full rounded-2xl bg-[#008427] py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] disabled:opacity-50 transition">
          {saving ? "Guardando…" : "Guardar servicio"}
        </button>
      </div>
    </div>
  );
}

const inp = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#008427]";

function EstadoFoto({ estado }) {
  const pct = estado?.fase === "subiendo" ? (estado.pct ?? 0) : null;
  return (
    <div className="mt-3" aria-live="polite">
      <p className="text-xs text-slate-500">{etiquetaFase(estado) || "Preparando tu foto…"}</p>
      {pct !== null && (
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Subiendo foto"
        >
          <div className="h-full bg-[#008427] transition-[width] duration-150" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">{label}</span>
      {children}
    </label>
  );
}
function Aviso({ children }) {
  return <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{children}</div>;
}
export function SeedBox({ onSeed, saving, texto }) {
  return (
    <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 shadow-sm">
      <p className="text-sm text-emerald-900 leading-relaxed">{texto}</p>
      <button onClick={onSeed} disabled={saving}
        className="mt-4 rounded-2xl bg-[#008427] px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] disabled:opacity-50 transition">
        Crear catálogo inicial
      </button>
    </div>
  );
}