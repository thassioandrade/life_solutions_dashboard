import { useState, useMemo } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign, TrendingUp, Users, CalendarDays,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Wallet, CreditCard, AlertCircle, CheckCircle2, Bell, Phone, Download, AlertTriangle, Loader2
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import DrillDownModal from "@/components/DrillDownModal";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

type DrillDownCard = "coletado" | "faturado" | "aReceber" | "comissoes" | "coletadoParcelas" | "comissaoParcelas" | "aguardandoBaixa" | null;

function MetricCard({ title, value, subtitle, icon: Icon, color = "green", trend, onClick }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color?: string; trend?: "up" | "down" | "neutral"; onClick?: () => void;
}) {
  const colorMap: Record<string, string> = {
    green: "bg-blue-50 border-blue-200 text-blue-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-700",
    purple: "bg-purple-50 border-purple-200 text-purple-700",
  };
  const iconColorMap: Record<string, string> = {
    green: "text-blue-600 bg-blue-100",
    blue: "text-blue-600 bg-blue-100",
    amber: "text-amber-600 bg-amber-100",
    red: "text-red-600 bg-red-100",
    purple: "text-purple-600 bg-purple-100",
  };
  return (
    <div
      className={`rounded-xl border p-4 ${colorMap[color] || colorMap.green} ${onClick ? "cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all" : ""}`}
      onClick={onClick}
      title={onClick ? "Clique para ver detalhes" : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
          {onClick && <p className="text-xs opacity-50 mt-1 font-medium">🔍 Ver detalhes</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconColorMap[color] || iconColorMap.green}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [drillDown, setDrillDown] = useState<DrillDownCard>(null);

  if (user && user.role !== "admin") {
    navigate("/painel");
    return null;
  }

  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();
  const { data: promessasHoje } = trpc.promessas.hoje.useQuery();
  const { data: servicosVendidos } = trpc.servicosVendidos.byPeriodo.useQuery({ mes, ano });
  const [filtroConsultorParcelas, setFiltroConsultorParcelas] = useState<number | null>(null);
  const { data: todasParcelas, refetch: refetchParcelas } = trpc.parcelas.listAll.useQuery();
  const { data: coletadoParcelasAdmin, refetch: refetchColetado } = trpc.parcelas.coletadoAdmin.useQuery({ mes, ano });

  // Estado do modal de baixa no dashboard
  const [modalBaixaDash, setModalBaixaDash] = useState<{ id: number; valor: number; clienteNome: string; consultorNome: string } | null>(null);
  const [baixaValor, setBaixaValor] = useState("");
  const [baixaForma, setBaixaForma] = useState("");
  const utils = trpc.useUtils();

  // Queries de drill-down (lazy — só buscam quando o card está aberto)
  const { data: detalheColetado, isLoading: loadingColetado } = trpc.dashboardDetalhe.coletado.useQuery(
    { mes, ano }, { enabled: drillDown === "coletado" }
  );
  const { data: detalheFaturado, isLoading: loadingFaturado } = trpc.dashboardDetalhe.faturado.useQuery(
    { mes, ano }, { enabled: drillDown === "faturado" }
  );
  const { data: detalheAReceber, isLoading: loadingAReceber } = trpc.dashboardDetalhe.aReceber.useQuery(
    { mes, ano }, { enabled: drillDown === "aReceber" }
  );
  const { data: detalheComissoes, isLoading: loadingComissoes } = trpc.dashboardDetalhe.comissoes.useQuery(
    { mes, ano }, { enabled: drillDown === "comissoes" }
  );
  const { data: detalheColetadoParcelas, isLoading: loadingColetadoParcelas } = trpc.dashboardDetalhe.coletadoParcelas.useQuery(
    { mes, ano }, { enabled: drillDown === "coletadoParcelas" }
  );
  const { data: detalheComissaoParcelas, isLoading: loadingComissaoParcelas } = trpc.dashboardDetalhe.comissaoParcelas.useQuery(
    { mes, ano }, { enabled: drillDown === "comissaoParcelas" }
  );
  const { data: detalheAguardandoBaixa, isLoading: loadingAguardandoBaixa } = trpc.dashboardDetalhe.aguardandoBaixa.useQuery(
    undefined, { enabled: drillDown === "aguardandoBaixa" }
  );

  const baixarMutationDash = trpc.parcelas.baixar.useMutation({
    onSuccess: (data) => {
      toast.success(data.saldoCriado > 0
        ? `Parcela confirmada! Nova parcela criada para o saldo de ${formatCurrency(data.saldoCriado)}.`
        : "Parcela confirmada com sucesso!"
      );
      setModalBaixaDash(null);
      setBaixaValor("");
      setBaixaForma("");
      refetchParcelas();
      refetchColetado();
      utils.parcelas.listPendentes.invalidate();
      utils.parcelas.coletadoAdmin.invalidate();
      utils.parcelas.listAll.invalidate();
      utils.dashboard.stats.invalidate();
    },
    onError: (e) => toast.error("Erro ao confirmar baixa: " + e.message),
  });

  function abrirModalBaixaDash(p: any) {
    setModalBaixaDash({ id: p.id, valor: parseFloat(String(p.valor || 0)), clienteNome: p.clienteNome || `Parcela #${p.id}`, consultorNome: p.consultorNome || '—' });
    setBaixaValor(String(parseFloat(String(p.valor || 0))));
    setBaixaForma("");
  }

  function diasAtrasoAdmin(vencimento: Date | string) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const venc = new Date(vencimento);
    venc.setHours(0, 0, 0, 0);
    return Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24));
  }

  const parcelasFiltradas = useMemo(() => {
    if (!todasParcelas) return [];
    return todasParcelas.filter((p: any) => {
      if (filtroConsultorParcelas && p.consultorId !== filtroConsultorParcelas) return false;
      return true;
    });
  }, [todasParcelas, filtroConsultorParcelas]);

  const devedoresAdmin = useMemo(() => {
    const atrasadas = parcelasFiltradas.filter((p: any) => (p.status === 'pendente' || p.status === 'aguardando_confirmacao') && diasAtrasoAdmin(p.vencimento) > 0);
    const map = new Map<string, { nome: string; cpf?: string; telefone?: string; consultorNome?: string; totalDevido: number; maxAtraso: number; parcelas: any[] }>();
    for (const p of atrasadas) {
      const key = p.clienteNome || 'Desconhecido';
      if (!map.has(key)) map.set(key, { nome: key, cpf: p.clienteCpfCnpj || undefined, telefone: p.clienteTelefone || undefined, consultorNome: p.consultorNome || undefined, totalDevido: 0, maxAtraso: 0, parcelas: [] });
      const entry = map.get(key)!;
      entry.totalDevido += parseFloat(String(p.valor || 0));
      entry.maxAtraso = Math.max(entry.maxAtraso, diasAtrasoAdmin(p.vencimento));
      entry.parcelas.push(p);
    }
    return Array.from(map.values()).sort((a, b) => b.maxAtraso - a.maxAtraso);
  }, [parcelasFiltradas]);

  const parcelasPendentes = useMemo(() => parcelasFiltradas.filter((p: any) => p.status === 'pendente' || p.status === 'aguardando_confirmacao'), [parcelasFiltradas]);

  const qtdLimpaAdmin = (servicosVendidos || []).filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("limpa"))).length;
  const qtdRatingAdmin = (servicosVendidos || []).filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("rating"))).length;

  function exportarLimpaExcel() {
    const rows = (servicosVendidos || []).filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("limpa"))).map(v => {
      const consultor = consultores?.find(c => c.id === v.consultorId);
      return { "Nome do Cliente": v.clienteNome, "CPF/CNPJ": v.clienteCpfCnpj || "", "Telefone": v.clienteTelefone || "", "Serviço": "Limpa Nome", "Data da Venda": new Date(v.dataVenda).toLocaleDateString("pt-BR"), "Consultora": consultor?.nome || "" };
    });
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Limpa Nome");
    XLSX.writeFile(wb, `limpa-nome-${MESES[mes-1]}-${ano}.xlsx`);
  }
  function exportarRatingExcel() {
    const rows = (servicosVendidos || []).filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("rating"))).map(v => {
      const consultor = consultores?.find(c => c.id === v.consultorId);
      return { "Nome do Cliente": v.clienteNome, "CPF/CNPJ": v.clienteCpfCnpj || "", "Telefone": v.clienteTelefone || "", "Serviço": "Rating Bancário", "Data da Venda": new Date(v.dataVenda).toLocaleDateString("pt-BR"), "Consultora": consultor?.nome || "" };
    });
    const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rating Bancário");
    XLSX.writeFile(wb, `rating-bancario-${MESES[mes-1]}-${ano}.xlsx`);
  }

  const handlePrevMes = () => {
    if (mes === 1) { setMes(12); setAno(ano - 1); } else setMes(mes - 1);
  };
  const handleNextMes = () => {
    if (mes === 12) { setMes(1); setAno(ano + 1); } else setMes(mes + 1);
  };

  // Helpers para o DrillDownModal
  function normalizarItens(data: any) {
    if (!data?.itens) return [];
    return data.itens.map((item: any) => ({
      ...item,
      data: item.data ? new Date(item.data) : new Date(),
    }));
  }

  return (
    <LifeDashboardLayout title="Dashboard Geral">
      <div className="space-y-6">
        {/* Alerta de Promessas do Dia */}
        {promessasHoje && promessasHoje.length > 0 && (
          <div className="bg-violet-50 border-2 border-violet-400 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-violet-600 animate-pulse" />
              <p className="font-bold text-violet-800 text-base">
                {promessasHoje.length} promessa{promessasHoje.length > 1 ? "s" : ""} de pagamento para HOJE!
              </p>
              <a href="/promessas" className="ml-auto text-xs text-violet-600 underline font-medium">Ver todas</a>
            </div>
            <div className="space-y-2">
              {(promessasHoje as { id: number; clienteNome: string; clienteTelefone?: string | null; valor?: string | null; consultorId?: number | null }[]).map(p => {
                const consultor = consultores?.find(c => c.id === p.consultorId);
                return (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-violet-200 flex-wrap gap-2">
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{p.clienteNome}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        {p.clienteTelefone && (
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <Phone className="w-3 h-3" />
                            {p.clienteTelefone}
                          </span>
                        )}
                        {p.valor && <span className="text-emerald-600 font-medium">{formatCurrency(parseFloat(p.valor))}</span>}
                        {consultor && <span className="text-gray-400">Consultora: {consultor.nome}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Period selector */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Dashboard Geral</h2>
            <p className="text-sm text-gray-500">Todos os dados integrados (vendas + agendamentos)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMes} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 min-w-[130px] text-center">
              {MESES[mes - 1]} {ano}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMes} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <>
            {/* Main metrics — todos clicáveis */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Coletado" value={formatCurrency(stats.totalColetado)} subtitle="Recebido à vista"
                icon={Wallet} color="green"
                onClick={() => setDrillDown("coletado")}
              />
              <MetricCard
                title="Faturado" value={formatCurrency(stats.totalFaturado)} subtitle="Total das vendas"
                icon={TrendingUp} color="blue"
                onClick={() => setDrillDown("faturado")}
              />
              <MetricCard
                title="A Receber" value={formatCurrency(stats.totalParcelasPendentes)} subtitle="Parcelas pendentes"
                icon={CreditCard} color="amber"
                onClick={() => setDrillDown("aReceber")}
              />
              <MetricCard
                title="Comissões" value={formatCurrency(stats.totalComissoes)} subtitle="A pagar consultores"
                icon={Users} color="purple"
                onClick={() => setDrillDown("comissoes")}
              />
            </div>

            {/* Cards de Coletado Parcelas + Aguardando Baixa (sempre visíveis) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Coletado Parcelas */}
              <div
                className="rounded-xl border border-teal-200 bg-teal-50 p-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                onClick={() => setDrillDown("coletadoParcelas")}
                title="Clique para ver detalhes"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-teal-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Coletado Parcelas</p>
                    <p className="text-xs text-teal-500">{MESES[mes-1]} {ano}</p>
                  </div>
                  <span className="ml-auto text-xs text-teal-500 font-medium">🔍 Detalhes</span>
                </div>
                <p className="text-2xl font-bold text-teal-800">{formatCurrency(coletadoParcelasAdmin?.totalColetado ?? 0)}</p>
                {coletadoParcelasAdmin && coletadoParcelasAdmin.porConsultor.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {coletadoParcelasAdmin.porConsultor.map((c: any) => (
                      <div key={c.consultorId} className="flex justify-between text-xs bg-white rounded px-2 py-1 border border-teal-100">
                        <span className="font-medium text-gray-700">{c.consultorNome}</span>
                        <span className="font-bold text-teal-700">{formatCurrency(c.totalColetado)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(!coletadoParcelasAdmin || coletadoParcelasAdmin.totalColetado === 0) && (
                  <p className="text-xs text-teal-400 mt-1">Nenhuma parcela confirmada ainda</p>
                )}
              </div>

              {/* Comissão a Pagar Parcelas */}
              <div
                className="rounded-xl border border-amber-200 bg-amber-50 p-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                onClick={() => setDrillDown("comissaoParcelas")}
                title="Clique para ver detalhes"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-amber-700">Comissão a Pagar (Parcelas)</p>
                    <p className="text-xs text-amber-500">Sobre parcelas recebidas no mês</p>
                  </div>
                  <span className="ml-auto text-xs text-amber-500 font-medium">🔍 Detalhes</span>
                </div>
                <p className="text-2xl font-bold text-amber-800">{formatCurrency(coletadoParcelasAdmin?.totalComissao ?? 0)}</p>
                {coletadoParcelasAdmin && coletadoParcelasAdmin.porConsultor.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {coletadoParcelasAdmin.porConsultor.map((c: any) => (
                      <div key={c.consultorId} className="flex justify-between text-xs bg-white rounded px-2 py-1 border border-amber-100">
                        <span className="font-medium text-gray-700">{c.consultorNome}</span>
                        <span className="font-bold text-amber-700">{formatCurrency(c.totalComissao)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {(!coletadoParcelasAdmin || coletadoParcelasAdmin.totalComissao === 0) && (
                  <p className="text-xs text-amber-400 mt-1">Nenhuma comissão gerada ainda</p>
                )}
              </div>

              {/* Aguardando Baixa */}
              {(() => {
                const aguardando = parcelasFiltradas.filter((p: any) => p.status === 'aguardando_confirmacao');
                const totalAguardando = aguardando.reduce((s: number, p: any) => s + parseFloat(String(p.valor || 0)), 0);
                return (
                  <div
                    className="rounded-xl border border-blue-200 bg-blue-50 p-4 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                    onClick={() => setDrillDown("aguardandoBaixa")}
                    title="Clique para ver detalhes"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-blue-700" />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Aguardando Baixa</p>
                        <p className="text-xs text-blue-500">{aguardando.length} parcela{aguardando.length !== 1 ? 's' : ''} pendente{aguardando.length !== 1 ? 's' : ''}</p>
                      </div>
                      <span className="ml-auto text-xs text-blue-500 font-medium">🔍 Detalhes</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalAguardando)}</p>
                    {aguardando.length === 0 && <p className="text-xs text-blue-400 mt-1">Nenhuma parcela aguardando</p>}
                    {aguardando.length > 0 && <p className="text-xs text-blue-600 mt-1 font-medium">↓ Ver detalhes abaixo</p>}
                  </div>
                );
              })()}
            </div>

            {/* Card de Parcelas Aguardando Baixa */}
            {(() => {
              const aguardando = parcelasFiltradas.filter((p: any) => p.status === 'aguardando_confirmacao');
              if (aguardando.length === 0) return null;
              const totalAguardando = aguardando.reduce((s: number, p: any) => s + parseFloat(String(p.valor || 0)), 0);
              return (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-blue-700" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Aguardando Confirmação de Baixa</p>
                      <p className="text-xs text-blue-500">{aguardando.length} parcela{aguardando.length !== 1 ? 's' : ''} — consultor(a) marcou como recebida</p>
                    </div>
                    <p className="text-xl font-bold text-blue-800">{formatCurrency(totalAguardando)}</p>
                  </div>
                  <div className="space-y-2">
                    {aguardando.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-200 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{p.clienteNome || `Parcela #${p.id}`}</p>
                          <p className="text-xs text-gray-500">{p.consultorNome || '—'} · Venc: {new Date(p.vencimento).toLocaleDateString('pt-BR')}</p>
                          {p.formaPagamento && <p className="text-xs text-blue-600 font-medium">Forma: {p.formaPagamento}</p>}
                          {p.comprovanteUrl && (
                            <a href={p.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 underline">Ver comprovante</a>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-sm font-bold text-blue-700">{formatCurrency(parseFloat(String(p.valor || 0)))}</span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); abrirModalBaixaDash(p); }}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors"
                          >
                            ✓ Confirmar Baixa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Serviços vendidos com exportação Excel */}
            {(qtdLimpaAdmin > 0 || qtdRatingAdmin > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {qtdLimpaAdmin > 0 && (
                  <div className="rounded-xl p-3 border bg-indigo-50 border-indigo-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-base">🧹</div>
                      <div>
                        <p className="text-sm font-bold text-indigo-700">{qtdLimpaAdmin}x Limpa Nome</p>
                        <p className="text-xs text-indigo-500">{MESES[mes-1]} {ano}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={exportarLimpaExcel} className="w-full text-white text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                      <Download className="w-3.5 h-3.5" /> Exportar Excel Jurídico
                    </Button>
                  </div>
                )}
                {qtdRatingAdmin > 0 && (
                  <div className="rounded-xl p-3 border bg-violet-50 border-violet-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center text-base">⭐</div>
                      <div>
                        <p className="text-sm font-bold text-violet-700">{qtdRatingAdmin}x Rating Bancário</p>
                        <p className="text-xs text-violet-500">{MESES[mes-1]} {ano}</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={exportarRatingExcel} className="w-full text-white text-xs gap-1.5 bg-violet-600 hover:bg-violet-700">
                      <Download className="w-3.5 h-3.5" /> Exportar Excel Jurídico
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Financial summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Resumo Financeiro — Controle Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { label: "Coletado Bruto", value: stats.totalColetado, positive: true },
                      ...(coletadoParcelasAdmin && coletadoParcelasAdmin.totalColetado > 0 ? [{ label: "(+) Coletado Parcelas", value: coletadoParcelasAdmin.totalColetado, positive: true }] : []),
                      { label: "(-) Custos de Serviços", value: stats.totalCustos, positive: false },
                      { label: "(-) Comissões", value: stats.totalComissoes, positive: false },
                      ...(coletadoParcelasAdmin && coletadoParcelasAdmin.totalComissao > 0 ? [{ label: "(-) Comissão Parcelas", value: coletadoParcelasAdmin.totalComissao, positive: false }] : []),
                      { label: "(-) Despesas Operacionais", value: stats.totalDespesas, positive: false },
                      { label: "(-) Salários", value: stats.totalSalarios, positive: false },
                      { label: "(-) Investimento em Tráfego", value: stats.investimento, positive: false },
                    ].map(({ label, value, positive }) => (
                      <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-600">{label}</span>
                        <span className={`text-sm font-semibold ${positive ? "text-emerald-600" : "text-red-500"}`}>
                          {positive ? "+" : "-"} {formatCurrency(value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t-2 border-gray-200">
                      <span className="text-sm font-bold text-gray-800">Lucro Líquido</span>
                      <span className={`text-base font-bold ${stats.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(stats.lucroLiquido)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Agendamentos — {MESES[mes - 1]} {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total", value: stats.agendamentos.total, color: "text-gray-700" },
                      { label: "Realizadas", value: stats.agendamentos.realizadas, color: "text-emerald-600" },
                      { label: "Confirmadas", value: stats.agendamentos.confirmadas, color: "text-blue-600" },
                      { label: "No-show", value: stats.agendamentos.noshow, color: "text-red-500" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {stats.agendamentos.realizadas > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500 text-center">
                        Taxa de fechamento: <span className="font-bold text-emerald-600">
                          {Math.round((stats.totalVendas / stats.agendamentos.realizadas) * 100)}%
                        </span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabela de Vendas */}
            {stats.vendas && stats.vendas.length > 0 && (
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">
                    Vendas do Período — {MESES[mes - 1]} {ano} ({stats.vendas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Faturado</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Coletado</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Comissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(stats.vendas as any[]).map((venda: any) => {
                          const consultor = consultores?.find(c => c.id === venda.consultorId);
                          const coletado = parseFloat(String(venda.valorColetado || 0));
                          const custo = parseFloat(String(venda.custoServico || 0));
                          const pct = parseFloat(String(venda.comissaoPercent || 10));
                          const comissao = (coletado - custo) * pct / 100;
                          return (
                            <tr key={venda.id} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="py-2 px-3 text-xs text-gray-500">{new Date(venda.dataVenda).toLocaleDateString("pt-BR")}</td>
                              <td className="py-2 px-3">
                                <p className="font-medium text-gray-800">{venda.clienteNome}</p>
                                {consultor && <p className="text-xs text-gray-400">{consultor.nome}</p>}
                              </td>
                              <td className="py-2 px-3">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${venda.tipo === "PF" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                                  {venda.tipo}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-medium text-gray-700">{formatCurrency(parseFloat(String(venda.valorFaturado || 0)))}</td>
                              <td className="py-2 px-3 text-right font-medium text-blue-600">{formatCurrency(parseFloat(String(venda.valorColetado || 0)))}</td>
                              <td className="py-2 px-3 text-right font-medium text-amber-600">{formatCurrency(comissao)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {stats.vendas?.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhuma venda registrada neste período</p>
              </div>
            )}

            {/* Seção de Parcelas e Devedores */}
            <div className="space-y-4">
              {/* Filtro por vendedora */}
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-bold text-gray-800">Controle de Parcelas e Devedores</h3>
                <Select
                  value={filtroConsultorParcelas ? String(filtroConsultorParcelas) : "todos"}
                  onValueChange={v => setFiltroConsultorParcelas(v === "todos" ? null : Number(v))}
                >
                  <SelectTrigger className="w-48 h-8 text-sm">
                    <SelectValue placeholder="Todas as vendedoras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as vendedoras</SelectItem>
                    {(consultores || []).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cards de resumo de parcelas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl border p-3 bg-amber-50 border-amber-200">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">A Receber</p>
                  <p className="text-xl font-bold text-amber-800 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelasPendentes.reduce((s: number, p: any) => s + parseFloat(String(p.valor || 0)), 0))}</p>
                  <p className="text-xs text-amber-600 mt-0.5">{parcelasPendentes.length} parcela{parcelasPendentes.length !== 1 ? 's' : ''} pendente{parcelasPendentes.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-xl border p-3 bg-red-50 border-red-200">
                  <p className="text-xs font-medium text-red-700 uppercase tracking-wide">Em Atraso</p>
                  <p className="text-xl font-bold text-red-800 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelasFiltradas.filter((p: any) => (p.status === 'pendente' || p.status === 'aguardando_confirmacao') && diasAtrasoAdmin(p.vencimento) > 0).reduce((s: number, p: any) => s + parseFloat(String(p.valor || 0)), 0))}</p>
                  <p className="text-xs text-red-600 mt-0.5">{devedoresAdmin.length} devedor{devedoresAdmin.length !== 1 ? 'es' : ''}</p>
                </div>
                <div className="rounded-xl border p-3 bg-green-50 border-green-200">
                  <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Recebido</p>
                  <p className="text-xl font-bold text-green-800 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelasFiltradas.filter((p: any) => p.status === 'pago').reduce((s: number, p: any) => s + parseFloat(String(p.valor || 0)), 0))}</p>
                  <p className="text-xs text-green-600 mt-0.5">{parcelasFiltradas.filter((p: any) => p.status === 'pago').length} paga{parcelasFiltradas.filter((p: any) => p.status === 'pago').length !== 1 ? 's' : ''}</p>
                </div>
                <div className="rounded-xl border p-3 bg-purple-50 border-purple-200">
                  <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">Comissões Futuras</p>
                  <p className="text-xl font-bold text-purple-800 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(parcelasPendentes.reduce((s: number, p: any) => s + (parseFloat(String(p.valor || 0)) - parseFloat(String(p.custoServico || 0))) * parseFloat(String(p.comissaoPercent || 10)) / 100, 0))}</p>
                  <p className="text-xs text-purple-600 mt-0.5">A pagar consultoras</p>
                </div>
              </div>

              {/* Lista de Devedores */}
              {devedoresAdmin.length > 0 && (
                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Devedores ({devedoresAdmin.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {devedoresAdmin.map((d, i) => (
                        <div key={i} className="p-3 rounded-lg border border-red-200 bg-red-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-bold text-red-800">{d.nome}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {d.cpf && <span className="text-xs text-red-600">CPF: {d.cpf}</span>}
                                {d.telefone && <span className="text-xs text-red-600">{d.telefone}</span>}
                                {d.consultorNome && <span className="text-xs text-gray-500">Vendedora: {d.consultorNome}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-red-700">{formatCurrency(d.totalDevido)}</p>
                              <p className="text-xs font-bold text-red-500">{d.maxAtraso}d de atraso</p>
                            </div>
                          </div>
                          <div className="mt-2 space-y-1">
                            {d.parcelas.map((p: any) => (
                              <div key={p.id} className="flex items-center justify-between text-xs text-red-700 bg-red-100 rounded px-2 py-1">
                                <span>Venc: {new Date(p.vencimento).toLocaleDateString('pt-BR')}</span>
                                <span className="font-bold text-red-600">{diasAtrasoAdmin(p.vencimento)}d atraso</span>
                                <span className="font-semibold">{formatCurrency(parseFloat(String(p.valor || 0)))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tabela de Parcelas Pendentes */}
              {parcelasPendentes.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      Parcelas Pendentes ({parcelasPendentes.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Vendedora</th>
                            <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                            <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parcelasPendentes.map((p: any) => {
                            const atraso = diasAtrasoAdmin(p.vencimento);
                            const isAtrasada = atraso > 0;
                            return (
                              <tr key={p.id} className={`border-b border-gray-50 hover:bg-gray-50 ${isAtrasada ? 'bg-red-50' : ''}`}>
                                <td className="py-2 px-3">
                                  <p className="font-medium text-gray-800">{p.clienteNome}</p>
                                  {p.clienteTelefone && <p className="text-xs text-gray-400">{p.clienteTelefone}</p>}
                                </td>
                                <td className="py-2 px-3 text-xs text-gray-600">{p.consultorNome || '-'}</td>
                                <td className="py-2 px-3">
                                  <p className={`text-sm ${isAtrasada ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                                    {new Date(p.vencimento).toLocaleDateString('pt-BR')}
                                  </p>
                                  {isAtrasada && <p className="text-xs text-red-500 font-medium">{atraso}d atrasado</p>}
                                </td>
                                <td className="py-2 px-3 text-right font-medium text-amber-700">{formatCurrency(parseFloat(String(p.valor || 0)))}</td>
                                <td className="py-2 px-3 text-right">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isAtrasada ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {isAtrasada ? 'Atrasado' : 'Pendente'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {parcelasPendentes.length === 0 && todasParcelas && todasParcelas.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  Nenhuma parcela cadastrada
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Modal de Confirmar Baixa no Dashboard */}
      <Dialog open={!!modalBaixaDash} onOpenChange={(o) => { if (!o) { setModalBaixaDash(null); setBaixaValor(""); setBaixaForma(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-gray-800">Confirmar Baixa de Parcela</DialogTitle>
          </DialogHeader>
          {modalBaixaDash && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                <p className="text-sm font-semibold text-gray-800">{modalBaixaDash.clienteNome}</p>
                <p className="text-xs text-gray-500">Consultor(a): {modalBaixaDash.consultorNome}</p>
                <p className="text-sm font-bold text-blue-700 mt-1">Valor original: {formatCurrency(modalBaixaDash.valor)}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Valor Recebido (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={baixaValor}
                  onChange={e => setBaixaValor(e.target.value)}
                  placeholder="0,00"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-700">Forma de Pagamento <span className="text-red-500">*</span></Label>
                <Select value={baixaForma} onValueChange={setBaixaForma}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                    <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => { setModalBaixaDash(null); setBaixaValor(""); setBaixaForma(""); }}>Cancelar</Button>
                <Button
                  type="button"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={baixarMutationDash.isPending || !baixaForma || !baixaValor}
                  onClick={() => {
                    if (!modalBaixaDash || !baixaForma || !baixaValor) return;
                    baixarMutationDash.mutate({
                      id: modalBaixaDash.id,
                      valorPago: parseFloat(baixaValor),
                      formaPagamento: baixaForma,
                    });
                  }}
                >
                  {baixarMutationDash.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Baixa"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DrillDown Modals — um por card */}
      <DrillDownModal
        open={drillDown === "coletado"}
        onClose={() => setDrillDown(null)}
        title={`Coletado — ${MESES[mes-1]} ${ano}`}
        total={detalheColetado?.total ?? 0}
        items={normalizarItens(detalheColetado)}
        isLoading={loadingColetado}
        color="green"
      />
      <DrillDownModal
        open={drillDown === "faturado"}
        onClose={() => setDrillDown(null)}
        title={`Faturado — ${MESES[mes-1]} ${ano}`}
        total={detalheFaturado?.total ?? 0}
        items={normalizarItens(detalheFaturado)}
        isLoading={loadingFaturado}
        color="blue"
      />
      <DrillDownModal
        open={drillDown === "aReceber"}
        onClose={() => setDrillDown(null)}
        title={`A Receber — Parcelas Pendentes`}
        total={detalheAReceber?.total ?? 0}
        items={normalizarItens(detalheAReceber)}
        isLoading={loadingAReceber}
        color="amber"
      />
      <DrillDownModal
        open={drillDown === "comissoes"}
        onClose={() => setDrillDown(null)}
        title={`Comissões — ${MESES[mes-1]} ${ano}`}
        total={detalheComissoes?.total ?? 0}
        items={normalizarItens(detalheComissoes)}
        isLoading={loadingComissoes}
        color="purple"
      />
      <DrillDownModal
        open={drillDown === "coletadoParcelas"}
        onClose={() => setDrillDown(null)}
        title={`Coletado Parcelas — ${MESES[mes-1]} ${ano}`}
        total={detalheColetadoParcelas?.total ?? 0}
        items={normalizarItens(detalheColetadoParcelas)}
        isLoading={loadingColetadoParcelas}
        color="teal"
      />
      <DrillDownModal
        open={drillDown === "comissaoParcelas"}
        onClose={() => setDrillDown(null)}
        title={`Comissão Parcelas — ${MESES[mes-1]} ${ano}`}
        total={detalheComissaoParcelas?.total ?? 0}
        items={normalizarItens(detalheComissaoParcelas)}
        isLoading={loadingComissaoParcelas}
        color="amber"
      />
      <DrillDownModal
        open={drillDown === "aguardandoBaixa"}
        onClose={() => setDrillDown(null)}
        title="Aguardando Baixa"
        total={detalheAguardandoBaixa?.total ?? 0}
        items={normalizarItens(detalheAguardandoBaixa)}
        isLoading={loadingAguardandoBaixa}
        color="blue"
      />
    </LifeDashboardLayout>
  );
}
