import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import Login from "./components/Login";
import Layout from "./components/Layout";
import { Icono } from "./components/Iconos.jsx";
import Dashboard from "./pages/Dashboard";
import Reservas from "./pages/Reservas";
import Calendario from "./pages/Calendario";
import Servicios from "./pages/Servicios";
import Adicionales from "./pages/Adicionales";
import Sedes from "./pages/Sedes";
import Testimonios from "./pages/Testimonios";
import Galeria from "./pages/Galeria";
import Ajustes from "./pages/Ajustes";

function Pantalla({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-center">
      {children}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setUser(null);
        setIsAdmin(false);
        return;
      }
      try {
        const token = await u.getIdTokenResult();
        setIsAdmin(token.claims.admin === true);
      } catch {
        setIsAdmin(false);
      }
      setUser(u);
    });
  }, []);

  if (user === undefined) {
    return <Pantalla><p className="text-sm text-slate-500">Cargando…</p></Pantalla>;
  }
  if (!user) return <Login />;

  if (!isAdmin) {
    return (
      <Pantalla>
        <div className="max-w-sm">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <Icono name="candado" className="h-7 w-7" />
          </span>
          <h1 className="mt-3 text-lg font-bold text-slate-800">Acceso no autorizado</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tu cuenta no tiene permisos de administrador.
          </p>
          <button
            onClick={() => signOut(auth)}
            className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white"
          >
            Cerrar sesión
          </button>
        </div>
      </Pantalla>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="reservas" element={<Reservas />} />
        <Route path="calendario" element={<Calendario />} />
        <Route path="servicios" element={<Servicios />} />
        <Route path="adicionales" element={<Adicionales />} />
        <Route path="sedes" element={<Sedes />} />
        <Route path="testimonios" element={<Testimonios />} />
        <Route path="galeria" element={<Galeria />} />
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
