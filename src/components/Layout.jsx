import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Icono } from "./Iconos.jsx";

const GRUPOS = [
  {
    titulo: "Operación",
    items: [
      { to: "/", label: "Resumen", icon: "grafica", end: true },
      { to: "/reservas", label: "Reservas", icon: "paracaidas" },
      { to: "/calendario", label: "Calendario", icon: "calendario" },
    ],
  },
  {
    titulo: "Catálogo",
    items: [
      { to: "/servicios", label: "Servicios", icon: "ticket" },
      { to: "/adicionales", label: "Adicionales", icon: "destello" },
      { to: "/sedes", label: "Sedes", icon: "pin" },
      { to: "/testimonios", label: "Testimonios", icon: "chat" },
      { to: "/galeria", label: "Galería", icon: "imagen" },
    ],
  },
  {
    titulo: "Sistema",
    items: [{ to: "/ajustes", label: "Ajustes", icon: "engranaje" }],
  },
];

export default function Layout() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(auth.currentUser?.email || "");

  // Reactivo al estado real de la sesión (antes leía auth.currentUser en
  // render y podía quedarse con el valor viejo tras un cambio de sesión).
  useEffect(() => onAuthStateChanged(auth, (u) => setEmail(u?.email || "")), []);

  async function salir() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-60 shrink-0 flex-col bg-noche text-slate-300">
        <div className="flex items-center gap-2 border-b border-white/10 px-5 py-4">
          <img src="/img/logo-condorsky.svg" alt="Condor Sky" className="h-9 w-9 rounded-xl" />
          <div className="font-display text-sm font-bold leading-tight text-white">
            Condor <span className="text-blue-400">Sky</span>
            <div className="font-sans text-[10px] font-medium uppercase tracking-widest text-slate-400">
              Panel admin
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {g.titulo}
              </p>
              <div className="space-y-1">
                {g.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        isActive ? "bg-blue-600 text-white" : "hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icono name={n.icon} className="h-4.5 w-4.5 shrink-0" />
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3">
          <p className="truncate px-3 pb-2 text-xs text-slate-400">{email}</p>
          <button
            onClick={salir}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            <Icono name="salir" className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
