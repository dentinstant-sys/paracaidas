/**
 * Subida de imágenes a Firebase Storage — Condor Sky (panel admin).
 *
 * Capa invisible: el administrador solo arrastra. Aquí, por dentro,
 * convertimos las fotos de iPhone (HEIC → JPEG), comprimimos y achicamos, y
 * subimos con progreso real. La firma pública sigue siendo COMPATIBLE:
 *   subirImagen(file, carpeta)            → devuelve la URL (igual que antes)
 *   subirImagen(file, carpeta, onEstado)  → además reporta el avance por fase
 *
 * `onEstado` (opcional) recibe:
 *   { fase: "convirtiendo" }
 *   { fase: "optimizando" }
 *   { fase: "subiendo", pct }                         // pct 0..100
 *   { fase: "listo", originalSize, finalSize, url }
 *
 * Errores (throw) con shape estable para mensajes amables:
 *   { code: "tipo-invalido", nombre }   // no es imagen ni HEIC
 *   { code: "muy-grande" }              // archivo > 40 MB
 *
 * `heic-to` se carga por IMPORT DINÁMICO y solo cuando el archivo podría ser
 * HEIC (su WASM de libheif pesa). Si el panel tuviera una CSP estricta y
 * `heic-to` fallara por 'unsafe-eval', se puede cambiar a `import("heic-to/csp")`.
 */
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";
import { storage } from "./firebase";

const MAX_BYTES = 40 * 1024 * 1024; // 40 MB

/** Imagen estándar que el navegador ya entiende (NO incluye HEIC/HEIF). */
function esImagenEstandar(file) {
  const t = (file?.type || "").toLowerCase();
  return t.startsWith("image/") && t !== "image/heic" && t !== "image/heif";
}

/** ¿Vale la pena cargar heic-to? (type heic/heif, vacío —iPhone—, o extensión). */
function podriaSerHeic(file) {
  const t = (file?.type || "").toLowerCase();
  const n = (file?.name || "").toLowerCase();
  return t === "image/heic" || t === "image/heif" || t === "" || /\.(heic|heif)$/.test(n);
}

export async function subirImagen(file, carpeta = "general", onEstado) {
  if (!file) throw { code: "tipo-invalido", nombre: "archivo" };

  // ---- 1. Validar tipo (carga heic-to SOLO si hace falta) ----
  let esHeicFile = false;
  if (!esImagenEstandar(file)) {
    if (podriaSerHeic(file)) {
      try {
        const { isHeic } = await import("heic-to");
        esHeicFile = await isHeic(file);
      } catch {
        // Si heic-to no carga (p.ej. CSP estricta sin 'unsafe-eval'),
        // caemos a la extensión para no bloquear al usuario.
        esHeicFile = /\.(heic|heif)$/i.test(file.name || "");
      }
    }
    if (!esHeicFile) {
      throw { code: "tipo-invalido", nombre: file.name || "archivo" };
    }
  }

  // ---- 1b. Validar tamaño ----
  if (file.size > MAX_BYTES) throw { code: "muy-grande" };
  const originalSize = file.size; // tamaño ANTES de todo

  // ---- 2. HEIC → JPEG (solo si aplica) ----
  let trabajo = file;
  if (esHeicFile) {
    onEstado?.({ fase: "convirtiendo" });
    const { heicTo } = await import("heic-to");
    const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.9 });
    const base = (file.name || "foto").replace(/\.[^.]+$/, "");
    trabajo = new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  }

  // ---- 3. Optimizar (resize + compress + orientación EXIF, en web worker) ----
  onEstado?.({ fase: "optimizando" });
  const optimizada = await imageCompression(trabajo, {
    maxWidthOrHeight: 1600,
    maxSizeMB: 1.2,
    initialQuality: 0.8,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
  const finalSize = optimizada.size;

  // ---- 4. Subir con progreso real ----
  onEstado?.({ fase: "subiendo", pct: 0 });
  const base = (trabajo.name || "foto").replace(/\.[^.]+$/, "");
  const nombre = `${carpeta}/${Date.now()}_${base.replace(/[^\w.-]/g, "_")}.jpg`;
  const tarea = uploadBytesResumable(ref(storage, nombre), optimizada, {
    contentType: "image/jpeg",
  });

  await new Promise((resolve, reject) => {
    tarea.on(
      "state_changed",
      (snap) => {
        const pct = snap.totalBytes
          ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
          : 0;
        onEstado?.({ fase: "subiendo", pct });
      },
      reject,
      resolve
    );
  });

  // ---- 5. URL final (compat: devolvemos string, igual que hoy) ----
  const url = await getDownloadURL(tarea.snapshot.ref);
  onEstado?.({ fase: "listo", originalSize, finalSize, url });
  return url;
}

/* ---------------- Helpers de presentación (compartidos por las 3 vistas) ------------- */

/** Tamaño legible en MB con 1 decimal. Ej: "0.8 MB". */
export function formatoMB(bytes) {
  return (Number(bytes || 0) / (1024 * 1024)).toFixed(1) + " MB";
}

/** Texto del estado de subida por fase (mismo copy en Galería, Sedes y Servicios). */
export function etiquetaFase(estado) {
  if (!estado) return "";
  switch (estado.fase) {
    case "convirtiendo": return "Preparando tu foto de iPhone…";
    case "optimizando":  return "Optimizando tu foto…";
    case "subiendo":     return `Subiendo… ${estado.pct ?? 0}%`;
    case "listo":        return `Lista · de ${formatoMB(estado.originalSize)} a ${formatoMB(estado.finalSize)}`;
    default:             return "";
  }
}

/** Mensaje amable de error: dice QUÉ hacer, sin disculparse. */
export function textoErrorSubida(err) {
  const code = err && err.code;
  if (code === "tipo-invalido") {
    return `Eso no es una foto. El archivo «${(err && err.nombre) || "archivo"}» no es una imagen. Sube JPG, PNG o una foto de iPhone.`;
  }
  if (code === "muy-grande") {
    return "Esa imagen es demasiado grande. Prueba con otra.";
  }
  return "No se pudo subir la imagen. Revisa tu conexión e inténtalo de nuevo.";
}
