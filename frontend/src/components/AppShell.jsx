import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Users,
  FileText,
  Sparkles,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  Package,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ConfirmDialog from "./ConfirmDialog";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, ownerOnly: true },
  { to: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { to: "/forecasting", label: "Forecasting", icon: TrendingUp, ownerOnly: true },
  { to: "/customers", label: "Customers", icon: Users, ownerOnly: true },
  { to: "/products", label: "Products", icon: Package, ownerOnly: true },
  { to: "/reports", label: "Reports", icon: FileText, ownerOnly: true },
  { to: "/assistant", label: "Ask AI", icon: Sparkles, ownerOnly: true },
  { to: "/settings", label: "Settings", icon: SettingsIcon, ownerOnly: true },
];

function SidebarContent({ pathname, onNavigate, onSignOutClick }) {
  const { user } = useAuth();
  const navItems = NAV_ITEMS.filter((item) => !item.ownerOnly || user.role === "owner");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <ShoppingBag className="w-4.5 h-4.5 text-white" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 leading-tight truncate">SmartRetail</p>
          <p className="text-[11px] text-gray-500 leading-tight">Business Console</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || pathname.startsWith(`${to}/`);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
            >
              <Icon className={`w-4.5 h-4.5 ${active ? "text-blue-600" : "text-gray-400"}`} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 pt-2 border-t border-gray-150">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold shrink-0">
            {user.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
            <p className="text-[11px] text-gray-500 capitalize">{user.role}</p>
          </div>
          <button
            onClick={onSignOutClick}
            aria-label="Sign out"
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ title, subtitle, actions, children }) {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-gray-150">
        <SidebarContent pathname={pathname} onSignOutClick={() => setConfirmingLogout(true)} />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white border-r border-gray-150 z-50">
            <SidebarContent
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onSignOutClick={() => setConfirmingLogout(true)}
            />
          </aside>
        </div>
      )}

      <div className="flex-1 md:pl-60 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-150 px-4 md:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>

        <main className="flex-1 px-4 md:px-8 py-6 max-w-6xl w-full mx-auto animate-[fadeInUp_220ms_ease-out]">
          {children}
        </main>
      </div>

      {mobileOpen && (
        <button
          className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-full shadow-popover"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        >
          <X className="w-5 h-5 text-gray-700" />
        </button>
      )}

      <ConfirmDialog
        open={confirmingLogout}
        title="Sign out of SmartRetail?"
        description="You'll need to sign in again to continue."
        confirmLabel="Sign out"
        onConfirm={logout}
        onCancel={() => setConfirmingLogout(false)}
      />
    </div>
  );
}
