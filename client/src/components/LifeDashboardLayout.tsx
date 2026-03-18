import { useAuth } from "@/_core/hooks/useAuth";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  CalendarDays,
  Kanban,
  DollarSign,
  CreditCard,
  Receipt,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032202102/5GsibdpZJXu4DWbuGMNC4c/life-solutions-logo_20f8e656.jpg";

const navItems = [
  { href: "/dashboard", label: "Dashboard Geral", icon: LayoutDashboard, adminOnly: true },
  { href: "/trafego", label: "Tráfego & Front-end", icon: TrendingUp, adminOnly: true },
  { href: "/consultores", label: "Consultores", icon: Users, adminOnly: true },
  { href: "/agendamentos", label: "Agendamentos", icon: CalendarDays, adminOnly: false },
  { href: "/pipeline", label: "Pipeline", icon: Kanban, adminOnly: false },
  { href: "/vendas", label: "Vendas", icon: DollarSign, adminOnly: false },
  { href: "/parcelas", label: "Parcelas Pendentes", icon: CreditCard, adminOnly: true },
  { href: "/despesas", label: "Despesas", icon: Receipt, adminOnly: true },
  { href: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
];

interface LifeDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function LifeDashboardLayout({ children, title }: LifeDashboardLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const notifyMutation = trpc.system.notifyOwner.useMutation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ls-surface)" }}>
        <div className="flex flex-col items-center gap-3">
          <img src={LOGO_URL} alt="Life Solutions" className="h-10 object-contain mb-2" />
          <div className="w-10 h-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const isAdmin = user?.role === "admin";
  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/login";
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "LS";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo Area */}
      <div className="flex items-center justify-center px-4 py-5 border-b border-[var(--sidebar-border)]">
        <img
          src={LOGO_URL}
          alt="Life Solutions"
          className="h-10 object-contain w-full max-w-[160px]"
          style={{ filter: "brightness(1.05)" }}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
                }`}
                style={isActive ? { background: "var(--ls-blue)" } : {}}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-60" />}
              </a>
            </Link>
          );
        })}

        {/* Painel do Consultor (for non-admin) */}
        {!isAdmin && (
          <Link href="/painel">
            <a
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                location === "/painel"
                  ? "text-white shadow-sm"
                  : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
              }`}
              style={location === "/painel" ? { background: "var(--ls-blue)" } : {}}
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Meu Painel</span>
            </a>
          </Link>
        )}
      </nav>

      {/* User Profile */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--sidebar-accent)] transition-colors">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback
              className="text-white text-xs font-bold"
              style={{ background: "var(--ls-blue)" }}
            >
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name || "Usuário"}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--ls-blue-light)" }}>
              {isAdmin ? "Administrador" : "Consultor"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="hover:text-white transition-colors p-1 rounded"
            style={{ color: "var(--ls-blue-light)" }}
            title="Sair"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-center text-[10px] mt-2" style={{ color: "oklch(35% 0.02 250)" }}>
          Life Solutions v1.0
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--ls-surface)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar)" }}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            {/* Logo no header mobile */}
            <img
              src={LOGO_URL}
              alt="Life Solutions"
              className="h-7 object-contain lg:hidden"
            />
            {title && (
              <h1 className="text-base font-semibold text-gray-800 hidden sm:block">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Logo no header desktop (lado direito, pequena) */}
            <img
              src={LOGO_URL}
              alt="Life Solutions"
              className="h-6 object-contain hidden lg:block mr-2 opacity-70"
            />
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => {
                notifyMutation.mutate({ title: "Teste de Notificação", content: "Sistema Life Solutions funcionando corretamente." });
                toast.success("Notificação enviada!");
              }}
            >
              <Bell className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 transition-colors">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback
                      className="text-white text-xs font-bold"
                      style={{ background: "var(--ls-blue)" }}
                    >
                      {getInitials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">{user?.name?.split(" ")[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes">
                    <a className="flex items-center gap-2 cursor-pointer">
                      <User className="w-4 h-4" />
                      Perfil
                    </a>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
