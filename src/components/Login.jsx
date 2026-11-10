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
    } catch (err) {
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
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <img src="/img/logo-condorsky.svg" alt="Vuela Club" className="h-12 w-12 rounded-2xl object-cover shadow-md" />
          <div className="font-display text-2xl font-extrabold text-slate-900">
            Vuela <span className="text-[#008427]">Club</span>
          </div>
        </div>
        <form onSubmit={entrar} className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <h1 className="font-display text-xl font-extrabold text-slate-900">Panel administrativo</h1>
          <p className="mt-1 text-xs text-slate-500">Acceso exclusivo para personal autorizado de operaciones.</p>

          <label htmlFor="login-correo" className="mt-6 block text-xs font-bold uppercase tracking-wider text-slate-600">
            Correo electrónico
          </label>
          <input
            id="login-correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#008427]"
            placeholder="admin@vuelaclub.co"
            autoComplete="username"
            required
          />

          <label htmlFor="login-clave" className="mt-4 block text-xs font-bold uppercase tracking-wider text-slate-600">
            Contraseña
          </label>
          <input
            id="login-clave"
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none focus:border-[#008427]"
            autoComplete="current-password"
            required
          />

          {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700" role="alert">{error}</p>}

          <button
            type="submit"
            disabled={cargando}
            className="mt-6 w-full rounded-2xl bg-[#008427] py-4 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 transition hover:bg-[#00661e] disabled:opacity-50"
          >
            {cargando ? "Ingresando…" : "Ingresar al panel"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs font-semibold text-slate-400">
          Vuela Club · Panel interno
        </p>
      </div>
    </div>
  );
}