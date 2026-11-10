import { useState, useEffect, useRef, useCallback } from "react";
import { doc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "../lib/firebase";
import { useDoc, useMutation, textoErrorFirestore } from "../hooks/useFirestore";
import { Icono } from "../components/Iconos.jsx";

const TABS = [
  { key: "general", label: "Contacto" },
  { key: "bold", label: "Pasarela Bold" },
  { key: "legal", label: "Textos legales" },
  { key: "faq", label: "Contenido — FAQ" },
];

export default function Ajustes() {
  const [tab, setTab] = useState("general");

  return (
    <div className="p-8">
      <h1 className="font-display mb-1 text-2xl font-bold text-slate-900">Ajustes</h1>
      <p className="mb-6 text-sm text-slate-500">Configuración y contenido del sitio público.</p>

      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? "border-[#008427] text-[#008427]" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "general" && <Contacto />}
      {tab === "bold" && <Bold />}
      {tab === "legal" && <Legal />}
      {tab === "faq" && <FAQ />}
    </div>
  );
}

const inp = "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#008427]";

// Firma estable para comparar documentos sin importar el orden de las llaves.
const firmaDoc = (o) =>
  JSON.stringify(Object.keys(o || {}).sort().reduce((a, k) => ((a[k] = o[k]), a), {}));

function useEditableDoc(path) {
  const { data, error } = useDoc(path);
  const [form, _setForm] = useState(null);
  const formRef = useRef(null);
  const setForm = useCallback((v) => {
    _setForm((prev) => {
      const next = typeof v === "function" ? v(prev) : v;
      formRef.current = next;
      return next;
    });
  }, []);
  const [cambioRemoto, setCambioRemoto] = useState(false);
  const cargado = useRef(false);

  useEffect(() => {
    if (data === undefined) return;
    const { id: _id, ...limpio } = data || {};
    if (!cargado.current) {
      cargado.current = true;
      setForm(limpio);
      return;
    }
    if (firmaDoc(limpio) === firmaDoc(formRef.current)) return;
    setCambioRemoto(true);
  }, [data, setForm]);

  const recargar = useCallback(() => {
    const { id: _id, ...limpio } = data || {};
    setForm(limpio);
    setCambioRemoto(false);
  }, [data, setForm]);

  return [form, setForm, { error, cambioRemoto, recargar }];
}

/** Avisos compartidos de cada pestaña: error de carga y cambios remotos. */
function AvisosDoc({ error, cambioRemoto, recargar }) {
  if (!error && !cambioRemoto) return null;
  return (
    <div className="mb-4 max-w-xl space-y-2">
      {error && (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
          <Icono name="alerta" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span>{textoErrorFirestore(error)}</span>
        </div>
      )}
      {cambioRemoto && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <span className="flex items-start gap-2">
            <Icono name="info" className="mt-0.5 h-4 w-4 shrink-0 text-[#008427]" />
            Hay cambios guardados desde otra sesión.
          </span>
          <button onClick={recargar} className="shrink-0 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-[#008427] hover:bg-emerald-100 transition">
            Cargar lo nuevo
          </button>
        </div>
      )}
    </div>
  );
}

function Tarjeta({ children }) {
  return <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">{children}</div>;
}
function Label({ children }) {
  return <span className="mb-1.5 mt-4 block text-xs font-bold uppercase tracking-wider text-slate-600">{children}</span>;
}
function Guardar({ onClick, saving }) {
  return (
    <button onClick={onClick} disabled={saving}
      className="mt-6 w-full rounded-2xl bg-[#008427] py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-[#00661e] disabled:opacity-50 transition">
      {saving ? "Guardando…" : "Guardar cambios"}
    </button>
  );
}

/** URL de solo lectura con botón de copiar. La usa la pasarela Bold. */
function CampoUrlCopiable({ url, ayuda }) {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* si el navegador bloquea el portapapeles, se copia manualmente */
    }
  };
  return (
    <>
      <div className="flex gap-2">
        <input readOnly value={url} className={inp + " bg-slate-50 text-slate-500"} />
        <button type="button" onClick={copiar}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-2xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700 hover:border-[#008427] hover:text-[#008427] transition">
          {copiado ? <><Icono name="check" className="h-3.5 w-3.5 text-emerald-600" /> Copiado</> : "Copiar"}
        </button>
      </div>
      {ayuda && <p className="mt-1.5 text-xs text-slate-400">{ayuda}</p>}
    </>
  );
}

