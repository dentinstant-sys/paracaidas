import { createContext, useContext, useState, useCallback } from "react";

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const quitar = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback((msg, tipo = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, tipo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tipo === "error" ? 8000 : 3800);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[60] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-xs font-bold shadow-xl ${
              t.tipo === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white border border-slate-800"
            }`}
          >
            <span>{t.msg}</span>
            {t.tipo === "error" && (
              <button
                onClick={() => quitar(t.id)}
                aria-label="Cerrar aviso"
                className="shrink-0 rounded-lg p-1 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}