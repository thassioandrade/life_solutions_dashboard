import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Clock, AlertTriangle, XCircle, Search, Filter, Bell, Package } from "lucide-react";
import { toast } from "sonner";

type PrazoItem = {
  id: number;
  clienteNome: string;
  clienteTelefone?: string | null;
  dataVenda: Date | string;
  servicos?: string[] | null;
  consultorId?: number | null;
  consultorNome?: string | null;
  entregue: boolean;
  dataEntrega?: Date | string | null;
  diasDecorridos: number;
  diasRestantes: number;
  status: string;
  prazo: number;
  movidoParaEntrega: boolean;
};

function getStatusConfig(status: string) {
  switch (status) {
    case "entregue":
      return {
        label: "Entregue",
        badgeClass: "bg-green-100 text-green-800 border-green-200",
        rowClass: "border-l-4 border-l-green-500",
        barColor: "bg-green-500",
        Icon: CheckCircle2,
      };
    case "atrasado":
      return {
        label: "Atrasado",
        badgeClass: "bg-red-100 text-red-800 border-red-200",
        rowClass: "border-l-4 border-l-red-500",
        barColor: "bg-red-500",
        Icon: XCircle,
      };
    case "alerta":
      return {
        label: "Atenção",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        rowClass: "border-l-4 border-l-amber-500",
        barColor: "bg-amber-500",
        Icon: AlertTriangle,
      };
    default:
      return {
        label: "No Prazo",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        rowClass: "border-l-4 border-l-blue-500",
        barColor: "bg-blue-500",
        Icon: Clock,
      };
  }
}

function formatServicos(servicos?: string[] | null) {
  if (!servicos || servicos.length === 0) return "Serviço não especificado";
  return servicos
    .map(s => s === "limpa_nome" ? "Limpa Nome" : s === "rating" ? "Rating Bancário" : s)
    .join(" + ");
}

