import { useAuth } from "@/_core/hooks/useAuth";
import { useState, useEffect, useRef, useCallback } from "react";
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
  FileText,
  AlertTriangle,
  StickyNote,
  Save,
  Trash2,
  Calendar,
  Plus,
  Clock,
  ChevronLeft,
  ChevronDown,
  Pencil,
  Check,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  { href: "/servicos-vendidos", label: "Serviços Vendidos", icon: FileText, adminOnly: false },
  { href: "/promessas", label: "Promessas de Pgto", icon: Bell, adminOnly: false },
  { href: "/despesas", label: "Despesas", icon: Receipt, adminOnly: true },
  { href: "/configuracoes", label: "Configurações", icon: Settings, adminOnly: true },
];

const MESES_CAL = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_CAL = ["D","S","T","Q","Q","S","S"];

type EventoAgenda = {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  descricao?: string;
  alarme: boolean;
};

interface LifeDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function LifeDashboardLayout({ children, title }: LifeDashboardLayoutProps) {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const notifyMutation = trpc.system.notifyOwner.useMutation();

  // ─── Bloco de Anotações ───────────────────────────────────────────────────
  const NOTA_KEY = `life_notas_${user?.id || "guest"}`;
  const [notasAberto, setNotasAberto] = useState(false);
  const [notasSalvo, setNotasSalvo] = useState(true);
  const notasTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notasRef = useRef<HTMLTextAreaElement>(null);

  // Carregar texto salvo quando o bloco abre
  useEffect(() => {
    if (notasAberto && notasRef.current) {
      try {
        const saved = localStorage.getItem(NOTA_KEY) || "";
        notasRef.current.value = saved;
      } catch {}
    }
  }, [notasAberto, NOTA_KEY]);

  const handleNotasChange = () => {
    const v = notasRef.current?.value ?? "";
    setNotasSalvo(false);
    if (notasTimer.current) clearTimeout(notasTimer.current);
    notasTimer.current = setTimeout(() => {
      try { localStorage.setItem(NOTA_KEY, v); } catch {}
      setNotasSalvo(true);
    }, 2000);
  };

  function salvarNotasManual() {
    const v = notasRef.current?.value ?? "";
    try { localStorage.setItem(NOTA_KEY, v); } catch {}
    setNotasSalvo(true);
    toast.success("Anotações salvas!");
  }

  function limparNotas() {
    if (!confirm("Apagar todas as anotações?")) return;
    if (notasRef.current) notasRef.current.value = "";
    try { localStorage.removeItem(NOTA_KEY); } catch {}
    setNotasSalvo(true);
    toast.success("Anotações apagadas");
  }

