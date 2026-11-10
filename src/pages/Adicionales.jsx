import { useState, useEffect } from "react";
import { doc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCollection, useMutation } from "../hooks/useFirestore";
import { ADDITIONALS_SEED, money, slugId, slugIdVivo } from "../lib/constantes";
import { SeedBox } from "./Servicios";
import { Icono } from "../components/Iconos.jsx";

export default function Adicionales() {
  const { data: additionals, error } = useCollection("additionals");
  const { run, saving } = useMutation();
  const [editar, setEditar] = useState(null);

  async function sembrar() {
    if (!window.confirm("¿Crear los adicionales iniciales? Esto escribe los 6 extras semilla.")) return;
    const batch = writeBatch(db);
    ADDITIONALS_SEED.forEach(({ id, ...resto }) => batch.set(doc(db, "additionals", id), resto));
    await run(() => batch.commit(), "Adicionales creados");
  }

  async function guardar(item) {
    const { id, ...resto } = item;
    const ok = await run(() => setDoc(doc(db, "additionals", id), resto, { merge: true }), "Adicional guardado");
    if (ok) setEditar(null);
  }

  const lista = [...(additionals || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return (
    <div className="p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Adicionales</h1>
        <button onClick={() => setEditar({ nuevo: true, id: "", nombre: "", descripcion: "", precio: 0, unidad: "", activo: true, orden: lista.length + 1 })}
          className="rounded-xl bg-[#008427] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] transition-all">
          + Nuevo adicional
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">Extras especiales: decoración, champagne, transporte, etc.</p>

      {error && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No se pudo cargar. Verifica la conexión con Firebase.
        </div>
      )}

      {!error && additionals && additionals.length === 0 && (
        <SeedBox onSeed={sembrar} saving={saving} texto="No hay adicionales. Crea los 6 extras de Vuela Club." />
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {lista.length === 0 ? (
          <p className="px-6 py-8 text-sm text-slate-400">Sin adicionales.</p>
        ) : (
          lista.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 last:border-0 hover:bg-slate-50/50 transition">
              <div>
                <p className="font-bold text-slate-900">{a.nombre}</p>
                <p className="text-xs text-slate-400">{a.unidad || "precio único"}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-display text-base font-bold text-[#008427]">{money(a.precio)}</span>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                  a.activo !== false ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                }`}>
                  {a.activo !== false ? "Activo" : "Inactivo"}
                </span>
                <button onClick={() => setEditar({ ...a })}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:border-[#008427] hover:text-[#008427] transition">
                  Editar
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editar && <ModalAdicional item={editar} onClose={() => setEditar(null)} onGuardar={guardar} saving={saving} />}
    </div>
  );
}

function ModalAdicional({ item, onClose, onGuardar, saving }) {
  const [f, setF] = useState(item);
  const [err, setErr] = useState("");
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const set = (k, v) => { setF({ ...f, [k]: v }); if (err) setErr(""); };
  const inp = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#008427]";
  const valido = f.id.trim() && f.nombre.trim();

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-adicional-titulo" className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-adicional-titulo" className="font-display text-xl font-extrabold text-slate-900">{f.nuevo ? "Nuevo adicional" : "Editar adicional"}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <Icono name="equis" className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">ID (sin espacios)</span>
            <input value={f.id} disabled={!f.nuevo} onChange={(e) => set("id", slugIdVivo(e.target.value))} className={inp + (f.nuevo ? "" : " bg-slate-50 text-slate-500")} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">Nombre</span>
            <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} className={inp} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">Descripción</span>
            <textarea value={f.descripcion || ""} onChange={(e) => set("descripcion", e.target.value)} rows={2} className={inp} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">Precio (COP)</span>
              <input type="number" min={0} value={f.precio} onChange={(e) => set("precio", Number(e.target.value))} className={inp} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-600">Unidad</span>
              <input value={f.unidad || ""} onChange={(e) => set("unidad", e.target.value)} placeholder="por persona…" className={inp} />
            </label>
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 pt-2 cursor-pointer">
            <input type="checkbox" checked={f.activo !== false} onChange={(e) => set("activo", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#008427] focus:ring-[#008427]" />
            Activo en la plataforma
          </label>
        </div>
        {err && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{err}</p>}
        <button onClick={intentarGuardar} disabled={!valido || saving}
          className="mt-6 w-full rounded-2xl bg-[#008427] py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] disabled:opacity-50 transition">
          {saving ? "Guardando…" : "Guardar adicional"}
        </button>
      </div>
    </div>
  );
}