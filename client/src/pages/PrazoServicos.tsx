import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Timer, Search, AlertTriangle, CheckCircle, Clock } from "lucide-react";

function getStatusInfo(status: string, diasDecorridos: number, diasRestantes: number) {
  if (status === "atrasado") {
    return {
      label: `${Math.abs(diasRestantes)} dias em atraso`,
      badgeClass: "bg-red-100 text-red-700 border-red-200",
      rowClass: "bg-red-50 border-l-4 border-l-red-500",
      icon: <AlertTriangle className="w-4 h-4 text-red-600" />,
    };
  }
  if (status === "alerta") {
    return {
      label: `${diasRestantes} dia${diasRestantes === 1 ? "" : "s"} restante${diasRestantes === 1 ? "" : "s"}`,
      badgeClass: "bg-yellow-100 text-yellow-700 border-yellow-200",
      rowClass: "bg-yellow-50 border-l-4 border-l-yellow-500",
      icon: <Clock className="w-4 h-4 text-yellow-600" />,
    };
  }
  return {
    label: `${diasRestantes} dia${diasRestantes === 1 ? "" : "s"} restante${diasRestantes === 1 ? "" : "s"}`,
    badgeClass: "bg-green-100 text-green-700 border-green-200",
    rowClass: "bg-white border-l-4 border-l-green-400",
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
  };
}

function BarraPrazo({ diasDecorridos, prazo }: { diasDecorridos: number; prazo: number }) {
  const pct = Math.min(100, Math.round((diasDecorridos / prazo) * 100));
  const cor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-400" : "bg-green-500";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all ${cor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function PrazoServicos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const consultorId = (user as any)?.consultorId as number | undefined;

  const { data: prazos = [], isLoading } = trpc.vendas.listPrazos.useQuery(
    { consultorId: isAdmin ? undefined : consultorId },
    { refetchInterval: 60_000 } // atualiza a cada 1 minuto
  );

  const [busca, setBusca] = useState("");

  const filtrados = prazos.filter(p =>
    p.clienteNome?.toLowerCase().includes(busca.toLowerCase()) ||
    p.consultorNome?.toLowerCase().includes(busca.toLowerCase())
  );

  const atrasados = filtrados.filter(p => p.status === "atrasado").length;
  const emAlerta = filtrados.filter(p => p.status === "alerta").length;
  const noPrazo = filtrados.filter(p => p.status === "ok").length;

  return (
    <LifeDashboardLayout>
      <div className="p-6 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100">
            <Timer className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prazo de Serviços</h1>
            <p className="text-sm text-gray-500">Acompanhe o prazo de 25 dias para entrega de cada serviço</p>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-700">{atrasados}</p>
              <p className="text-xs text-red-600 font-medium">Fora do Prazo</p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-yellow-700">{emAlerta}</p>
              <p className="text-xs text-yellow-600 font-medium">Vencendo em breve</p>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-700">{noPrazo}</p>
              <p className="text-xs text-green-600 font-medium">Dentro do Prazo</p>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar cliente ou consultora..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-400">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Timer className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma venda ativa encontrada.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map(p => {
              const info = getStatusInfo(p.status, p.diasDecorridos, p.diasRestantes);
              const dataInicio = p.dataVenda ? new Date(p.dataVenda).toLocaleDateString("pt-BR") : "—";
              const servicos = Array.isArray(p.servicos) && p.servicos.length > 0
                ? p.servicos.map((s: string) => s === "limpa_nome" ? "Limpa Nome" : s === "rating" ? "Rating Bancário" : s).join(" + ")
                : "Serviço não especificado";

              return (
                <div key={p.id} className={`rounded-xl p-4 shadow-sm border ${info.rowClass}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {info.icon}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{p.clienteNome}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {servicos}
                          {isAdmin && p.consultorNome && (
                            <span className="ml-2 text-blue-600">· {p.consultorNome}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={`text-xs font-medium ${info.badgeClass}`}>
                        {info.label}
                      </Badge>
                      <p className="text-xs text-gray-400 mt-1">Início: {dataInicio}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{p.diasDecorridos} de {p.prazo} dias</span>
                      <span>{Math.min(100, Math.round((p.diasDecorridos / p.prazo) * 100))}%</span>
                    </div>
                    <BarraPrazo diasDecorridos={p.diasDecorridos} prazo={p.prazo} />
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
