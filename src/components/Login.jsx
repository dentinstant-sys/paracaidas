import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
      // El gate de App.jsx valida el rol admin tras el login.
    } catch (err) {
      // Antes TODO error decía "credenciales incorrectas", incluso sin internet.
      const codigo = err?.code || "";
      if (codigo === "auth/network-request-failed") {
        setError("Sin conexión. Revisa tu internet e inténtalo de nuevo.");
      } else if (codigo === "auth/too-many-requests") {
        setError("Demasiados intentos. Espera unos minutos y vuelve a intentar.");
      } else {
        setError("Credenciales incorrectas o usuario no autorizado.");
      }
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img src="/img/logo-condorsky.svg" alt="Condor Sky" className="h-10 w-10 rounded-xl" />
          <div className="text-xl font-extrabold text-slate-800">
            Condor <span className="text-blue-600">Sky</span>
          </div>
        </div>
        <form onSubmit={entrar} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-bold text-slate-800">Panel administrativo</h1>
          <p className="mt-1 text-sm text-slate-500">Acceso solo para personal autorizado.</p>

          <label htmlFor="login-correo" className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Correo
          </label>
          <input
            id="login-correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            placeholder="admin@condorsky.co"
            autoComplete="username"
            required
          />

          <label htmlFor="login-clave" className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600">
            Contraseña
          </label>
          <input
            id="login-clave"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            autoComplete="current-password"
            required
          />

          {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">
          Condor Sky · Panel interno
        </p>
      </div>
    </div>
  );
}
