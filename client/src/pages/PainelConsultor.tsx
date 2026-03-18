import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, CalendarDays, DollarSign, TrendingUp, Clock, User } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-blue-100 text-blue-700",
  realizado: "bg-blue-100 text-blue-700",
  noshow: "bg-red-100 text-red-700",
  cancelado: "bg-gray-100 text-gray-600",
  remarcado: "bg-amber-100 text-amber-700",
};
const STATUS_LABELS: Record<string, string> = {
  confirmado: "Confirmado", realizado: "Realizado", noshow: "No-Show", cancelado: "Cancelado", remarcado: "Remarcado",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function PainelConsultor() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  // Find consultor linked to this user
  const { data: consultores } = trpc.consultores.list.useQuery();
  const consultor = consultores?.find(c => c.email === user?.email);

  const { data: agendamentos } = trpc.agendamentos.listByConsultor.useQuery(
    { consultorId: consultor?.id || 0, mes, ano },
    { enabled: !!consultor?.id }
  );
  const { data: vendas } = trpc.vendas.listByConsultor.useQuery(
    { consultorId: consultor?.id || 0, mes, ano },
    { enabled: !!consultor?.id }
  );

  const totalColetado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0) || 0;
  const totalFaturado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0) || 0;
  const comissaoTotal = vendas?.reduce((s, v) => {
    const coletado = parseFloat(String(v.valorColetado || 0));
    const pct = parseFloat(String(v.comissaoPercent || 10));
    return s + (coletado * pct / 100);
  }, 0) || 0;

  const realizadas = agendamentos?.filter(a => a.status === "realizado").length || 0;
  const noshow = agendamentos?.filter(a => a.status === "noshow").length || 0;

  return (
    <LifeDashboardLayout title="Meu Painel">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Meu Painel</h2>
            <p className="text-sm text-gray-500">{consultor ? `Consultor(a): ${consultor.nome}` : "Painel do Consultor"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { if(mes===1){setMes(12);setAno(ano-1);}else setMes(mes-1); }} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[130px] text-center">
              {MESES[mes-1]} {ano}
            </div>
            <Button variant="outline" size="icon" onClick={() => { if(mes===12){setMes(1);setAno(ano+1);}else setMes(mes+1); }} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {!consultor ? (
          <div className="text-center py-16 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum consultor vinculado à sua conta</p>
            <p className="text-sm mt-1">Solicite ao administrador que vincule seu email a um consultor</p>
          </div>
        ) : (
          <>
            {/* Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Coletado</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalColetado)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Faturado</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalFaturado)}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Comissão</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(comissaoTotal)}</p>
              </div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-600 uppercase tracking-wide font-medium">Agendamentos</p>
                <p className="text-xl font-bold text-purple-700 mt-1">{agendamentos?.length || 0}</p>
              </div>
            </div>

            {/* Agendamentos */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Meus Agendamentos — {MESES[mes-1]} {ano}</CardTitle>
              </CardHeader>
              <CardContent>
                {!agendamentos || agendamentos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Nenhum agendamento no período</div>
                ) : (
                  <div className="space-y-2">
                    {agendamentos.map((ag) => {
                      const dataHora = new Date(ag.dataHora);
                      return (
                        <div key={ag.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                          <div>
                            <p className="text-sm font-medium text-gray-800">{ag.clienteNome}</p>
                            <div className="flex items-center gap-3 mt-0.5">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <CalendarDays className="w-3 h-3" />
                                {dataHora.toLocaleDateString("pt-BR")}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {ag.resultouVenda && ag.valorColetado && (
                              <span className="text-xs font-medium text-blue-600">{formatCurrency(parseFloat(String(ag.valorColetado)))}</span>
                            )}
                            <Badge className={`text-xs ${STATUS_COLORS[ag.status] || ""}`}>{STATUS_LABELS[ag.status] || ag.status}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vendas */}
            {vendas && vendas.length > 0 && (
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700">Minhas Vendas — {MESES[mes-1]} {ano}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {vendas.map((v) => (
                      <div key={v.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{v.clienteNome}</p>
                          <p className="text-xs text-gray-400">{new Date(v.dataVenda).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-blue-600">{formatCurrency(parseFloat(String(v.valorColetado || 0)))}</p>
                          <p className="text-xs text-gray-400">Comissão: {formatCurrency(parseFloat(String(v.valorColetado || 0)) * parseFloat(String(v.comissaoPercent || 10)) / 100)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