function Contacto() {
  const [f, setF, estado] = useEditableDoc("settings/general");
  const { run, saving } = useMutation();
  const [avisoCampo, setAvisoCampo] = useState("");
  if (!f) {
    return estado.error
      ? <AvisosDoc {...estado} />
      : <p className="text-sm text-slate-500">Cargando…</p>;
  }
  const set = (k, v) => { setF({ ...f, [k]: v }); if (avisoCampo) setAvisoCampo(""); };

  const guardar = () => {
    const digitos = (f.whatsapp || "").replace(/\D/g, "");
    if (digitos && (digitos.length < 10 || digitos.length > 15)) {
      setAvisoCampo("Revisa el WhatsApp: escríbelo completo, con indicativo (ej. +57 318 028 2425).");
      return;
    }
    const email = (f.email || "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAvisoCampo("Revisa el correo: no parece una dirección válida (ej. info@vuelaclub.co).");
      return;
    }
    const whatsappNormalizado = !digitos ? "" : digitos.length === 10 && digitos.startsWith("3") ? `+57${digitos}` : `+${digitos}`;
    const datos = { ...f, whatsapp: whatsappNormalizado, email };
    run(() => setDoc(doc(db, "settings", "general"), datos, { merge: true }), "Contacto guardado").then((ok) => {
      if (ok) setF(datos);
    });
  };

  return (
    <>
      <AvisosDoc {...estado} />
      <Tarjeta>
        <Label>WhatsApp</Label>
        <input value={f.whatsapp || ""} onChange={(e) => set("whatsapp", e.target.value)} className={inp} placeholder="+57 318 028 2425" />
        <p className="mt-1.5 text-xs text-slate-500">Con indicativo del país. Es el número que abre el botón de WhatsApp del sitio.</p>
        
        <Label>Email</Label>
        <input type="email" value={f.email || ""} onChange={(e) => set("email", e.target.value)} className={inp} placeholder="info@vuelaclub.co" />
        
        <Label>Instagram</Label>
        <input value={f.instagram || ""} onChange={(e) => set("instagram", e.target.value)} className={inp} />
        
        <Label>Facebook</Label>
        <input value={f.facebook || ""} onChange={(e) => set("facebook", e.target.value)} className={inp} />
        
        <Label>TikTok</Label>
        <input value={f.tiktok || ""} onChange={(e) => set("tiktok", e.target.value)} className={inp} />

        {avisoCampo && (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">{avisoCampo}</p>
        )}
        <Guardar saving={saving} onClick={guardar} />
      </Tarjeta>
    </>
  );
}

const WEBHOOK_URL = "https://us-central1-caidalibre-prod.cloudfunctions.net/boldWebhook";

function Bold() {
  const { data, error } = useDoc("settings/bold");
  const { run, saving } = useMutation();
  const [activo, setActivo] = useState(false);
  const [llavePublica, setLlavePublica] = useState("");
  const [llaveSecreta, setLlaveSecreta] = useState("");
  const [avisoBold, setAvisoBold] = useState("");

  useEffect(() => {
    if (data !== undefined) {
      setActivo(data?.activo === true);
      setLlavePublica(data?.llavePublica || "");
    }
  }, [data]);

  if (data === undefined) {
    return error
      ? <AvisosDoc error={error} cambioRemoto={false} recargar={() => {}} />
      : <p className="text-sm text-slate-500">Cargando…</p>;
  }
  const secretaConfigurada = data?.secretaConfigurada === true;

  const guardar = () => {
    if (activo && !llavePublica.trim()) {
      setAvisoBold("Configura la llave pública de Bold antes de activar la pasarela.");
      return;
    }
    setAvisoBold("");
    const guardarConfigBold = httpsCallable(functions, "guardarConfigBold");
    run(
      () => guardarConfigBold({
        activo,
        llavePublica: llavePublica.trim(),
        llaveSecreta: llaveSecreta.trim(),
      }),
      "Configuración de Bold guardada"
    ).then((ok) => {
      if (ok) setLlaveSecreta("");
    });
  };

  return (
    <Tarjeta>
      <label className="flex items-center gap-3 text-sm font-semibold text-slate-700 cursor-pointer">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#008427] focus:ring-[#008427]" />
        Pasarela Bold activa
      </label>

      <Label>Llave pública de Bold</Label>
      <input value={llavePublica} onChange={(e) => setLlavePublica(e.target.value)}
        className={inp} placeholder="Llave de identidad (pública) de la cuenta Bold" />

      <Label>Llave secreta de Bold</Label>
      <input type="password" value={llaveSecreta} onChange={(e) => setLlaveSecreta(e.target.value)}
        className={inp}
        placeholder={secretaConfigurada
          ? "•••••••••• — configurada (escribe una nueva para reemplazarla)"
          : "Pega aquí la llave secreta de Bold"} />
      <p className="mt-1.5 text-xs text-slate-400">
        {secretaConfigurada
          ? "Hay una llave secreta guardada. Por seguridad no se muestra: deja el campo vacío para conservarla, o escribe una nueva para reemplazarla."
          : "Aún no hay llave secreta configurada."}
      </p>

      <Label>URL del webhook de Bold</Label>
      <CampoUrlCopiable
        url={WEBHOOK_URL}
        ayuda="Pega esta URL en la cuenta de Bold → Configuración → Webhooks."
      />

      <div className="mt-6 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900">
        <Icono name="candado" className="mt-0.5 h-4 w-4 shrink-0 text-[#008427]" />
        <span>
          La llave pública se guarda donde el sitio la lee; la secreta viaja por una función
          a un almacén cerrado que solo alcanza el servidor — nunca llega al navegador del
          público. Puedes cambiar ambas desde aquí cuando quieras.
        </span>
      </div>

      {avisoBold && (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">{avisoBold}</p>
      )}

      <Guardar saving={saving} onClick={guardar} />
    </Tarjeta>
  );
}

