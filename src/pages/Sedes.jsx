import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useDoc, useCollection, useMutation } from "../hooks/useFirestore";
import { subirImagen, etiquetaFase, textoErrorSubida } from "../lib/upload";
import { SEDES_SEED, slugId } from "../lib/constantes";
import { SeedBox } from "./Servicios";
import { Icono } from "../components/Iconos.jsx";

const inp = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#008427]";

function idUnico(base, items) {
  const raiz = slugId(base) || "sede";
  let cand = raiz;
  let n = 2;
  while (items.some((s) => s.id === cand)) cand = `${raiz}-${n++}`;
  return cand;
}

export default function Sedes() {
  const { data, error } = useDoc("settings/sedes");
  const { run, saving } = useMutation();
  const [editar, setEditar] = useState(null);
  const [aBorrar, setABorrar] = useState(null);

  const items = [...(data?.items || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
  const cargando = data === undefined;
  const vacio = !cargando && items.length === 0;

  function guardarItems(nuevos, msg) {
    return run(
      () => setDoc(doc(db, "settings", "sedes"), { items: nuevos, updatedAt: serverTimestamp() }, { merge: true }),
      msg
    );
  }

  async function sembrar() {
    await guardarItems(SEDES_SEED, "5 sedes iniciales creadas");
  }

  async function upsert(sede) {
    const existe = items.some((s) => s.id === sede.id);
    const nuevos = existe ? items.map((s) => (s.id === sede.id ? sede : s)) : [...items, sede];
    const ok = await guardarItems(nuevos, "Sede guardada");
    if (ok) setEditar(null);
  }

  async function toggleActive(sede) {
    const nuevos = items.map((s) => (s.id === sede.id ? { ...s, active: !s.active } : s));
    await guardarItems(nuevos, sede.active ? "Sede oculta" : "Sede visible");
  }

  async function confirmarBorrado() {
    const nuevos = items.filter((s) => s.id !== aBorrar.id);
    const ok = await guardarItems(nuevos, "Sede eliminada");
    if (ok) setABorrar(null);
  }

  function nuevaSede() {
    setEditar({ nuevo: true, id: "", city: "", zone: "", airport: "", travel: "", photo: "", order: items.length + 1, active: true });
  }

  return (
    <div className="p-8">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-slate-900">Sedes</h1>
        <button onClick={nuevaSede} className="rounded-2xl bg-[#008427] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] transition">
          + Nueva sede
        </button>
      </div>
      <p className="mb-6 text-sm text-slate-500">
        Ciudades donde opera Vuela Club. El sitio y el wizard de reserva leen de aquí;
        apaga una sede para ocultarla del público sin borrarla.
      </p>

      {error && (
        <div className="mb-5 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No se pudieron cargar las sedes. Verifica la conexión con Firebase.
        </div>
      )}

      {cargando && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      )}

      {vacio && !error && (
        <SeedBox onSeed={sembrar} saving={saving}
          texto="No hay sedes configuradas. Crea las 5 sedes actuales de Vuela Club (las mismas que el sitio muestra hoy). Después podrás editarlas, ocultarlas o agregar nuevas." />
      )}

      {!cargando && items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between ${s.active ? "" : "opacity-70"}`}>
              <div>
                {s.photo ? (
                  <img src={s.photo} alt={s.city} className="h-40 w-full object-cover" />
                ) : (
                  <div className="flex h-40 w-full items-center justify-center bg-slate-100 text-slate-400"><Icono name="pin" className="h-8 w-8 text-[#008427]" /></div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold text-slate-900">
                        {s.city}{s.zone ? <span className="font-normal text-slate-400"> / {s.zone}</span> : null}
                      </p>
                      <p className="truncate text-xs text-slate-500 mt-1">{s.airport}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${s.active ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {s.active ? "Visible" : "Oculta"}
                    </span>
                  </div>
                  {s.travel && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[#008427]"><Icono name="bus" className="h-4 w-4 shrink-0" /> {s.travel}</p>}
                </div>
              </div>
              <div className="p-5 pt-0 flex gap-2">
                <button onClick={() => setEditar({ ...s })}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:border-[#008427] hover:text-[#008427] transition">
                  Editar
                </button>
                <button onClick={() => toggleActive(s)} disabled={saving}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
                  {s.active ? "Ocultar" : "Mostrar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editar && (
        <DrawerSede
          item={editar}
          items={items}
          onClose={() => setEditar(null)}
          onGuardar={upsert}
          onPedirBorrar={(s) => { setEditar(null); setABorrar(s); }}
          saving={saving}
        />
      )}

      {aBorrar && (
        <ConfirmarBorrado sede={aBorrar} onCancelar={() => setABorrar(null)} onConfirmar={confirmarBorrado} saving={saving} />
      )}
    </div>
  );
}

function DrawerSede({ item, items, onClose, onGuardar, onPedirBorrar, saving }) {
  const { data: gallery } = useCollection("gallery");
  const [f, setF] = useState(item);
  const [err, setErr] = useState("");
  const [estadoFoto, setEstadoFoto] = useState(null);
  const [errorFoto, setErrorFoto] = useState("");
  const subiendoFoto = !!estadoFoto && estadoFoto.fase !== "listo";
  const set = (k, v) => { setF({ ...f, [k]: v }); if (err) setErr(""); };

  async function onFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorFoto("");
    setEstadoFoto({ fase: "preparando" });
    try {
      const url = await subirImagen(file, "sedes", setEstadoFoto);
      setF((prev) => ({ ...prev, photo: url }));
    } catch (err) {
      console.error("[Sedes] subir imagen falló:", err);
      setEstadoFoto(null);
      setErrorFoto(textoErrorSubida(err));
    }
    e.target.value = "";
  }

  function intentarGuardar() {
    if (!f.city.trim()) { setErr("La ciudad es obligatoria."); return; }
    if (!f.airport.trim()) { setErr("El aeropuerto / punto de salto es obligatorio."); return; }
    const id = f.nuevo ? idUnico(f.city, items) : f.id;
    const { nuevo, ...resto } = f;
    onGuardar({ ...resto, id, order: Number(f.order) || 0, active: f.active !== false });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-extrabold text-slate-900">{f.nuevo ? "Nueva sede" : "Editar sede"}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <Icono name="equis" className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <Campo label="Ciudad *">
            <input value={f.city} onChange={(e) => set("city", e.target.value)} className={inp} placeholder="Ej. Bogotá" />
          </Campo>
          <Campo label="Zona / operación">
            <input value={f.zone || ""} onChange={(e) => set("zone", e.target.value)} className={inp} placeholder="Ej. Tunja, Boyacá" />
          </Campo>
          <Campo label="Aeropuerto / punto de salto *">
            <input value={f.airport} onChange={(e) => set("airport", e.target.value)} className={inp} placeholder="Ej. Aerop. Gustavo Rojas Pinilla" />
          </Campo>
          <Campo label="Traslado">
            <input value={f.travel || ""} onChange={(e) => set("travel", e.target.value)} className={inp} placeholder="Ej. ~1h desde Bogotá" />
          </Campo>
          <Campo label="Orden en el sitio">
            <input type="number" min={0} value={f.order} onChange={(e) => set("order", Number(e.target.value))} className={inp} />
          </Campo>

          <Campo label="Foto">
            <p className="mb-2 text-xs text-slate-500">
              Usa una foto horizontal (apaisada) de la zona de salto. Se ve mejor en el sitio. La optimizamos por ti.
            </p>
            <div className="flex items-center gap-3">
              {f.photo ? (
                <img src={f.photo} alt="" className="h-14 w-20 rounded-xl object-cover border border-slate-200" />
              ) : (
                <div className="flex h-14 w-20 items-center justify-center rounded-xl bg-slate-100 text-slate-400"><Icono name="pin" className="h-6 w-6 text-[#008427]" /></div>
              )}
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
            {gallery && gallery.length > 0 && (
              <>
                <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">…o elige una de tu galería:</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {gallery.slice(0, 12).map((g) => (
                    <button key={g.id} type="button" onClick={() => set("photo", g.url)}
                      className={`h-12 w-12 overflow-hidden rounded-xl border-2 transition ${f.photo === g.url ? "border-[#008427] ring-2 ring-emerald-500/20" : "border-slate-200 hover:border-slate-300"}`}>
                      <img src={g.url} alt={g.alt || ""} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </Campo>

          <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 pt-2 cursor-pointer">
            <input type="checkbox" checked={f.active !== false} onChange={(e) => set("active", e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#008427] focus:ring-[#008427]" />
            Visible en el sitio
          </label>
        </div>

        {err && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{err}</p>}

        <div className="mt-6 flex gap-3">
          <button onClick={intentarGuardar} disabled={saving || subiendoFoto}
            className="flex-1 rounded-2xl bg-[#008427] py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] disabled:opacity-50 transition">
            {saving ? "Guardando…" : "Guardar"}
          </button>
          {!f.nuevo && (
            <button onClick={() => onPedirBorrar(item)} disabled={saving}
              className="rounded-2xl border border-red-200 px-4 py-3.5 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 transition">
              Borrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConfirmarBorrado({ sede, onCancelar, onConfirmar, saving }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4" onClick={onCancelar}>
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl font-extrabold text-slate-900">Eliminar sede</h2>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          ¿Seguro que quieres eliminar <strong className="text-slate-900">{sede.city}</strong>? Esta acción es irreversible.
          Si solo quieres quitarla del sitio, usa <strong className="text-slate-900">Ocultar</strong> en su lugar.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancelar} className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={onConfirmar} disabled={saving}
            className="rounded-2xl bg-red-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-red-900/20 hover:bg-red-700 disabled:opacity-50 transition">
            {saving ? "Eliminando…" : "Sí, eliminar"}
          </button>
        </div>
      </div>
    </div>
  );
}

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