import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, DollarSign, Trash2, Edit2, CreditCard, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const TIPOS = ["PF", "PJ"];
const FORMAS = ["PIX","Boleto","Cartão de Crédito","Cartão de Débito","Transferência","Dinheiro","Parcelado"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Vendas() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [openCreate, setOpenCreate] = useState(false);
  const [openParcelas, setOpenParcelas] = useState<any | null>(null);
  const [form, setForm] = useState({
    clienteNome: "", clienteEmail: "", clienteCpfCnpj: "", tipo: "PF",
    valorFaturado: "", valorColetado: "", formaPagamento: "", qtdParcelas: "1",
    consultorId: "", comissaoPercent: "10", dataVenda: new Date().toISOString().split("T")[0],
    servicoDescricao: "", custoServico: "",
  });

  const { data: vendas, refetch } = trpc.vendas.listByPeriod.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();

  const createMutation = trpc.vendas.create.useMutation({
    onSuccess: () => { toast.success("Venda registrada!"); setOpenCreate(false); setForm({ clienteNome: "", clienteEmail: "", clienteCpfCnpj: "", tipo: "PF", valorFaturado: "", valorColetado: "", formaPagamento: "", qtdParcelas: "1", consultorId: "", comissaoPercent: "10", dataVenda: new Date().toISOString().split("T")[0], servicoDescricao: "", custoServico: "" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.vendas.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const pagarParcelaMutation = trpc.parcelas.markPaid.useMutation({
    onSuccess: () => { toast.success("Parcela paga!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const totalFaturado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0) || 0;
  const totalColetado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0) || 0;
  const totalComissoes = vendas?.reduce((s, v) => {
    const c = parseFloat(String(v.valorColetado || 0)) * parseFloat(String(v.comissaoPercent || 10)) / 100;
    return s + c;
  }, 0) || 0;

  const handleCreate = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!form.clienteNome || !form.valorFaturado) { toast.error("Preencha os campos obrigatórios"); return; }
    createMutation.mutate({
      clienteNome: form.clienteNome,
      clienteCpfCnpj: form.clienteCpfCnpj || undefined,
      tipo: form.tipo as "PF" | "PJ",
      valorFaturado: parseFloat(form.valorFaturado),
      valorColetado: parseFloat(form.valorColetado || form.valorFaturado),
      parcelasRestantes: parseInt(form.qtdParcelas) || 1,
      consultorId: form.consultorId ? parseInt(form.consultorId) : undefined,
      comissaoPercent: parseFloat(form.comissaoPercent) || 10,
      dataVenda: form.dataVenda,

      custoServico: form.custoServico ? parseFloat(form.custoServico) : undefined,
    });
  };

  return (
    <LifeDashboardLayout title="Vendas">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Vendas</h2>
            <p className="text-sm text-gray-500">{vendas?.length || 0} venda(s) no período</p>
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
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white ml-2">
                  <Plus className="w-4 h-4 mr-1" /> Nova Venda
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader><DialogTitle>Nova Venda</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Nome do Cliente *</Label>
                      <Input placeholder="Nome completo" value={form.clienteNome} onChange={e => setForm({ ...form, clienteNome: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@..." value={form.clienteEmail} onChange={e => setForm({ ...form, clienteEmail: e.target.value })} />
                    </div>
                    <div>
                      <Label>CPF/CNPJ</Label>
                      <Input placeholder="000.000.000-00" value={form.clienteCpfCnpj} onChange={e => setForm({ ...form, clienteCpfCnpj: e.target.value })} />
                    </div>
                    <div>
                      <Label>Tipo</Label>
                      <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data da Venda</Label>
                      <Input type="date" value={form.dataVenda} onChange={e => setForm({ ...form, dataVenda: e.target.value })} />
                    </div>
                    <div>
                      <Label>Valor Faturado (R$) *</Label>
                      <Input type="number" step="0.01" placeholder="0,00" value={form.valorFaturado} onChange={e => setForm({ ...form, valorFaturado: e.target.value })} />
                    </div>
                    <div>
                      <Label>Valor Coletado (R$)</Label>
                      <Input type="number" step="0.01" placeholder="= Faturado" value={form.valorColetado} onChange={e => setForm({ ...form, valorColetado: e.target.value })} />
                    </div>
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select value={form.formaPagamento} onValueChange={v => setForm({ ...form, formaPagamento: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>{FORMAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Qtd. Parcelas</Label>
                      <Input type="number" min="1" max="60" value={form.qtdParcelas} onChange={e => setForm({ ...form, qtdParcelas: e.target.value })} />
                    </div>
                    <div>
                      <Label>Consultor</Label>
                      <Select value={form.consultorId} onValueChange={v => setForm({ ...form, consultorId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Comissão (%)</Label>
                      <Input type="number" step="0.1" value={form.comissaoPercent} onChange={e => setForm({ ...form, comissaoPercent: e.target.value })} />
                    </div>
                    <div className="col-span-2">
                      <Label>Descrição do Serviço</Label>
                      <Input placeholder="Ex: Planejamento financeiro..." value={form.servicoDescricao} onChange={e => setForm({ ...form, servicoDescricao: e.target.value })} />
                    </div>
                    <div>
                      <Label>Custo do Serviço (R$)</Label>
                      <Input type="number" step="0.01" placeholder="0,00" value={form.custoServico} onChange={e => setForm({ ...form, custoServico: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={createMutation.isPending}>Registrar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Total Faturado</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalFaturado)}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-600 uppercase tracking-wide font-medium">Total Coletado</p>
            <p className="text-xl font-bold text-green-700 mt-1">{formatCurrency(totalColetado)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Total Comissões</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalComissoes)}</p>
          </div>
        </div>

        {/* Vendas list */}
        {!vendas || vendas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma venda em {MESES[mes-1]} {ano}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {vendas.map((venda) => {
              const consultor = consultores?.find(c => c.id === venda.consultorId);
              const comissao = parseFloat(String(venda.valorColetado || 0)) * parseFloat(String(venda.comissaoPercent || 10)) / 100;
              const parcelas = (venda as any).parcelas || [];
              const parcelasPagas = parcelas.filter((p: any) => p.pago).length;
              return (
                <Card key={venda.id} className="border-gray-200 hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">{venda.clienteNome}</p>
                          <Badge className={venda.tipo === "PF" ? "bg-blue-100 text-blue-700 text-xs" : "bg-purple-100 text-purple-700 text-xs"}>{venda.tipo}</Badge>

                        </div>
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap text-xs text-gray-500">
                          <span>{new Date(venda.dataVenda).toLocaleDateString("pt-BR")}</span>
                          {consultor && <span>· {consultor.nome}</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-2 flex-wrap">
                          <div className="text-sm">
                            <span className="text-gray-500 text-xs">Faturado: </span>
                            <span className="font-medium text-gray-700">{formatCurrency(parseFloat(String(venda.valorFaturado || 0)))}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500 text-xs">Coletado: </span>
                            <span className="font-medium text-green-600">{formatCurrency(parseFloat(String(venda.valorColetado || 0)))}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-500 text-xs">Comissão: </span>
                            <span className="font-medium text-amber-600">{formatCurrency(comissao)}</span>
                          </div>
                        </div>
                        {parcelas.length > 0 && (
                          <div className="mt-2">
                            <button
                              onClick={() => setOpenParcelas(openParcelas?.id === venda.id ? null : venda)}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <CreditCard className="w-3 h-3" />
                              {parcelasPagas}/{parcelas.length} parcelas pagas
                            </button>
                            {openParcelas?.id === venda.id && (
                              <div className="mt-2 space-y-1.5 pl-4 border-l-2 border-blue-200">
                                {parcelas.map((p: any) => (
                                  <div key={p.id} className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600">Parcela {p.numeroParcela} — {formatCurrency(parseFloat(String(p.valor || 0)))} — {new Date(p.dataVencimento).toLocaleDateString("pt-BR")}</span>
                                    {p.pago ? (
                                      <span className="text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Pago</span>
                                    ) : (
                                      <Button size="sm" className="h-5 text-xs bg-green-600 hover:bg-green-700 text-white px-2"
                                        onClick={() => pagarParcelaMutation.mutate({ id: p.id })}>
                                        Pagar
                                      </Button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      {user?.role === "admin" && (
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                          onClick={() => { if (confirm("Remover venda?")) deleteMutation.mutate({ id: venda.id }); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
