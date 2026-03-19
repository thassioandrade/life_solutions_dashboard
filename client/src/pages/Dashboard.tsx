import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DollarSign, TrendingUp, Users, CalendarDays,
  ChevronLeft, ChevronRight, ArrowUpCircle, ArrowDownCircle,
  Wallet, CreditCard, AlertCircle, CheckCircle2, Bell, Phone, Download
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import * as XLSX from "xlsx";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function MetricCard({ title, value, subtitle, icon: Icon, color = "green", trend }: {
  title: string; value: string; subtitle?: string; icon: React.ElementType; color?: string; trend?: "up" | "down" | "neutral";
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
    <div className={`rounded-xl border p-4 ${colorMap[color] || colorMap.green}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{title}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
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

  if (user && user.role !== "admin") {
    navigate("/painel");
    return null;
  }

  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();
  const { data: promessasHoje } = trpc.promessas.hoje.useQuery();
  const { data: servicosVendidos } = trpc.servicosVendidos.byPeriodo.useQuery({ mes, ano });

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
        <div className="flex items-center justify-between">
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
            {/* Main metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard title="Coletado" value={formatCurrency(stats.totalColetado)} subtitle="Recebido à vista" icon={Wallet} color="green" />
              <MetricCard title="Faturado" value={formatCurrency(stats.totalFaturado)} subtitle="Total das vendas" icon={TrendingUp} color="blue" />
              <MetricCard title="A Receber" value={formatCurrency(stats.totalParcelasPendentes)} subtitle="Parcelas pendentes" icon={CreditCard} color="amber" />
              <MetricCard title="Comissões" value={formatCurrency(stats.totalComissoes)} subtitle="A pagar consultores" icon={Users} color="purple" />
            </div>
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
                      { label: "(-) Investimento Tráfego", value: stats.investimento, positive: false },
                      { label: "(-) Custo Serviços", value: stats.totalCustos, positive: false },
                      { label: "(-) Despesas", value: stats.totalDespesas, positive: false },
                      { label: "(-) Salários", value: stats.totalSalarios, positive: false },
                      { label: "(-) Comissões", value: stats.totalComissoes, positive: false },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                        <span className="text-sm text-gray-600">{item.label}</span>
                        <span className={`text-sm font-medium ${item.positive ? "text-blue-600" : "text-red-500"}`}>
                          {item.positive ? "" : "- "}{formatCurrency(item.value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between py-2 bg-blue-50 rounded-lg px-3 mt-2">
                      <span className="text-sm font-bold text-green-800">Lucro Líquido</span>
                      <span className={`text-base font-bold ${stats.lucroLiquido >= 0 ? "text-blue-700" : "text-red-600"}`}>
                        {formatCurrency(stats.lucroLiquido)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Agendamentos stats */}
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Agendamentos do Mês</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">{stats.agendamentos.total}</p>
                      <p className="text-xs text-blue-600 mt-0.5">Total</p>
                    </div>
                    <div className="text-center p-3 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-700">{stats.agendamentos.realizadas}</p>
                      <p className="text-xs text-blue-600 mt-0.5">Realizadas</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <p className="text-2xl font-bold text-amber-700">{stats.agendamentos.confirmadas}</p>
                      <p className="text-xs text-amber-600 mt-0.5">Confirmadas</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <p className="text-2xl font-bold text-red-700">{stats.agendamentos.noshow}</p>
                      <p className="text-xs text-red-600 mt-0.5">No-Show</p>
                    </div>
                  </div>
                  {stats.agendamentos.total > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Taxa de Comparecimento</span>
                        <span className="font-medium text-blue-600">
                          {Math.round((stats.agendamentos.realizadas / stats.agendamentos.total) * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Taxa de Fechamento</span>
                        <span className="font-medium text-blue-600">
                          {stats.agendamentos.realizadas > 0 ? Math.round((stats.totalVendas / stats.agendamentos.realizadas) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Vendas table */}
            {stats.vendas && stats.vendas.length > 0 && (
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Detalhamento de Vendas por Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Faturado</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Coletado</th>
                          <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Comissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.vendas.map((venda: any) => {
                          const consultor = consultores?.find(c => c.id === venda.consultorId);
                          const comissao = (parseFloat(String(venda.valorColetado || 0)) - parseFloat(String(venda.custoServico || 0))) * parseFloat(String(venda.comissaoPercent || 10)) / 100;
                          return (
                            <tr key={venda.id} className="border-b border-gray-50 hover:bg-gray-50">
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
          </>
        ) : null}
      </div>
    </LifeDashboardLayout>
  );
}