  // ─── Calendário Pessoal ───────────────────────────────────────────────────
  const EVENTOS_KEY = `life_eventos_${user?.id || "guest"}`;
  const [calAberto, setCalAberto] = useState(false);
  const [calMes, setCalMes] = useState(new Date().getMonth());
  const [calAno, setCalAno] = useState(new Date().getFullYear());
  const [eventos, setEventos] = useState<EventoAgenda[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [modalEventoAberto, setModalEventoAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<EventoAgenda | null>(null);
  const [novoEvento, setNovoEvento] = useState({ titulo: "", hora: "", descricao: "", alarme: false });
  const alarmeCheckRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(EVENTOS_KEY);
      if (saved) setEventos(JSON.parse(saved));
    } catch {}
  }, [EVENTOS_KEY]);

  const salvarEventos = useCallback((evs: EventoAgenda[]) => {
    setEventos(evs);
    try { localStorage.setItem(EVENTOS_KEY, JSON.stringify(evs)); } catch {}
  }, [EVENTOS_KEY]);

  // Verificar alarmes a cada 30 segundos
  useEffect(() => {
    const check = () => {
      const agora = new Date();
      const dataHoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;
      const horaAgora = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
      eventos.forEach(ev => {
        if (!ev.alarme || !ev.hora) return;
        if (ev.data !== dataHoje) return;
        if (ev.hora !== horaAgora) return;
        const key = `${ev.id}-${ev.data}-${ev.hora}`;
        if (alarmeCheckRef.current.has(key)) return;
        alarmeCheckRef.current.add(key);
        // Disparar notificação
        toast(`⏰ ${ev.titulo}`, {
          description: ev.descricao || `Evento às ${ev.hora}`,
          duration: 15000,
          action: { label: "OK", onClick: () => {} },
        });
        // Tentar notificação do sistema
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`⏰ ${ev.titulo}`, { body: ev.descricao || `Evento às ${ev.hora}`, icon: LOGO_URL });
        }
        // Som
        try {
          const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
          [0, 0.3, 0.6].forEach(delay => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880;
            gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + 0.4);
          });
        } catch {}
      });
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [eventos]);

  // Solicitar permissão de notificação
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  function getDiasNoMes(ano: number, mes: number) { return new Date(ano, mes + 1, 0).getDate(); }
  function getPrimeiroDia(ano: number, mes: number) { return new Date(ano, mes, 1).getDay(); }

  function abrirNovoEvento(data: string) {
    setDiaSelecionado(data);
    setEventoEditando(null);
    setNovoEvento({ titulo: "", hora: "", descricao: "", alarme: false });
    setModalEventoAberto(true);
  }

  function abrirEditarEvento(ev: EventoAgenda) {
    setEventoEditando(ev);
    setNovoEvento({ titulo: ev.titulo, hora: ev.hora || "", descricao: ev.descricao || "", alarme: ev.alarme });
    setDiaSelecionado(ev.data);
    setModalEventoAberto(true);
  }

  function salvarEvento() {
    if (!novoEvento.titulo.trim()) { toast.error("Informe o título do evento"); return; }
    if (!diaSelecionado) return;
    if (eventoEditando) {
      const updated = eventos.map(e => e.id === eventoEditando.id ? { ...e, ...novoEvento, data: diaSelecionado } : e);
      salvarEventos(updated);
      toast.success("Evento atualizado!");
    } else {
      const ev: EventoAgenda = { id: Date.now().toString(), titulo: novoEvento.titulo, data: diaSelecionado, hora: novoEvento.hora || undefined, descricao: novoEvento.descricao || undefined, alarme: novoEvento.alarme };
      salvarEventos([...eventos, ev]);
      toast.success("Evento criado!");
    }
    setModalEventoAberto(false);
  }

  function excluirEvento(id: string) {
    salvarEventos(eventos.filter(e => e.id !== id));
    toast.success("Evento excluído");
  }

  const eventosDoMes = eventos.filter(e => {
    const d = new Date(e.data + "T00:00:00");
    return d.getMonth() === calMes && d.getFullYear() === calAno;
  });

  const eventosPorDia: Record<number, EventoAgenda[]> = {};
  eventosDoMes.forEach(e => {
    const dia = new Date(e.data + "T00:00:00").getDate();
    if (!eventosPorDia[dia]) eventosPorDia[dia] = [];
    eventosPorDia[dia].push(e);
  });

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  // ─── Render ───────────────────────────────────────────────────────────────
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
    if (typeof window !== "undefined") window.location.href = "/login";
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
        <img src={LOGO_URL} alt="Life Solutions" className="h-10 object-contain w-full max-w-[160px]" style={{ filter: "brightness(1.05)" }} />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${isActive ? "text-white shadow-sm" : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"}`}
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

        {!isAdmin && (
          <Link href="/painel">
            <a
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${location === "/painel" ? "text-white shadow-sm" : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"}`}
              style={location === "/painel" ? { background: "var(--ls-blue)" } : {}}
              onClick={() => setSidebarOpen(false)}
            >
              <LayoutDashboard className="w-4 h-4 flex-shrink-0" />
              <span>Meu Painel</span>
            </a>
          </Link>
        )}

        {/* ─── Bloco de Anotações ─── */}
        <div className="mt-2 border-t border-[var(--sidebar-border)] pt-2">
          <button
            onClick={() => { setNotasAberto(!notasAberto); if (calAberto) setCalAberto(false); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-150 text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
          >
            <StickyNote className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Anotações</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${notasAberto ? "rotate-180" : ""}`} />
          </button>
          {notasAberto && (
            <div className="mx-2 mb-2 rounded-lg overflow-hidden border border-[var(--sidebar-border)]" style={{ background: "oklch(18% 0.02 250)" }}>
              <textarea
                ref={notasRef}
                onInput={handleNotasChange}
                placeholder="Escreva suas ideias aqui..."
                className="min-h-[120px] w-full text-xs text-white border-0 rounded-none resize-none bg-transparent placeholder:text-gray-500 p-3 focus:outline-none"
              />
              <div className="flex items-center justify-between px-2 py-1 border-t border-[var(--sidebar-border)]">
                <span className="text-[10px]" style={{ color: notasSalvo ? "oklch(60% 0.15 145)" : "oklch(70% 0.12 50)" }}>
                  {notasSalvo ? "✓ Salvo" : "Salvando..."}
                </span>
                <div className="flex gap-1">
                  <button onClick={salvarNotasManual} title="Salvar agora" className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
                    <Save className="w-3 h-3" />
                  </button>
                  <button onClick={limparNotas} title="Apagar tudo" className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── Calendário Pessoal ─── */}
        <div className="border-t border-[var(--sidebar-border)] pt-2">
          <button
            onClick={() => { setCalAberto(!calAberto); if (notasAberto) setNotasAberto(false); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full transition-all duration-150 text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-white"
          >
            <Calendar className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Agenda Pessoal</span>
            {eventos.filter(e => e.data === hojeStr).length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500 text-white font-bold">
                {eventos.filter(e => e.data === hojeStr).length}
              </span>
            )}
            <ChevronDown className={`w-3 h-3 transition-transform ${calAberto ? "rotate-180" : ""}`} />
          </button>
          {calAberto && (
            <div className="mx-2 mb-2 rounded-lg overflow-hidden border border-[var(--sidebar-border)]" style={{ background: "oklch(18% 0.02 250)" }}>
              {/* Cabeçalho do mês */}
              <div className="flex items-center justify-between px-2 py-2 border-b border-[var(--sidebar-border)]">
                <button onClick={() => { if (calMes === 0) { setCalMes(11); setCalAno(calAno - 1); } else setCalMes(calMes - 1); }} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-xs font-semibold text-white">{MESES_FULL[calMes]} {calAno}</span>
                <button onClick={() => { if (calMes === 11) { setCalMes(0); setCalAno(calAno + 1); } else setCalMes(calMes + 1); }} className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white">
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              {/* Grade do calendário */}
              <div className="p-2">
                <div className="grid grid-cols-7 mb-1">
                  {DIAS_CAL.map((d, i) => (
                    <div key={i} className="text-center text-[9px] font-semibold" style={{ color: "oklch(50% 0.02 250)" }}>{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: getPrimeiroDia(calAno, calMes) }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: getDiasNoMes(calAno, calMes) }).map((_, i) => {
                    const dia = i + 1;
                    const dataStr = `${calAno}-${String(calMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
                    const temEvento = eventosPorDia[dia]?.length > 0;
                    const ehHoje = dataStr === hojeStr;
                    return (
                      <button
                        key={dia}
                        onClick={() => abrirNovoEvento(dataStr)}
                        className={`relative text-[10px] font-medium rounded h-6 w-full flex items-center justify-center transition-all ${ehHoje ? "text-white font-bold" : "text-gray-300 hover:bg-white/10"}`}
                        style={ehHoje ? { background: "var(--ls-blue)" } : {}}
                      >
                        {dia}
                        {temEvento && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-amber-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Eventos do mês */}
              {eventosDoMes.length > 0 && (
                <div className="border-t border-[var(--sidebar-border)] px-2 py-2 max-h-36 overflow-y-auto">
                  <p className="text-[10px] font-semibold mb-1" style={{ color: "oklch(55% 0.02 250)" }}>EVENTOS DO MÊS</p>
                  {eventosDoMes.sort((a, b) => a.data.localeCompare(b.data) || (a.hora || "").localeCompare(b.hora || "")).map(ev => {
                    const diaEv = new Date(ev.data + "T00:00:00").getDate();
                    const ehHoje = ev.data === hojeStr;
                    return (
                      <div key={ev.id} className={`flex items-start gap-1.5 py-1 border-b border-white/5 last:border-0 group ${ehHoje ? "bg-blue-500/10 -mx-2 px-2 rounded" : ""}`}>
                        <div className="flex-shrink-0 text-center">
                          <p className="text-[10px] font-bold text-blue-400">{diaEv}</p>
                          {ev.hora && <p className="text-[9px] text-gray-500">{ev.hora}</p>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-medium text-white truncate">{ev.titulo}</p>
                          {ev.descricao && <p className="text-[9px] text-gray-500 truncate">{ev.descricao}</p>}
                        </div>
                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {ev.alarme && <Clock className="w-2.5 h-2.5 text-amber-400 flex-shrink-0 mt-0.5" />}
                          <button onClick={() => abrirEditarEvento(ev)} className="p-0.5 rounded hover:bg-white/10 text-gray-500 hover:text-white">
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          <button onClick={() => excluirEvento(ev.id)} className="p-0.5 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400">
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="px-2 py-1.5 border-t border-[var(--sidebar-border)]">
                <button
                  onClick={() => abrirNovoEvento(hojeStr)}
                  className="flex items-center gap-1.5 text-[10px] font-medium w-full px-2 py-1 rounded hover:bg-white/10 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Novo evento hoje
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* User Profile */}
      <div className="px-3 py-3 border-t border-[var(--sidebar-border)]">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--sidebar-accent)] transition-colors">
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="text-white text-xs font-bold" style={{ background: "var(--ls-blue)" }}>
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{user?.name || "Usuário"}</p>
            <p className="text-[10px] truncate" style={{ color: "var(--ls-blue-light)" }}>
              {isAdmin ? "Administrador" : "Consultor"}
            </p>
          </div>
          <button onClick={handleLogout} className="hover:text-white transition-colors p-1 rounded" style={{ color: "var(--ls-blue-light)" }} title="Sair">
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
      {/* Modal de Evento */}
      {modalEventoAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModalEventoAberto(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-5 w-80 max-w-[90vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-sm">{eventoEditando ? "Editar Evento" : "Novo Evento"}</h3>
              <button onClick={() => setModalEventoAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Data</label>
                <Input
                  type="date"
                  value={diaSelecionado || ""}
                  onChange={e => setDiaSelecionado(e.target.value)}
                  className="text-sm h-8"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Título *</label>
                <Input
                  placeholder="Ex: Reunião com cliente"
                  value={novoEvento.titulo}
                  onChange={e => setNovoEvento(p => ({ ...p, titulo: e.target.value }))}
                  className="text-sm h-8"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Horário</label>
                <Input
                  type="time"
                  value={novoEvento.hora}
                  onChange={e => setNovoEvento(p => ({ ...p, hora: e.target.value }))}
                  className="text-sm h-8"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Descrição</label>
                <Textarea
                  placeholder="Detalhes do evento..."
                  value={novoEvento.descricao}
                  onChange={e => setNovoEvento(p => ({ ...p, descricao: e.target.value }))}
                  className="text-sm min-h-[60px] resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setNovoEvento(p => ({ ...p, alarme: !p.alarme }))}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${novoEvento.alarme ? "bg-blue-600 border-blue-600" : "border-gray-300"}`}
                >
                  {novoEvento.alarme && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <span className="text-xs text-gray-600">Ativar alarme no horário</span>
                <Bell className="w-3 h-3 text-amber-500" />
              </label>
              {novoEvento.alarme && !novoEvento.hora && (
                <p className="text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">⚠ Informe o horário para o alarme funcionar</p>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setModalEventoAberto(false)}>Cancelar</Button>
              <Button size="sm" className="flex-1" style={{ background: "var(--ls-blue)" }} onClick={salvarEvento}>
                {eventoEditando ? "Salvar" : "Criar Evento"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "var(--sidebar)" }}
      >
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <img src={LOGO_URL} alt="Life Solutions" className="h-7 object-contain lg:hidden" />
            {title && <h1 className="text-base font-semibold text-gray-800 hidden sm:block">{title}</h1>}
          </div>

          <div className="flex items-center gap-2">
            <img src={LOGO_URL} alt="Life Solutions" className="h-6 object-contain hidden lg:block mr-2 opacity-70" />
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
                    <AvatarFallback className="text-white text-xs font-bold" style={{ background: "var(--ls-blue)" }}>
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
