import { useState, useEffect, useCallback, useRef } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useToast } from "../components/Toast";

/**
 * Si Firestore es inalcanzable (sin red, servicio caído), onSnapshot ni emite
 * ni erra: el panel quedaba en "Cargando…" eterno (pasó en el incidente de
 * facturación de sep 2026). Este timeout convierte el silencio en un error
 * visible para que las páginas muestren su aviso.
 */
const TIMEOUT_MS = 12000;
const errorTimeout = () => {
  const e = new Error("No pudimos conectar con la base de datos. Revisa tu internet y recarga la página.");
  e.code = "panel/timeout";
  return e;
};

/** Listener en tiempo real sobre una colección. */
export function useCollection(path) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!path) return;
    const timer = setTimeout(() => {
      setData((d) => {
        if (d === null) setError(errorTimeout());
        return d;
      });
    }, TIMEOUT_MS);
    const unsub = onSnapshot(
      collection(db, path),
      (snap) => {
        clearTimeout(timer);
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setError(null);
      },
      (err) => {
        clearTimeout(timer);
        setError(err);
        setData([]);
      }
    );
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [path]);
  return { data, error };
}

/** Listener en tiempo real sobre un documento. */
export function useDoc(path) {
  const [data, setData] = useState(undefined);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!path) return;
    const timer = setTimeout(() => {
      setData((d) => {
        if (d === undefined) setError(errorTimeout());
        return d;
      });
    }, TIMEOUT_MS);
    const unsub = onSnapshot(
      doc(db, path),
      (snap) => {
        clearTimeout(timer);
        setData(snap.exists() ? { id: snap.id, ...snap.data() } : null);
        setError(null);
      },
      (err) => {
        clearTimeout(timer);
        setError(err);
        setData(null);
      }
    );
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [path]);
  return { data, error };
}

/**
 * Errores de Firestore → español claro. El dueño del negocio
 * no debe ver jamás "Missing or insufficient permissions" en inglés.
 */
const MENSAJES_ERROR = {
  "permission-denied": "No tienes permiso para hacer este cambio. Cierra sesión y vuelve a entrar; si sigue, contáctanos.",
  "unavailable": "Sin conexión con la base de datos. Revisa tu internet e inténtalo de nuevo.",
  "deadline-exceeded": "La operación tardó demasiado. Revisa tu internet e inténtalo de nuevo.",
  "resource-exhausted": "El sistema está saturado en este momento. Espera un minuto e inténtalo de nuevo.",
  "unauthenticated": "Tu sesión expiró. Cierra sesión y vuelve a entrar.",
  "not-found": "El registro ya no existe (puede que otra persona lo haya borrado).",
  "already-exists": "Ya existe un registro con esos datos.",
};

// Códigos de negocio de las Cloud Functions propias: su mensaje YA viene en
// español desde el backend y se muestra tal cual.
const CODIGOS_FUNCTIONS_PROPIOS = new Set([
  "functions/invalid-argument",
  "functions/failed-precondition",
  "functions/not-found",
  "functions/already-exists",
  "functions/out-of-range",
]);

export function textoErrorFirestore(e) {
  if (CODIGOS_FUNCTIONS_PROPIOS.has(e?.code) && (e?.message || "").trim()) return e.message;
  const codigo = (e?.code || "").replace("firestore/", "");
  return MENSAJES_ERROR[codigo] || "No se pudo completar la operación. Inténtalo de nuevo.";
}

/** Envuelve una operación de escritura: estado de carga + toast. */
export function useMutation() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const vivo = useRef(true);
  useEffect(() => () => { vivo.current = false; }, []);

  const run = useCallback(
    async (fn, okMsg) => {
      setSaving(true);
      try {
        await fn();
        if (okMsg) toast(okMsg, "ok");
        return true;
      } catch (e) {
        toast(textoErrorFirestore(e), "error");
        return false;
      } finally {
        if (vivo.current) setSaving(false);
      }
    },
    [toast]
  );

  return { run, saving };
}
