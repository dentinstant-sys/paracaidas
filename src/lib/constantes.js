/**
 * Constantes del panel — Condor Sky (modelo unificado v2).
 */

/** Estado operativo de una reserva. */
export const ESTADOS = [
  { key: "pendiente", label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  { key: "confirmada", label: "Confirmada", color: "bg-emerald-100 text-emerald-700" },
  { key: "completada", label: "Completada", color: "bg-blue-100 text-blue-700" },
  { key: "no-show", label: "No-show", color: "bg-slate-200 text-slate-600" },
  { key: "cancelada", label: "Cancelada", color: "bg-red-100 text-red-700" },
];

/** Estado del pago (lo actualiza el webhook de Bold). */
export const PAGO_ESTADOS = {
  iniciado: { label: "Iniciado", color: "bg-slate-100 text-slate-600" },
  pendiente: { label: "Pendiente", color: "bg-amber-100 text-amber-700" },
  aprobado: { label: "Aprobado", color: "bg-emerald-100 text-emerald-700" },
  rechazado: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  anulado: { label: "Anulado", color: "bg-slate-200 text-slate-600" },
};

export const SEDES = [
  { key: "bogota", nombre: "Bogotá / Boyacá" },
  { key: "cali", nombre: "Cali / Armenia" },
  { key: "medellin", nombre: "Medellín / Pto. Berrío" },
  { key: "bucaramanga", nombre: "Bucaramanga / Barrancabermeja" },
  { key: "santamarta", nombre: "Santa Marta" },
];

export const money = (n) => "$" + Number(n || 0).toLocaleString("es-CO");

export function estadoInfo(key) {
  return ESTADOS.find((e) => e.key === key) || { label: key, color: "bg-slate-100 text-slate-600" };
}
export function sedeNombre(key) {
  return (SEDES.find((s) => s.key === key) || {}).nombre || key || "—";
}

/**
 * Sanitiza texto para usarlo como ID de documento Firestore:
 * minúsculas, sin acentos, espacios → "-", y elimina "/" y cualquier
 * carácter que rompa una ruta de Firestore (deja solo a-z 0-9 "-" "_").
 *
 * `slugIdVivo` es la versión para teclear (no recorta bordes ni colapsa
 * guiones, para no estorbar mientras se escribe). `slugId` produce el ID
 * final (colapsa guiones repetidos y recorta los de los extremos).
 */
export function slugIdVivo(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD").replace(/\p{Diacritic}/gu, "") // quita acentos
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "");
}
export function slugId(texto = "") {
  return slugIdVivo(texto).replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

/** Catálogo semilla — usado por el botón "sembrar" en Servicios/Adicionales.
 *  Espejo del catálogo VIVO (sep 2026) para que una re-siembra accidental no
 *  reviva precios viejos. Si el cliente cambia precios, actualizar aquí. */
export const SERVICES_SEED = [
  { id: "individual", nombre: "Salto Individual", descripcion: "Salto tándem individual.", precio: 299000, tipo: "base", foto: "", activo: true, orden: 1 },
  { id: "grupo", nombre: "Promo Grupo x2", descripcion: "Dos saltos tándem. Precio total para la pareja o dupla.", precio: 480000, tipo: "base", foto: "", activo: true, orden: 2 },
  { id: "esencial", nombre: "Esencial", descripcion: "10 fotos digitales del salto.", precio: 75000, tipo: "fotos", foto: "", activo: true, orden: 3 },
  { id: "plus", nombre: "PLUS HD", descripcion: "Esencial + tomas dentro del avión + caída libre grabada.", precio: 110000, tipo: "fotos", foto: "", activo: true, orden: 4 },
  { id: "pro", nombre: "Pro Experience", descripcion: "PLUS + cámara externa + 15 fotos HD + certificado.", precio: 180000, tipo: "fotos", foto: "", activo: true, orden: 5 },
  { id: "trio", nombre: "Full Experience Pareja", descripcion: "Pro grupal + video cinematic + snacks + recuerdo.", precio: 400000, tipo: "fotos", foto: "", activo: true, orden: 6 },
];

export const ADDITIONALS_SEED = [
  { id: "decoracion", nombre: "Decoración romántica", descripcion: "", precio: 60000, unidad: "por pareja", activo: true, orden: 1 },
  { id: "pastel", nombre: "Mini pastel o flores", descripcion: "", precio: 80000, unidad: "", activo: true, orden: 2 },
  { id: "champagne", nombre: "Champagne", descripcion: "", precio: 130000, unidad: "", activo: true, orden: 3 },
  { id: "transporte", nombre: "Transporte puerta a puerta", descripcion: "", precio: 180000, unidad: "", activo: true, orden: 4 },
  { id: "almuerzo", nombre: "Almuerzo especial", descripcion: "", precio: 47000, unidad: "por persona", activo: true, orden: 5 },
  { id: "brunch", nombre: "Brunch Experience", descripcion: "", precio: 32000, unidad: "por persona", activo: true, orden: 6 },
];

/**
 * Semilla de sedes — documento `settings/sedes.items`.
 * Son los valores EXACTOS que hoy están hardcodeados en la web (Landing.jsx).
 * Modelo: { id, city, zone, airport, travel, photo, order, active }.
 * `id` es estable: las reservas referencian la sede por id, no por nombre,
 * así que cambiar la ciudad visible no rompe las reservas existentes.
 *
 * NOTA: el cambio a Boyacá ya se hizo desde el
 * panel; la semilla se actualizó como espejo del valor vivo.
 */
export const SEDES_SEED = [
  { id: "bogota", city: "Bogotá", zone: "Boyacá", airport: "Aerop. General Gustavo Rojas Pinilla", travel: "~2h desde Bogotá", photo: "/img/sede-bogota.jpg", order: 1, active: true },
  { id: "cali", city: "Cali", zone: "Armenia", airport: "Aerop. Internacional El Edén", travel: "~1h30 desde Cali", photo: "/img/sede-cali.jpg", order: 2, active: true },
  { id: "medellin", city: "Medellín", zone: "Puerto Berrío", airport: "Aerop. La Morela – Puerto Berrío", travel: "~2h desde Medellín", photo: "/img/sede-medellin.jpg", order: 3, active: true },
  { id: "bucaramanga", city: "Bucaramanga", zone: "Barrancabermeja", airport: "Aerop. Yariguíes – Barrancabermeja", travel: "~1h desde Bucaramanga", photo: "/img/sede-bucaramanga.jpg", order: 4, active: true },
  { id: "santamarta", city: "Santa Marta", zone: "", airport: "Aerop. Internacional Simón Bolívar", travel: "~1h30 desde Santa Marta", photo: "/img/sede-santamarta.jpg", order: 5, active: true },
];
