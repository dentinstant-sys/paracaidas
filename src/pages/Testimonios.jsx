import { useState, useEffect } from "react";
import { collection, doc, addDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCollection, useMutation } from "../hooks/useFirestore";
import { subirImagen, textoErrorSubida } from "../lib/upload";
import { Icono } from "../components/Iconos.jsx";

export default function Testimonios() {
  const { data: testimonials, error } = useCollection("testimonials");
  const { run, saving } = useMutation();
  const [editar, setEditar] = useState(null);

  async function guardar(item) {
    const { id, ...resto } = item;
    const ok = await run(
      () => (id ? setDoc(doc(db, "testimonials", id), resto, { merge: true }) : addDoc(collection(db, "testimonials"), resto)),
      "Testimonio guardado"
    );
    if (ok) setEditar(null);
  }
  async function borrar(id) {
    if (!confirm("¿Eliminar este testimonio?")) return;
    await run(() => deleteDoc(doc(db, "testimonials", id)), "Testimonio eliminado");
  }

  const lista = [...(testimonials || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));

  return (
    <div className="p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Testimonios</h1>
        <button onClick={() => setEditar({ nombre: "", ciudad: "", texto: "", rating: 5, foto: "", activo: true, orden: lista.length + 1 })}
          className="rounded-2xl bg-[#008427] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] transition">
          + Nuevo testimonio
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">Reseñas que se muestran en el sitio público.</p>

      {error && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No se pudo cargar. Verifica la conexión con Firebase.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials === null ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-slate-400">Sin testimonios.</p>
        ) : (
          lista.map((t) => (
            <div key={t.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  {t.foto
                    ? <img src={t.foto} alt={t.nombre} className="h-12 w-12 rounded-2xl object-cover border border-slate-200" />
                    : <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-sm font-bold text-[#008427]">{(t.nombre || "?")[0]}</div>}
                  <div>
                    <p className="font-display text-base font-bold text-slate-900">{t.nombre}</p>
                    <p className="text-xs text-slate-400">{t.ciudad}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-amber-500">{"★".repeat(t.rating || 0)}{"☆".repeat(5 - (t.rating || 0))}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed line-clamp-3">{t.texto}</p>
              </div>
              <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${
                  t.activo !== false ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                }`}>
                  {t.activo !== false ? "Visible" : "Oculto"}
                </span>
                <div className="flex gap-3">
                  <button onClick={() => setEditar({ ...t })} className="text-xs font-bold text-[#008427] hover:underline">Editar</button>
                  <button onClick={() => borrar(t.id)} className="text-xs font-bold text-red-500 hover:underline">Eliminar</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {editar && <ModalTestimonio item={editar} onClose={() => setEditar(null)} onGuardar={guardar} saving={saving} />}
    </div>
  );
}

function ModalTestimonio({ item, onClose, onGuardar, saving }) {
  const [f, setF] = useState(item);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFoto, setErrorFoto] = useState("");
  const set = (k, v) => setF({ ...f, [k]: v });
  const inp = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#008427]";
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function onFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    setErrorFoto("");
    try {
      const url = await subirImagen(file, "testimonios");
      setF((prev) => ({ ...prev, foto: url }));
    } catch (e) {
      console.error("[Testimonios] subir imagen falló:", e);
      setErrorFoto(textoErrorSubida(e));
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-testimonio-titulo" className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="modal-testimonio-titulo" className="font-display text-xl font-extrabold text-slate-900">{f.id ? "Editar testimonio" : "Nuevo testimonio"}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <Icono name="equis" className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Nombre</span>
              <input value={f.nombre} onChange={(e) => set("nombre", e.target.value)} className={inp} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Ciudad</span>
              <input value={f.ciudad} onChange={(e) => set("ciudad", e.target.value)} className={inp} />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Reseña</span>
            <textarea value={f.texto} onChange={(e) => set("texto", e.target.value)} rows={3} className={inp} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Rating</span>
            <select value={f.rating} onChange={(e) => set("rating", Number(e.target.value))} className={inp}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} ({n})</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">Foto (opcional)</span>
            <div className="flex items-center gap-3">
              {f.foto && <img src={f.foto} alt="" className="h-12 w-12 rounded-2xl object-cover border border-slate-200" />}
              <input type="file" accept="image/*" onChange={onFoto} className="text-xs text-slate-500 file:mr-3 file:rounded-xl file:border-0 file:bg-[#008427] file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-[#00661e]" />
              {subiendo && <span className="text-xs text-slate-500">Subiendo…</span>}
            </div>
            {errorFoto && (
              <p role="alert" className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{errorFoto}</p>
            )}
          </label>
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 pt-2 cursor-pointer">
            <input type="checkbox" checked={f.activo !== false} onChange={(e) => set("activo", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#008427] focus:ring-[#008427]" />
            Visible en el sitio
          </label>
        </div>
        <button onClick={() => onGuardar(f)} disabled={!f.nombre?.trim() || saving || subiendo}
          className="mt-6 w-full rounded-2xl bg-[#008427] py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] disabled:opacity-50 transition">
          {saving ? "Guardando…" : "Guardar testimonio"}
        </button>
      </div>
    </div>
  );
}