function Legal() {
  const [f, setF, estado] = useEditableDoc("settings/legal");
  const { run, saving } = useMutation();
  if (!f) {
    return estado.error
      ? <AvisosDoc {...estado} />
      : <p className="text-sm text-slate-500">Cargando…</p>;
  }
  const set = (k, v) => setF({ ...f, [k]: v });
  return (
    <>
      <AvisosDoc {...estado} />
      <Tarjeta>
        <Label>Términos y Condiciones</Label>
        <textarea value={f.terminos || ""} onChange={(e) => set("terminos", e.target.value)} rows={5} className={inp} />
        
        <Label>Política de privacidad</Label>
        <textarea value={f.privacidad || ""} onChange={(e) => set("privacidad", e.target.value)} rows={5} className={inp} />
        
        <Label>Política de cancelaciones</Label>
        <textarea value={f.cancelaciones || ""} onChange={(e) => set("cancelaciones", e.target.value)} rows={4} className={inp} />
        
        <Guardar saving={saving} onClick={() => run(() => setDoc(doc(db, "settings", "legal"), f, { merge: true }), "Textos legales guardados")} />
      </Tarjeta>
    </>
  );
}

function FAQ() {
  const [f, setF, estado] = useEditableDoc("settings/faq");
  const { run, saving } = useMutation();
  if (!f) {
    return estado.error
      ? <AvisosDoc {...estado} />
      : <p className="text-sm text-slate-500">Cargando…</p>;
  }
  const items = f.items || [];
  const setItems = (items) => setF({ ...f, items });

  return (
    <div className="max-w-2xl">
      <AvisosDoc {...estado} />
      <p className="mb-4 text-sm text-slate-500">
        Preguntas frecuentes del sitio. Los demás contenidos (stats, sedes, “qué incluye”,
        intros) siguen este mismo patrón de edición.
      </p>
      <div className="space-y-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <input value={it.pregunta || ""} placeholder="Pregunta"
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, pregunta: e.target.value } : x)))}
              className={inp + " font-bold text-slate-900"} />
            <textarea value={it.respuesta || ""} placeholder="Respuesta" rows={2}
              onChange={(e) => setItems(items.map((x, j) => (j === i ? { ...x, respuesta: e.target.value } : x)))}
              className={inp + " mt-3"} />
            <button onClick={() => setItems(items.filter((_, j) => j !== i))}
              className="mt-3 text-xs font-bold text-red-500 hover:underline">
              Eliminar pregunta
            </button>
          </div>
        ))}
      </div>
      <button onClick={() => setItems([...items, { pregunta: "", respuesta: "" }])}
        className="mt-4 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-bold text-slate-700 hover:border-[#008427] hover:text-[#008427] transition">
        + Agregar pregunta
      </button>
      <div>
        <Guardar saving={saving} onClick={() => run(() => setDoc(doc(db, "settings", "faq"), { items }, { merge: true }), "FAQ guardado")} />
      </div>
    </div>
  );
}