export default function PrazoServicos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [busca, setBusca] = useState("");
  const [filtroConsultor, setFiltroConsultor] = useState<string>("todos");
  const [filtroStatus, setFiltroStatus] = useState<string>("ativos");
  const alarmShown = useRef<Set<number>>(new Set());

  const consultoresQuery = trpc.consultores.list.useQuery();
  const consultores = consultoresQuery.data || [];

  // Para consultor, buscar o ID dele pelo email (mesmo padrão do PainelConsultor)
  const consultor = consultores.find((c: { email: string | null }) => c.email === user?.email);
  const consultorAtualId = consultor?.id;

  const { data: prazos = [], isLoading, refetch } = trpc.vendas.listPrazos.useQuery(
    { consultorId: isAdmin ? undefined : consultorAtualId },
    { refetchInterval: 60_000 }
  );

  const marcarEntregue = trpc.vendas.marcarEntregue.useMutation({
    onSuccess: () => {
      toast.success("✅ Serviço marcado como entregue!");
      refetch();
    },
    onError: () => toast.error("Erro ao marcar como entregue"),
  });

  const moverParaEntrega = trpc.vendas.moverParaEntregaSeNecessario.useMutation();

  // Auto-move para Pipeline e alarmes quando atingir 25 dias
  useEffect(() => {
    if (!prazos.length) return;
    prazos.forEach((p: PrazoItem) => {
      // Auto-move para coluna "Entregar Serviço Feito" no Pipeline
      if (!p.entregue && p.diasDecorridos >= 25 && !p.movidoParaEntrega) {
        moverParaEntrega.mutate({
          vendaId: p.id,
          clienteNome: p.clienteNome,
          consultorId: p.consultorId ?? undefined,
        });
      }
      // Alarme visual quando em alerta ou atrasado
      if (!p.entregue && (p.status === "atrasado" || p.status === "alerta") && !alarmShown.current.has(p.id)) {
        alarmShown.current.add(p.id);
        if (p.status === "atrasado") {
          toast.error(`⏰ PRAZO VENCIDO: ${p.clienteNome} — ${Math.abs(p.diasRestantes)} dias em atraso!`, { duration: 10000 });
        } else {
          toast.warning(`⚠️ Atenção: ${p.clienteNome} — apenas ${p.diasRestantes} dia${p.diasRestantes !== 1 ? "s" : ""} restante${p.diasRestantes !== 1 ? "s" : ""}`, { duration: 8000 });
        }
      }
    });
  }, [prazos]);

  // Filtros
  const prazosFiltrados = (prazos as PrazoItem[]).filter(p => {
    const matchBusca =
      p.clienteNome.toLowerCase().includes(busca.toLowerCase()) ||
      (p.consultorNome || "").toLowerCase().includes(busca.toLowerCase());
    const matchConsultor = filtroConsultor === "todos" || String(p.consultorId) === filtroConsultor;
    const matchStatus =
      filtroStatus === "todos" ? true :
      filtroStatus === "ativos" ? !p.entregue :
      p.status === filtroStatus;
    return matchBusca && matchConsultor && matchStatus;
  });

  // Contadores (sempre do total, não do filtrado)
  const atrasados = (prazos as PrazoItem[]).filter(p => p.status === "atrasado").length;
  const emAlerta = (prazos as PrazoItem[]).filter(p => p.status === "alerta").length;
  const noPrazo = (prazos as PrazoItem[]).filter(p => p.status === "ok").length;
  const entregues = (prazos as PrazoItem[]).filter(p => p.status === "entregue").length;

  return (
    <LifeDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Package className="w-6 h-6 text-amber-500" />
              Prazo das Vendas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Prazo de 25 dias para entrega dos serviços após pagamento
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {(prazos as PrazoItem[]).length} cliente{(prazos as PrazoItem[]).length !== 1 ? "s" : ""} ativo{(prazos as PrazoItem[]).length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => setFiltroStatus("atrasado")}
          >
            <XCircle className="w-8 h-8 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-700">{atrasados}</p>
              <p className="text-xs text-red-600 font-medium">Fora do Prazo</p>
            </div>
          </div>
          <div
            className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-amber-100 transition-colors"
            onClick={() => setFiltroStatus("alerta")}
          >
            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{emAlerta}</p>
              <p className="text-xs text-amber-600 font-medium">Em Alerta</p>
            </div>
          </div>
          <div
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => setFiltroStatus("ok")}
          >
            <Clock className="w-8 h-8 text-blue-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{noPrazo}</p>
              <p className="text-xs text-blue-600 font-medium">No Prazo</p>
            </div>
          </div>
          <div
            className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:bg-green-100 transition-colors"
            onClick={() => setFiltroStatus("entregue")}
          >
            <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-700">{entregues}</p>
              <p className="text-xs text-green-600 font-medium">Entregues</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-card border rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente ou vendedora..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            {isAdmin && (
              <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
                <SelectTrigger className="w-[200px]">
                  <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Vendedora" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as vendedoras</SelectItem>
                  {consultores.map((c: { id: number; nome: string }) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ativos">Ativos (sem entregues)</SelectItem>
                <SelectItem value="atrasado">Fora do Prazo</SelectItem>
                <SelectItem value="alerta">Em Alerta</SelectItem>
                <SelectItem value="ok">No Prazo</SelectItem>
                <SelectItem value="entregue">Entregues</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lista de clientes */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : prazosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm mt-1">As vendas realizadas aparecerão aqui automaticamente</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prazosFiltrados.map((p: PrazoItem) => {
              const cfg = getStatusConfig(p.status);
              const { Icon } = cfg;
              const progresso = Math.min(100, Math.round((p.diasDecorridos / p.prazo) * 100));
              const dataInicio = p.dataVenda ? new Date(p.dataVenda).toLocaleDateString("pt-BR") : "—";

              return (
                <div
                  key={p.id}
                  className={`bg-card border rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${cfg.rowClass} ${p.entregue ? "opacity-60" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`font-semibold text-base ${p.entregue ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {p.clienteNome}
                        </h3>
                        <Badge className={`text-xs border ${cfg.badgeClass}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                        {p.diasDecorridos >= 25 && !p.entregue && (
                          <Badge className="text-xs bg-red-100 text-red-700 border border-red-200 animate-pulse">
                            <Bell className="w-3 h-3 mr-1" />
                            ALERTA
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        <span>📅 Início: {dataInicio}</span>
                        {isAdmin && p.consultorNome && <span>👤 {p.consultorNome}</span>}
                        {p.clienteTelefone && <span>📱 {p.clienteTelefone}</span>}
                        <span>🔧 {formatServicos(p.servicos)}</span>
                      </div>

                      {p.entregue && p.dataEntrega && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          ✅ Entregue em {new Date(p.dataEntrega).toLocaleDateString("pt-BR")}
                        </p>
                      )}

                      {/* Barra de progresso */}
                      {!p.entregue && (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>
                              {p.diasDecorridos} dia{p.diasDecorridos !== 1 ? "s" : ""} decorrido{p.diasDecorridos !== 1 ? "s" : ""}
                            </span>
                            <span>
                              {p.diasRestantes > 0
                                ? `${p.diasRestantes} dia${p.diasRestantes !== 1 ? "s" : ""} restante${p.diasRestantes !== 1 ? "s" : ""}`
                                : `${Math.abs(p.diasRestantes)} dia${Math.abs(p.diasRestantes) !== 1 ? "s" : ""} em atraso`
                              }
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${cfg.barColor}`}
                              style={{ width: `${progresso}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Prazo total: {p.prazo} dias</p>
                        </div>
                      )}
                    </div>

                    {/* Botão de check de entrega */}
                    <div className="flex-shrink-0">
                      {p.entregue ? (
                        <div className="flex flex-col items-center gap-1">
                          <CheckCircle2 className="w-8 h-8 text-green-500" />
                          <span className="text-xs text-green-600 font-medium">Entregue</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-400 text-green-700 hover:bg-green-50 flex flex-col h-auto py-2 px-3 gap-1"
                          onClick={() => marcarEntregue.mutate({
                            vendaId: p.id,
                            consultorId: p.consultorId ?? undefined,
                          })}
                          disabled={marcarEntregue.isPending}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="text-xs leading-tight">Marcar{"\n"}Entregue</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
