import { useState, useRef, useEffect } from "react";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCollection, useMutation } from "../hooks/useFirestore";
import { subirImagen, etiquetaFase, textoErrorSubida } from "../lib/upload";
import { Icono } from "../components/Iconos.jsx";

export default function Galeria() {
  const { data: gallery, error } = useCollection("gallery");
  const { run, saving } = useMutation();
  const [enProceso, setEnProceso] = useState([]);
  const keyRef = useRef(0);
  const enProcesoRef = useRef([]);
  enProcesoRef.current = enProceso;

  useEffect(
    () => () => {
      enProcesoRef.current.forEach((it) => it.preview && safeRevoke(it.preview));
    },
    []
  );

  const actualizar = (key, patch) =>
    setEnProceso((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const quitar = (key) =>
    setEnProceso((prev) => {
      const it = prev.find((x) => x.key === key);
      if (it?.preview) safeRevoke(it.preview);
      return prev.filter((x) => x.key !== key);
    });

  function subir(fileList) {
    for (const file of fileList) {
      const key = `s-${keyRef.current++}`;
      let preview = "";
      try { preview = URL.createObjectURL(file); } catch { /* archivo sin preview */ }
      setEnProceso((prev) => [...prev, { key, nombre: file?.name || "archivo", preview, estado: null, error: null }]);

      subirImagen(file, "galeria", (estado) => actualizar(key, { estado }))
        .then(async (url) => {
          await addDoc(collection(db, "gallery"), {
            url,
            alt: "",
            orden: Date.now(),
            createdAt: serverTimestamp(),
          });
          setTimeout(() => quitar(key), 2500);
        })
        .catch((e) => {
          console.error("[Galería] subir falló:", e);
          actualizar(key, { error: textoErrorSubida(e) });
          setTimeout(() => quitar(key), 7000);
        });
    }
  }

  async function actualizarAlt(id, alt) {
    await run(() => updateDoc(doc(db, "gallery", id), { alt }), "Texto actualizado");
  }
  async function borrar(id) {
    if (!confirm("¿Eliminar esta foto de la galería?")) return;
    await run(() => deleteDoc(doc(db, "gallery", id)), "Foto eliminada");
  }

  const lista = [...(gallery || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const vacio = gallery !== null && lista.length === 0 && enProceso.length === 0;

  return (
    <div className="p-8">
      <h1 className="font-display mb-1 text-2xl font-bold text-slate-900">Galería</h1>
      <p className="mb-6 text-sm text-slate-500">Las fotos que se ven en la galería de tu sitio.</p>

      {error && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          No se pudo cargar. Verifica la conexión con Firebase.
        </div>
      )}

      {/* Dropzone */}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); subir([...e.dataTransfer.files]); }}
        className="mb-4 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white px-4 py-12 text-center transition hover:border-[#008427] focus-within:border-[#008427] focus-within:ring-2 focus-within:ring-emerald-500/30 shadow-xs"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-[#008427] mb-4">
          <Icono name="camara" className="h-7 w-7" />
        </span>
        <p className="text-sm font-bold text-slate-900">Arrastra aquí las fotos de tus saltos</p>
        <p className="text-xs text-slate-500 mt-1">o haz clic para elegirlas desde tu computador</p>
        <p className="mt-2 text-[11px] text-slate-400">JPG, PNG o fotos de iPhone — del tamaño que sea</p>
        <input
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          className="sr-only"
          onChange={(e) => { subir([...e.target.files]); e.target.value = ""; }}
        />
      </label>

      {/* Nota de ayuda */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 px-4 py-3.5 text-sm text-emerald-900">
        <Icono name="destello" className="mt-0.5 h-4 w-4 shrink-0 text-[#008427]" />
        <p>Tú solo arrastras. Por dentro comprimimos, achicamos y convertimos las fotos de iPhone para que tu sitio cargue rápido.</p>
      </div>

      {/* En proceso */}
      {enProceso.length > 0 && (
        <div className="mb-6 space-y-2.5" aria-live="polite">
          {enProceso.map((it) => <FilaSubida key={it.key} item={it} />)}
        </div>
      )}

      {/* Estado vacío */}
      {vacio && (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm text-slate-500">
          Aún no has subido fotos. Empieza arrastrando una aquí.
        </div>
      )}

      {/* Grilla de fotos */}
      {lista.length > 0 && (
        <>
          <p className="mb-3 text-xs font-semibold text-slate-500">
            La descripción de cada foto le dice a Google de qué trata y ayuda a quien usa lectores de pantalla.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {lista.map((g) => (
              <div key={g.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                <img src={g.url} alt={g.alt} width={400} height={144} className="h-40 w-full bg-slate-100 object-cover" />
                <div className="p-4 flex flex-col gap-3">
                  <label htmlFor={`alt-${g.id}`} className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    Descripción / Alt
                  </label>
                  <input
                    id={`alt-${g.id}`}
                    defaultValue={g.alt}
                    onBlur={(e) => e.target.value !== g.alt && actualizarAlt(g.id, e.target.value)}
                    placeholder="Ej: salto tándem..."
                    className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-[#008427]"
                  />
                  <button
                    onClick={() => borrar(g.id)}
                    disabled={saving}
                    className="w-full rounded-xl border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilaSubida({ item }) {
  const { nombre, preview, estado, error } = item;
  const pct = estado?.fase === "subiendo" ? (estado.pct ?? 0) : null;
  const listo = estado?.fase === "listo" && !error;

  return (
    <div className={`flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 shadow-xs ${error ? "border-red-300" : "border-slate-200"}`}>
      {preview ? (
        <img
          src={preview}
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-xl bg-slate-100 object-cover"
          onError={(e) => { e.currentTarget.style.visibility = "hidden"; }}
        />
      ) : (
        <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500"><Icono name="imagen" className="h-6 w-6" /></div>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-slate-900">{nombre}</p>
        {error ? (
          <p role="alert" className="mt-0.5 text-xs font-semibold text-red-700">{error}</p>
        ) : (
          <>
            <p className="mt-0.5 text-xs text-slate-500">{etiquetaFase(estado) || "Preparando…"}</p>
            {pct !== null && (
              <div
                className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Subiendo ${nombre}`}
              >
                <div className="h-full bg-[#008427] transition-[width] duration-150" style={{ width: `${pct}%` }} />
              </div>
            )}
          </>
        )}
      </div>

      {listo && <Icono name="check" className="h-5 w-5 shrink-0 text-[#008427]" />}
    </div>
  );
}

function safeRevoke(url) {
  try { URL.revokeObjectURL(url); } catch { /* noop */ }
}