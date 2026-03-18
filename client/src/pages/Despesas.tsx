import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, DollarSign, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CATEGORIAS = ["Marketing","Tecnologia","Infraestrutura","Pessoal","Serviços","Impostos","Outros"];
const FORMAS_PAGAMENTO = ["PIX","Boleto","Cartão de Crédito","Cartão de Débito","Transferência","Dinheiro"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Despesas() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [openDespesa, setOpenDespesa] = useState(false);
  const [openColaborador, setOpenColaborador] = useState(false);
  const [form, setForm] = useState({ descricao: "", valor: "", categoria: "", formaPagamento: "", data: new Date().toISOString().split("T")[0] });
  const [colabForm, setColabForm] = useState({ nome: "", cargo: "", salario: "" });

  const { data: despesas, refetch: refetchDespesas } = trpc.despesas.listByPeriod.useQuery({ mes, ano });
  const { data: colaboradores, refetch: refetchColab } = trpc.despesas.colaboradores.list.useQuery();

  const createDespesaMutation = trpc.despesas.create.useMutation({
    onSuccess: () => { toast.success("Despesa registrada!"); setOpenDespesa(false); setForm({ descricao: "", valor: "", categoria: "", formaPagamento: "", data: new Date().toISOString().split("T")[0] }); refetchDespesas(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteDespesaMutation = trpc.despesas.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetchDespesas(); },
    onError: (e) => toast.error(e.message),
  });
  const createColabMutation = trpc.despesas.colaboradores.create.useMutation({
    onSuccess: () => { toast.success("Colaborador adicionado!"); setOpenColaborador(false); setColabForm({ nome: "", cargo: "", salario: "" }); refetchColab(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteColabMutation = trpc.despesas.colaboradores.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetchColab(); },
    onError: (e) => toast.error(e.message),
  });

  const totalDespesas = despesas?.reduce((s, d) => s + parseFloat(String(d.valor || 0)), 0) || 0;
  const totalSalarios = colaboradores?.reduce((s, c) => s + parseFloat(String(c.salario || 0)), 0) || 0;

  const handleCreateDespesa = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.descricao || !form.valor) { toast.error("Preencha os campos obrigatórios"); return; }
    createDespesaMutation.mutate({ ...form, valor: parseFloat(form.valor), mes, ano });
  };

  return (
    <LifeDashboardLayout title="Despesas">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Despesas & Colaboradores</h2>
            <p className="text-sm text-gray-500">Controle de custos operacionais</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="icon" onClick={() => { if(mes===1){setMes(12);setAno(ano-1);}else setMes(mes-1); }} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[130px] text-center">
              {MESES[mes-1]} {ano}
            </div>
            <Button variant="outline" size="icon" onClick={() => { if(mes===12){setMes(1);setAno(ano+1);}else setMes(mes+1); }} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Dialog open={openColaborador} onOpenChange={setOpenColaborador}>
              <DialogTrigger asChild>
                <Button variant="outline" className="ml-1">
                  <Users className="w-4 h-4 mr-1" /> Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Colaborador</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input placeholder="Nome completo" value={colabForm.nome} onChange={e => setColabForm({ ...colabForm, nome: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Input placeholder="Ex: Assistente" value={colabForm.cargo} onChange={e => setColabForm({ ...colabForm, cargo: e.target.value })} />
                  </div>
                  <div>
                    <Label>Salário Mensal (R$) *</Label>
                    <Input type="number" step="0.01" placeholder="0,00" value={colabForm.salario} onChange={e => setColabForm({ ...colabForm, salario: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setOpenColaborador(false)} className="flex-1">Cancelar</Button>
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => { if (!colabForm.nome || !colabForm.salario) { toast.error("Preencha os campos"); return; } createColabMutation.mutate({ nome: colabForm.nome, cargo: colabForm.cargo || undefined, salario: parseFloat(colabForm.salario) }); }}
                      disabled={createColabMutation.isPending}>Adicionar</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={openDespesa} onOpenChange={setOpenDespesa}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Despesa
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Despesa — {MESES[mes-1]} {ano}</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateDespesa} className="space-y-3">
                  <div>
                    <Label>Descrição *</Label>
                    <Input placeholder="Ex: Assinatura software" value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input type="number" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} />
                    </div>
                    <div>
                      <Label>Data</Label>
                      <Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Categoria</Label>
                    <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Forma de Pagamento</Label>
                    <Select value={form.formaPagamento} onValueChange={v => setForm({ ...form, formaPagamento: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>{FORMAS_PAGAMENTO.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpenDespesa(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createDespesaMutation.isPending}>Registrar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Total Despesas</p>
            <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(totalDespesas)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Total Salários</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalSalarios)}</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-xs text-orange-600 uppercase tracking-wide font-medium">Total Custos</p>
            <p className="text-xl font-bold text-orange-700 mt-1">{formatCurrency(totalDespesas + totalSalarios)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Despesas */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Despesas — {MESES[mes-1]} {ano}</CardTitle>
            </CardHeader>
            <CardContent>
              {!despesas || despesas.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhuma despesa registrada</div>
              ) : (
                <div className="space-y-2">
                  {despesas.map((d) => (
                    <div key={d.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{d.descricao}</p>
                        <div className="flex gap-2 mt-0.5">
                          {d.categoria && <span className="text-xs text-gray-400">{d.categoria}</span>}
                          {d.formaPagamento && <span className="text-xs text-gray-400">· {d.formaPagamento}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-600">{formatCurrency(parseFloat(String(d.valor || 0)))}</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { if (confirm("Remover despesa?")) deleteDespesaMutation.mutate({ id: d.id }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Colaboradores */}
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700">Colaboradores (Salários Fixos)</CardTitle>
            </CardHeader>
            <CardContent>
              {!colaboradores || colaboradores.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhum colaborador cadastrado</div>
              ) : (
                <div className="space-y-2">
                  {colaboradores.map((c) => (
                    <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group">
                      <div>
                        <p className="text-sm font-medium text-gray-700">{c.nome}</p>
                        {c.cargo && <p className="text-xs text-gray-400">{c.cargo}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-amber-600">{formatCurrency(parseFloat(String(c.salario || 0)))}/mês</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { if (confirm("Remover colaborador?")) deleteColabMutation.mutate({ id: c.id }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </LifeDashboardLayout>
  );
}
