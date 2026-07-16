import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const TONE_STYLES = {
  success: { icon: CheckCircle2, iconClass: "text-status-good", ring: "ring-green-100" },
  error: { icon: XCircle, iconClass: "text-status-critical", ring: "ring-red-100" },
};

const DISPLAY_MS = 3200;
const EXIT_MS = 200;

function Toast({ message, tone, leaving }) {
  const { icon: Icon, iconClass, ring } = TONE_STYLES[tone] || TONE_STYLES.success;
  return (
    <div
      className={`flex items-center gap-2.5 bg-white border border-gray-150 shadow-popover ring-1 ${ring} rounded-xl pl-3.5 pr-4 py-3 max-w-sm transition-all duration-200 ${
        leaving ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0 animate-[toastIn_220ms_ease-out]"
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${iconClass}`} strokeWidth={2} />
      <p className="text-sm text-gray-800">{message}</p>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, tone = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone, leaving: false }]);

    setTimeout(() => {
      setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, EXIT_MS);
    }, DISPLAY_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <Toast message={t.message} tone={t.tone} leaving={t.leaving} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
