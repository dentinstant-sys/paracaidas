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

  useEffect(() => onAuthStateChanged(auth, (u) => setEmail(u?.email || "")), []);

  async function salir() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="flex w-64 shrink-0 flex-col bg-noche text-slate-300">
        <div className="flex items-center gap-3 border-b border-white/10 px-6 py-5">
          <img src="/img/logo-condorsky.svg" alt="Vuela Club" className="h-10 w-10 rounded-2xl object-cover" />
          <div className="font-display text-base font-bold tracking-tight text-white">
            Vuela <span className="text-emerald-400">Club</span>
            <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">
              Panel admin
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto p-4">
          {GRUPOS.map((g) => (
            <div key={g.titulo}>
              <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                {g.titulo}
              </p>
              <div className="space-y-1.5">
                {g.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition ${
                        isActive ? "bg-[#008427] text-white shadow-md shadow-emerald-900/30" : "hover:bg-white/10 hover:text-white text-slate-300"
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

        <div className="border-t border-white/10 p-4">
          <p className="truncate px-3 pb-3 text-xs text-slate-400">{email}</p>
          <button
            onClick={salir}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-3 text-xs font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
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