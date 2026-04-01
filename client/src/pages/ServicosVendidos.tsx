import { useState, useMemo } from "react";
import ModalGerenciarParcelas from "@/components/ModalGerenciarParcelas";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Download, AlertTriangle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";
import { useAuth } from "@/_core/hooks/useAuth";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function diasAtraso(vencimento: Date | string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento);
  v.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - v.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ServicosVendidos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [filtroConsultor, setFiltroConsultor] = useState<string>("todos");
  const [abaAtiva, setAbaAtiva] = useState<"servicos" | "devedores">("servicos");
  const [openGerenciarParcelas, setOpenGerenciarParcelas] = useState<any | null>(null);

  const { data: todosConsultores } = trpc.consultores.list.useQuery();
  const consultorLogado = todosConsultores?.find(c => c.email === user?.email);
  const consultorLogadoId = consultorLogado?.id;

  // Admin vê todos; consultor vê apenas os próprios
  const { data: servicosAdmin, isLoading: loadingAdmin } = trpc.servicosVendidos.byPeriodo.useQuery(
    { mes, ano }, { enabled: isAdmin }
  );
  const { data: servicosConsultor, isLoading: loadingConsultor } = trpc.servicosVendidos.byConsultor.useQuery(
    { consultorId: consultorLogadoId || 0, mes, ano },
    { enabled: !isAdmin && !!consultorLogadoId }
  );
  const servicosVendidos = isAdmin ? servicosAdmin : servicosConsultor;
  const isLoading = isAdmin ? loadingAdmin : loadingConsultor;
  const consultores = isAdmin ? todosConsultores : undefined;
  const { data: parcelasVencidas } = trpc.parcelas.devedores.useQuery();
  const { data: custosServicos } = trpc.custosServicos.get.useQuery();

  const custoLimpaName = custosServicos?.custo_limpa_nome ?? 70;
  const custoRating = custosServicos?.custo_rating ?? 110;

  // Filtrar por consultor
  const servicosFiltrados = useMemo(() => {
    if (!servicosVendidos) return [];
    if (filtroConsultor === "todos") return servicosVendidos;
    const cId = parseInt(filtroConsultor);
    return servicosVendidos.filter(v => v.consultorId === cId);
  }, [servicosVendidos, filtroConsultor]);

  // Estatísticas
  const stats = useMemo(() => {
    let qtdLimpaName = 0;
    let qtdRating = 0;
    const clientesComServico: typeof servicosFiltrados = [];
    for (const v of servicosFiltrados) {
      const servs = v.servicos as string[] | null;
      if (!servs || servs.length === 0) continue;
      const temLimpa = servs.some(s => s.toLowerCase().includes("limpa"));
      const temRating = servs.some(s => s.toLowerCase().includes("rating"));
      if (temLimpa || temRating) {
        clientesComServico.push(v);
        if (temLimpa) qtdLimpaName++;
        if (temRating) qtdRating++;
      }
    }
    return {
      qtdLimpaName,
      qtdRating,
      clientesComServico,
      totalCustos: qtdLimpaName * custoLimpaName + qtdRating * custoRating,
    };
  }, [servicosFiltrados, custoLimpaName, custoRating]);

  // Devedores agrupados
  const devedores = useMemo(() => {
    if (!parcelasVencidas) return [];
    const map = new Map<string, {
      nome: string; cpf: string | null; telefone: string | null;
      consultorId: number | null;
      parcelas: typeof parcelasVencidas;
      totalDevido: number; maxAtraso: number;
    }>();
    for (const p of parcelasVencidas) {
      const key = p.clienteNome;
      if (!map.has(key)) {
        map.set(key, { nome: p.clienteNome, cpf: p.clienteCpfCnpj ?? null, telefone: p.clienteTelefone ?? null, consultorId: p.consultorId ?? null, parcelas: [], totalDevido: 0, maxAtraso: 0 });
      }
      const entry = map.get(key)!;
      entry.parcelas.push(p);
      entry.totalDevido += parseFloat(String(p.valor || 0));
      entry.maxAtraso = Math.max(entry.maxAtraso, diasAtraso(p.vencimento));
    }
    return Array.from(map.values()).sort((a, b) => b.maxAtraso - a.maxAtraso);
  }, [parcelasVencidas]);

  const devedoresFiltrados = useMemo(() => {
    if (filtroConsultor === "todos") return devedores;
    const cId = parseInt(filtroConsultor);
    return devedores.filter(d => d.consultorId === cId);
  }, [devedores, filtroConsultor]);

  // Exportar para Excel
  function exportarExcel() {
    const rows = stats.clientesComServico.map(v => {
      const servs = v.servicos as string[] | null;
      const consultor = consultores?.find(c => c.id === v.consultorId);
      return {
        "Nome do Cliente": v.clienteNome,
        "CPF/CNPJ": v.clienteCpfCnpj || "",
        "Telefone": v.clienteTelefone || "",
        "Serviços": servs?.join(", ") || "",
        "Coletado": parseFloat(String(v.valorColetado || 0)),
        "Faturado": parseFloat(String(v.valorFaturado || 0)),
        "Data da Venda": new Date(v.dataVenda).toLocaleDateString("pt-BR"),
        "Consultora": consultor?.nome || "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Serviços Vendidos");
    XLSX.writeFile(wb, `servicos_vendidos_${MESES[mes-1]}_${ano}.xlsx`);
  }

  function exportarLimpaExcel() {
    const rows = stats.clientesComServico
      .filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("limpa")))
      .map(v => {
        const consultor = consultores?.find(c => c.id === v.consultorId);
        return {
          "Nome do Cliente": v.clienteNome,
          "CPF/CNPJ": v.clienteCpfCnpj || "",
          "Telefone": v.clienteTelefone || "",
          "Serviço": "Limpa Nome",
          "Data da Venda": new Date(v.dataVenda).toLocaleDateString("pt-BR"),
          "Consultora": consultor?.nome || "",
        };
      });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Limpa Nome");
    XLSX.writeFile(wb, `limpa-nome-${MESES[mes-1]}-${ano}.xlsx`);
  }
  function exportarRatingExcel() {
    const rows = stats.clientesComServico
      .filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("rating")))
      .map(v => {
        const consultor = consultores?.find(c => c.id === v.consultorId);
        return {
          "Nome do Cliente": v.clienteNome,
          "CPF/CNPJ": v.clienteCpfCnpj || "",
          "Telefone": v.clienteTelefone || "",
          "Serviço": "Rating Bancário",
          "Data da Venda": new Date(v.dataVenda).toLocaleDateString("pt-BR"),
          "Consultora": consultor?.nome || "",
        };
      });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rating Bancário");
    XLSX.writeFile(wb, `rating-bancario-${MESES[mes-1]}-${ano}.xlsx`);
  }
  function exportarDevedoresExcel() {
    const rows = devedoresFiltrados.flatMap(d =>
      d.parcelas.map(p => {
        const consultor = consultores?.find(c => c.id === d.consultorId);
        return {
          "Nome do Cliente": d.nome,
          "CPF/CNPJ": d.cpf || "",
          "Telefone": d.telefone || "",
          "Valor Parcela": parseFloat(String(p.valor || 0)),
          "Vencimento": new Date(p.vencimento).toLocaleDateString("pt-BR"),
          "Dias de Atraso": diasAtraso(p.vencimento),
          "Consultora": consultor?.nome || "",
        };
      })
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Devedores");
    XLSX.writeFile(wb, `devedores_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.xlsx`);
  }

  return (
    <LifeDashboardLayout title="Serviços Vendidos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Serviços Vendidos</h1>
            <p className="text-sm text-gray-500">Controle de Limpa Nome, Rating e devedores</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
              <SelectTrigger className="w-44 text-sm">
                <SelectValue placeholder="Todas as consultoras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as consultoras</SelectItem>
                {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <button onClick={() => { const d = new Date(ano, mes - 2, 1); setMes(d.getMonth() + 1); setAno(d.getFullYear()); }} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[130px] text-center">{MESES[mes - 1]} {ano}</span>
            <button onClick={() => { const d = new Date(ano, mes, 1); setMes(d.getMonth() + 1); setAno(d.getFullYear()); }} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl p-4 border bg-indigo-50 border-indigo-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-1">Limpa Nome</p>
            <p className="text-2xl font-bold text-indigo-700">{stats.qtdLimpaName}</p>
            <p className="text-xs text-indigo-500 mt-0.5">Custo: {formatCurrency(stats.qtdLimpaName * custoLimpaName)}</p>
          </div>
          <div className="rounded-xl p-4 border bg-violet-50 border-violet-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600 mb-1">Rating Bancário</p>
            <p className="text-2xl font-bold text-violet-700">{stats.qtdRating}</p>
            <p className="text-xs text-violet-500 mt-0.5">Custo: {formatCurrency(stats.qtdRating * custoRating)}</p>
          </div>
          <div className="rounded-xl p-4 border bg-orange-50 border-orange-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-600 mb-1">Total Custos</p>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(stats.totalCustos)}</p>
            <p className="text-xs text-orange-500 mt-0.5">Limpa Nome + Rating</p>
          </div>
          <div className="rounded-xl p-4 border bg-red-50 border-red-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1">Devedores</p>
            <p className="text-2xl font-bold text-red-700">{devedoresFiltrados.length}</p>
            <p className="text-xs text-red-500 mt-0.5">
              {formatCurrency(devedoresFiltrados.reduce((s, d) => s + d.totalDevido, 0))} em aberto
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className="flex gap-1 border-b border-gray-200">
          {[
            { key: "servicos", label: "Clientes com Serviços", count: stats.clientesComServico.length },
            { key: "devedores", label: "Devedores", count: devedoresFiltrados.length, alert: devedoresFiltrados.length > 0 },
          ].map(aba => (
            <button key={aba.key} onClick={() => setAbaAtiva(aba.key as typeof abaAtiva)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${abaAtiva === aba.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              style={abaAtiva === aba.key ? { borderBottomColor: "#0055FF", color: "#0055FF" } : {}}>
              {aba.label}
              {aba.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${aba.alert ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{aba.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Aba: Serviços */}
        {abaAtiva === "servicos" && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Clientes com Limpa Nome / Rating — {MESES[mes-1]} {ano}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={exportarLimpaExcel} className="text-white text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700">
                    <Download className="w-3.5 h-3.5" />
                    Limpa Nome
                  </Button>
                  <Button size="sm" onClick={exportarRatingExcel} className="text-white text-xs gap-1.5 bg-violet-600 hover:bg-violet-700">
                    <Download className="w-3.5 h-3.5" />
                    Rating
                  </Button>
                  <Button size="sm" onClick={exportarExcel} className="text-white text-xs gap-1.5" style={{ background: "#0055FF" }}>
                    <Download className="w-3.5 h-3.5" />
                    Todos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
              ) : stats.clientesComServico.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <CheckCircle2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  Nenhum cliente com Limpa Nome ou Rating no período
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Cliente</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">CPF/CNPJ</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Telefone</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Serviços</th>
                        <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Coletado</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                        <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Consultora</th>
                        <th className="text-center py-2 px-3 text-xs font-semibold text-gray-500 uppercase">Parcelas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.clientesComServico.map(v => {
                        const servs = v.servicos as string[] | null;
                        const consultor = consultores?.find(c => c.id === v.consultorId);
                        return (
                          <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                            <td className="py-2.5 px-3 font-medium text-gray-800">{v.clienteNome}</td>
                            <td className="py-2.5 px-3 text-gray-500 text-xs">{v.clienteCpfCnpj || "—"}</td>
                            <td className="py-2.5 px-3 text-gray-500 text-xs">{v.clienteTelefone || "—"}</td>
                            <td className="py-2.5 px-3">
                              <div className="flex gap-1 flex-wrap">
                                {servs?.map((s, i) => (
                                  <Badge key={i} className={`text-[10px] border ${
                                    s.toLowerCase().includes("limpa") ? "bg-indigo-100 text-indigo-700 border-indigo-200" :
                                    s.toLowerCase().includes("rating") ? "bg-violet-100 text-violet-700 border-violet-200" :
                                    "bg-gray-100 text-gray-600 border-gray-200"
                                  }`}>{s}</Badge>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold" style={{ color: "#0055FF" }}>
                              {formatCurrency(parseFloat(String(v.valorColetado || 0)))}
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 text-xs">{new Date(v.dataVenda).toLocaleDateString("pt-BR")}</td>
                            <td className="py-2.5 px-3 text-gray-500 text-xs">{consultor?.nome || "—"}</td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => setOpenGerenciarParcelas(v)}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto"
                              >
                                <span>Parcelas</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Aba: Devedores */}
        {abaAtiva === "devedores" && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Lista de Devedores ({devedoresFiltrados.length})
                </CardTitle>
                {devedoresFiltrados.length > 0 && (
                  <Button size="sm" onClick={exportarDevedoresExcel} className="text-white text-xs gap-1.5" style={{ background: "#dc2626" }}>
                    <Download className="w-3.5 h-3.5" />
                    Exportar Excel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {devedoresFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  Nenhum devedor encontrado!
                </div>
              ) : (
                <div className="space-y-3">
                  {devedoresFiltrados.map((d, i) => {
                    const consultor = consultores?.find(c => c.id === d.consultorId);
                    return (
                      <div key={i} className="p-3 rounded-lg border border-red-200 bg-red-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-bold text-red-800">{d.nome}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {d.cpf && <span className="text-xs text-red-600">CPF: {d.cpf}</span>}
                              {d.telefone && <span className="text-xs text-red-600">{d.telefone}</span>}
                              {consultor && <span className="text-xs text-red-500">Consultora: {consultor.nome}</span>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-red-700">{formatCurrency(d.totalDevido)}</p>
                            <p className="text-xs text-red-500">{d.maxAtraso}d de atraso</p>
                          </div>
                        </div>
                        <div className="mt-2 space-y-1">
                          {d.parcelas.map(p => (
                            <div key={p.id} className="flex items-center justify-between text-xs text-red-700 bg-red-100 rounded px-2 py-1">
                              <span>Venc: {new Date(p.vencimento).toLocaleDateString("pt-BR")}</span>
                              <span className="font-medium text-red-600">{diasAtraso(p.vencimento)}d atraso</span>
                              <span className="font-semibold">{formatCurrency(parseFloat(String(p.valor || 0)))}</span>
                              {p.okConsultor && <span className="text-emerald-600">✓ Confirmado</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de Gerenciar Parcelas */}
      {openGerenciarParcelas && (
        <ModalGerenciarParcelas
          vendaId={openGerenciarParcelas.id}
          clienteNome={openGerenciarParcelas.clienteNome}
          valorFaturado={parseFloat(String(openGerenciarParcelas.valorFaturado || 0))}
          valorColetado={parseFloat(String(openGerenciarParcelas.valorColetado || 0))}
          open={!!openGerenciarParcelas}
          onClose={() => setOpenGerenciarParcelas(null)}
        />
      )}
    </LifeDashboardLayout>
  );
}
