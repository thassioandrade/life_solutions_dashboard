import { useState, useMemo } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { Plus, ChevronLeft, ChevronRight, Trash2, Users, Wallet, BarChart2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CATEGORIAS_AVULSO = ["Tráfego Pago","Marketing","Tecnologia","Consultas","Investimentos","Infraestrutura","Impostos","Outros"];
const FORMAS_PAGAMENTO = ["PIX","Boleto","Cartão de Crédito","Cartão de Débito","Transferência","Dinheiro"];
const COLORS_PIE = ["#6366f1","#f59e0b","#10b981","#ef4444","#8b5cf6","#06b6d4","#f97316","#84cc16"];

function fmt(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function pct(v: number) { return v.toFixed(1) + "%"; }

type AbaAtiva = "resumo" | "custos" | "colaboradores" | "graficos";

export default function Despesas() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [aba, setAba] = useState<AbaAtiva>("resumo");
  const [openDespesa, setOpenDespesa] = useState(false);
  const [openColaborador, setOpenColaborador] = useState(false);
  const [editandoColab, setEditandoColab] = useState<number | null>(null);
  const [editSalario, setEditSalario] = useState("");
  const [form, setForm] = useState({ descricao: "", valor: "", categoria: "", formaPagamento: "", data: new Date().toISOString().split("T")[0] });
  const [colabForm, setColabForm] = useState({ nome: "", cargo: "", salario: "" });

  const utils = trpc.useUtils();
  const { data: despesas } = trpc.despesas.listByPeriod.useQuery({ mes, ano });
  const { data: colaboradores } = trpc.despesas.colaboradores.list.useQuery();
  const { data: dashFinanceiro } = trpc.dashboardFinanceiro.get.useQuery({ mes, ano });
  const { data: custosServicos } = trpc.custosServicos.get.useQuery();
  const { data: rankingData } = trpc.rankings.automatico.useQuery({ mes, ano });

  const createDespesaMutation = trpc.despesas.create.useMutation({
    onSuccess: () => { toast.success("Custo registrado!"); setOpenDespesa(false); setForm({ descricao: "", valor: "", categoria: "", formaPagamento: "", data: new Date().toISOString().split("T")[0] }); utils.despesas.listByPeriod.invalidate(); utils.dashboardFinanceiro.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDespesaMutation = trpc.despesas.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); utils.despesas.listByPeriod.invalidate(); utils.dashboardFinanceiro.get.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const createColabMutation = trpc.despesas.colaboradores.create.useMutation({
    onSuccess: () => { toast.success("Colaborador adicionado!"); setOpenColaborador(false); setColabForm({ nome: "", cargo: "", salario: "" }); utils.despesas.colaboradores.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteColabMutation = trpc.despesas.colaboradores.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); utils.despesas.colaboradores.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const totalColetado = dashFinanceiro?.totalColetado ?? 0;
  const totalFaturado = dashFinanceiro?.totalFaturado ?? 0;
  const custoLimpaName = custosServicos?.custo_limpa_nome ?? 70;
  const custoRating = custosServicos?.custo_rating ?? 110;
  const qtdLimpaName = dashFinanceiro?.qtdLimpaName ?? 0;
  const qtdRating = dashFinanceiro?.qtdRating ?? 0;
  const totalCustosServicos = (qtdLimpaName * custoLimpaName) + (qtdRating * custoRating);
  const totalSalarios = colaboradores?.reduce((s, c) => s + parseFloat(String(c.salario || 0)), 0) ?? 0;
  const totalCustosAvulsos = despesas?.reduce((s, d) => s + parseFloat(String(d.valor || 0)), 0) ?? 0;
  const totalComissoes = dashFinanceiro?.totalComissoes ?? 0;
  const totalGastos = totalCustosServicos + totalSalarios + totalCustosAvulsos + totalComissoes;
  const liquido = totalColetado - totalGastos;

  const dadosPizza = useMemo(() => [
    { name: "Custos Serviços", value: totalCustosServicos },
    { name: "Salários", value: totalSalarios },
    { name: "Custos Avulsos", value: totalCustosAvulsos },
    { name: "Comissões", value: totalComissoes },
  ].filter(i => i.value > 0), [totalCustosServicos, totalSalarios, totalCustosAvulsos, totalComissoes]);

  const dadosBarras = useMemo(() => {
    if (!rankingData) return [];
    return rankingData.map(r => ({ nome: r.nomeConsultor.split(" ")[0], coletado: r.valorColetado, faturado: r.valorFaturado }));
  }, [rankingData]);

  const dadosCategorias = useMemo(() => {
    if (!despesas) return [];
    const map = new Map<string, number>();
    for (const d of despesas) { const cat = d.categoria || "Outros"; map.set(cat, (map.get(cat) || 0) + parseFloat(String(d.valor || 0))); }
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [despesas]);

  const navMes = (dir: number) => {
    if (dir === -1) { if (mes === 1) { setMes(12); setAno(ano - 1); } else setMes(mes - 1); }
    else { if (mes === 12) { setMes(1); setAno(ano + 1); } else setMes(mes + 1); }
  };

  const abaClass = (a: AbaAtiva) =>
    `px-4 py-2 text-sm font-medium rounded-lg transition-colors ${aba === a ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-100"}`;

  return (
    <LifeDashboardLayout title="Despesas & Financeiro">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Controle Financeiro</h2>
            <p className="text-sm text-gray-500">Visão completa de receitas, custos e lucro</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navMes(-1)} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[130px] text-center">{MESES[mes-1]} {ano}</div>
            <Button variant="outline" size="icon" onClick={() => navMes(1)} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className={abaClass("resumo")} onClick={() => setAba("resumo")}>📊 Resumo Financeiro</button>
          <button className={abaClass("custos")} onClick={() => setAba("custos")}>💸 Custos Avulsos</button>
          <button className={abaClass("colaboradores")} onClick={() => setAba("colaboradores")}>👥 Colaboradores</button>
          <button className={abaClass("graficos")} onClick={() => setAba("graficos")}>📈 Gráficos</button>
        </div>

        {aba === "resumo" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Coletado", val: totalColetado, sub: "Recebido à vista", from: "from-blue-50", to: "to-blue-100", text: "text-blue-700", sub2: "text-blue-500", label2: "text-blue-600" },
                { label: "Total Faturado", val: totalFaturado, sub: "Contratos assinados", from: "from-violet-50", to: "to-violet-100", text: "text-violet-700", sub2: "text-violet-500", label2: "text-violet-600" },
                { label: "Total Gastos", val: totalGastos, sub: "Todos os custos", from: "from-red-50", to: "to-red-100", text: "text-red-700", sub2: "text-red-500", label2: "text-red-600" },
                { label: "Lucro Líquido", val: liquido, sub: totalColetado > 0 ? pct(liquido / totalColetado * 100) + " da receita" : "—", from: liquido >= 0 ? "from-emerald-50" : "from-red-50", to: liquido >= 0 ? "to-emerald-100" : "to-red-100", text: liquido >= 0 ? "text-emerald-700" : "text-red-700", sub2: liquido >= 0 ? "text-emerald-500" : "text-red-500", label2: liquido >= 0 ? "text-emerald-600" : "text-red-600" },
              ].map(c => (
                <Card key={c.label} className={`border-0 shadow-sm bg-gradient-to-br ${c.from} ${c.to}`}>
                  <CardContent className="p-4">
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${c.label2}`}>{c.label}</p>
                    <p className={`text-xl font-bold ${c.text}`}>{fmt(c.val)}</p>
                    <p className={`text-xs mt-1 ${c.sub2}`}>{c.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-indigo-500" />
                  Detalhamento de Custos — {MESES[mes-1]} {ano}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-0">
                {[
                  { label: "Coletado Bruto", sub: "Receita do mês", val: totalColetado, color: "text-blue-600", prefix: "" },
                  { label: "(-) Custos de Serviços", sub: `${qtdLimpaName > 0 ? `${qtdLimpaName}x Limpa Nome (${fmt(qtdLimpaName * custoLimpaName)})` : ""}${qtdLimpaName > 0 && qtdRating > 0 ? " + " : ""}${qtdRating > 0 ? `${qtdRating}x Rating (${fmt(qtdRating * custoRating)})` : ""}${qtdLimpaName === 0 && qtdRating === 0 ? "Nenhum serviço" : ""}`, val: totalCustosServicos, color: "text-red-500", prefix: "- " },
                  { label: "(-) Salários", sub: `${colaboradores?.length || 0} colaborador(es)`, val: totalSalarios, color: "text-red-500", prefix: "- " },
                  { label: "(-) Comissões", sub: "Pagas às consultoras", val: totalComissoes, color: "text-red-500", prefix: "- " },
                  { label: "(-) Custos Avulsos", sub: `${despesas?.length || 0} lançamento(s)`, val: totalCustosAvulsos, color: "text-red-500", prefix: "- " },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-700">{item.label}</p>
                      <p className="text-xs text-gray-400">{item.sub}</p>
                    </div>
                    <span className={`text-sm font-bold ${item.color}`}>{item.prefix}{fmt(item.val)}</span>
                  </div>
                ))}
                <div className={`flex justify-between items-center py-3 px-4 rounded-xl mt-3 ${liquido >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
                  <div>
                    <p className={`text-sm font-bold ${liquido >= 0 ? "text-emerald-700" : "text-red-700"}`}>= Lucro Líquido</p>
                    <p className={`text-xs ${liquido >= 0 ? "text-emerald-500" : "text-red-500"}`}>Coletado − todos os custos</p>
                  </div>
                  <span className={`text-lg font-bold ${liquido >= 0 ? "text-emerald-700" : "text-red-700"}`}>{fmt(liquido)}</span>
                </div>
              </CardContent>
            </Card>

            {rankingData && rankingData.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Produção por Consultora — {MESES[mes-1]} {ano}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {rankingData.map((r, i) => {
                      const p = totalColetado > 0 ? (r.valorColetado / totalColetado * 100) : 0;
                      const cores = ["bg-yellow-400","bg-gray-400","bg-amber-600","bg-indigo-400","bg-emerald-400"];
                      return (
                        <div key={r.consultorId} className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${cores[i] || "bg-gray-300"}`}>{i + 1}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700 truncate">{r.nomeConsultor}</span>
                              <span className="text-sm font-bold text-indigo-600 ml-2">{fmt(r.valorColetado)}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${p}%` }} />
                            </div>
                            <div className="flex gap-3 mt-1">
                              <span className="text-xs text-gray-400">{r.totalVendas} vendas</span>
                              <span className="text-xs text-gray-400">{r.totalReunioesFeitas} reuniões</span>
                              <span className="text-xs text-gray-400">{r.percentualFechamento}% fechamento</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {aba === "custos" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-700">Custos Avulsos</p>
                <p className="text-xs text-gray-400">Tráfego, consultas, investimentos e outros</p>
              </div>
              <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm"><Plus className="w-4 h-4 mr-1" /> Novo Custo</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Registrar Custo Avulso</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); if (!form.descricao || !form.valor) { toast.error("Preencha os campos obrigatórios"); return; } createDespesaMutation.mutate({ ...form, valor: parseFloat(form.valor), mes, ano }); }} className="space-y-4 mt-2">
                    <div><Label>Descrição *</Label><Input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Tráfego Meta Ads..." /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Valor (R$) *</Label><Input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" /></div>
                      <div><Label>Data</Label><Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
                    </div>
                    <div><Label>Categoria</Label><Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{CATEGORIAS_AVULSO.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
                    <div><Label>Forma de Pagamento</Label><Select value={form.formaPagamento} onValueChange={v => setForm(f => ({ ...f, formaPagamento: v }))}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent>{FORMAS_PAGAMENTO.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}</SelectContent></Select></div>
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenDespesa(false)}>Cancelar</Button>
                      <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createDespesaMutation.isPending}>{createDespesaMutation.isPending ? "Salvando..." : "Registrar"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Card className="border-0 shadow-sm bg-red-50"><CardContent className="p-4"><p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Total Avulsos</p><p className="text-xl font-bold text-red-700">{fmt(totalCustosAvulsos)}</p><p className="text-xs text-red-400">{despesas?.length || 0} lançamentos</p></CardContent></Card>
              <Card className="border-0 shadow-sm bg-amber-50"><CardContent className="p-4"><p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">% do Coletado</p><p className="text-xl font-bold text-amber-700">{totalColetado > 0 ? pct(totalCustosAvulsos / totalColetado * 100) : "0%"}</p><p className="text-xs text-amber-400">Impacto na receita</p></CardContent></Card>
            </div>

            {!despesas || despesas.length === 0 ? (
              <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center"><Wallet className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">Nenhum custo avulso em {MESES[mes-1]} {ano}</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {despesas.map(d => (
                  <Card key={d.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-800 truncate">{d.descricao}</p>
                            {d.categoria && <Badge variant="outline" className="text-xs shrink-0">{d.categoria}</Badge>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{new Date(d.data).toLocaleDateString("pt-BR")}</span>
                            {d.formaPagamento && <span>• {d.formaPagamento}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-red-600">{fmt(parseFloat(String(d.valor || 0)))}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => deleteDespesaMutation.mutate({ id: d.id })}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === "colaboradores" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-semibold text-gray-700">Colaboradores & Salários</p>
                <p className="text-xs text-gray-400">Equipe fixa da operação</p>
              </div>
              <Dialog open={openColaborador} onOpenChange={setOpenColaborador}>
                <DialogTrigger asChild>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 text-sm"><Plus className="w-4 h-4 mr-1" /> Colaborador</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>Adicionar Colaborador</DialogTitle></DialogHeader>
                  <form onSubmit={e => { e.preventDefault(); if (!colabForm.nome || !colabForm.salario) { toast.error("Preencha nome e salário"); return; } createColabMutation.mutate({ ...colabForm, salario: parseFloat(colabForm.salario) }); }} className="space-y-4 mt-2">
                    <div><Label>Nome *</Label><Input value={colabForm.nome} onChange={e => setColabForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" /></div>
                    <div><Label>Cargo</Label><Input value={colabForm.cargo} onChange={e => setColabForm(f => ({ ...f, cargo: e.target.value }))} placeholder="Ex: Consultora, Suporte..." /></div>
                    <div><Label>Salário (R$) *</Label><Input type="number" step="0.01" value={colabForm.salario} onChange={e => setColabForm(f => ({ ...f, salario: e.target.value }))} placeholder="1800,00" /></div>
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="outline" className="flex-1" onClick={() => setOpenColaborador(false)}>Cancelar</Button>
                      <Button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white" disabled={createColabMutation.isPending}>{createColabMutation.isPending ? "Salvando..." : "Adicionar"}</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="border-0 shadow-sm bg-amber-50"><CardContent className="p-4 flex justify-between items-center"><div><p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Total Salários</p><p className="text-xl font-bold text-amber-700">{fmt(totalSalarios)}</p></div><Users className="w-8 h-8 text-amber-400" /></CardContent></Card>

            {!colaboradores || colaboradores.length === 0 ? (
              <Card className="border-0 shadow-sm"><CardContent className="p-8 text-center"><Users className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 text-sm">Nenhum colaborador cadastrado</p></CardContent></Card>
            ) : (
              <div className="space-y-2">
                {colaboradores.map(c => (
                  <Card key={c.id} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1"><p className="text-sm font-semibold text-gray-800">{c.nome}</p>{c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}</div>
                        {editandoColab === c.id ? (
                          <div className="flex items-center gap-2">
                            <Input type="number" step="0.01" value={editSalario} onChange={e => setEditSalario(e.target.value)} className="w-28 h-8 text-sm" />
                            <Button size="icon" className="h-7 w-7 bg-emerald-500 hover:bg-emerald-600 text-white" onClick={() => { toast.info("Edição de salário em breve"); setEditandoColab(null); }}><Check className="w-3 h-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditandoColab(null)}><X className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-amber-600">{fmt(parseFloat(String(c.salario || 0)))}</span>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-500" onClick={() => { setEditandoColab(c.id); setEditSalario(String(c.salario || "")); }}><Edit2 className="w-3 h-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => deleteColabMutation.mutate({ id: c.id })}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {aba === "graficos" && (
          <div className="space-y-6">
            {dadosBarras.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Produção por Consultora</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dadosBarras} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="nome" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="coletado" name="Coletado" fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="faturado" name="Faturado" fill="#a5b4fc" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {dadosPizza.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Distribuição de Custos</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={dadosPizza} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                        {dadosPizza.map((_, i) => <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {dadosCategorias.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-gray-700">Custos Avulsos por Categoria</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={dadosCategorias} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `R$${v}`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Bar dataKey="value" name="Valor" fill="#f59e0b" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {dadosBarras.length === 0 && dadosPizza.length === 0 && (
              <Card className="border-0 shadow-sm"><CardContent className="p-10 text-center"><BarChart2 className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-gray-400 text-sm">Nenhum dado para exibir em {MESES[mes-1]} {ano}</p></CardContent></Card>
            )}
          </div>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
