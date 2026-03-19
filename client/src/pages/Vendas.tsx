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
import { Plus, ChevronLeft, ChevronRight, DollarSign, Trash2, Edit2, CreditCard, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
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
  const [openEstorno, setOpenEstorno] = useState<any | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState("");
  const [form, setForm] = useState({
    clienteNome: "", clienteEmail: "", clienteCpfCnpj: "", tipo: "PF",
    valorFaturado: "", valorColetado: "", formaPagamento: "", qtdParcelas: "1",
    consultorId: "", comissaoPercent: "10", dataVenda: new Date().toISOString().split("T")[0],
    servicos: [] as string[], custoServico: "",
  });
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const { data: vendas, refetch } = trpc.vendas.listByPeriod.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();

  const createMutation = trpc.vendas.create.useMutation({
    onSuccess: () => { toast.success("Venda registrada!"); setOpenCreate(false); setForm({ clienteNome: "", clienteEmail: "", clienteCpfCnpj: "", tipo: "PF", valorFaturado: "", valorColetado: "", formaPagamento: "", qtdParcelas: "1", consultorId: "", comissaoPercent: "10", dataVenda: new Date().toISOString().split("T")[0], servicos: [], custoServico: "" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.vendas.update.useMutation({
    onSuccess: () => { toast.success("Venda atualizada!"); setOpenEdit(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.vendas.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const cancelarMutation = trpc.vendas.cancelar.useMutation({
    onSuccess: () => { toast.success("Venda cancelada e cliente movido para Estorno no Pipeline!"); setOpenEstorno(null); setMotivoEstorno(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const pagarParcelaMutation = trpc.parcelas.markPaid.useMutation({
    onSuccess: () => { toast.success("Parcela paga!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const totalFaturado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0) || 0;
  const totalColetado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0) || 0;
  const totalComissoes = vendas?.reduce((s, v) => {
    const coletado = parseFloat(String(v.valorColetado || 0));
    const custo = parseFloat(String(v.custoServico || 0));
    const pct = parseFloat(String(v.comissaoPercent || 10)) / 100;
    return s + ((coletado - custo) * pct);
  }, 0) || 0;

  const handleCreate = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!form.clienteNome || !form.valorFaturado) { toast.error("Preencha os campos obrigatórios"); return; }
    // Calcular custo automaticamente baseado nos serviços selecionados
    const custoAuto = form.servicos.includes("limpa_nome") && form.servicos.includes("rating") ? 180
      : form.servicos.includes("limpa_nome") ? 70
      : form.servicos.includes("rating") ? 110 : 0;
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
      servicos: form.servicos,
      custoServico: form.custoServico ? parseFloat(form.custoServico) : custoAuto,
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
                <Button className="bg-blue-600 hover:bg-blue-700 text-white ml-2">
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
                      <Label>Serviços Contratados</Label>
                      <div className="flex gap-4 mt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.servicos.includes("limpa_nome")} onChange={e => setForm({ ...form, servicos: e.target.checked ? [...form.servicos, "limpa_nome"] : form.servicos.filter(s => s !== "limpa_nome") })} className="w-4 h-4 rounded" />
                          <span className="text-sm">🧹 Limpa Nome</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.servicos.includes("rating")} onChange={e => setForm({ ...form, servicos: e.target.checked ? [...form.servicos, "rating"] : form.servicos.filter(s => s !== "rating") })} className="w-4 h-4 rounded" />
                          <span className="text-sm">⭐ Rating Bancário</span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending}>Registrar</Button>
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Total Coletado</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalColetado)}</p>
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
              const comissao = (parseFloat(String(venda.valorColetado || 0)) - parseFloat(String(venda.custoServico || 0))) * parseFloat(String(venda.comissaoPercent || 10)) / 100;
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
                            <span className="font-medium text-blue-600">{formatCurrency(parseFloat(String(venda.valorColetado || 0)))}</span>
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
                                      <span className="text-blue-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Pago</span>
                                    ) : (
                                      <Button size="sm" className="h-5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2"
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
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs gap-1"
                          onClick={() => {
                            const servs = Array.isArray(venda.servicos) ? venda.servicos : [];
                            setEditForm({
                              id: venda.id,
                              clienteNome: venda.clienteNome || "",
                              clienteCpfCnpj: venda.clienteCpfCnpj || "",
                              tipo: venda.tipo || "PF",
                              valorFaturado: String(venda.valorFaturado || ""),
                              valorColetado: String(venda.valorColetado || ""),
                              consultorId: String(venda.consultorId || ""),
                              comissaoPercent: String(venda.comissaoPercent || "10"),
                              dataVenda: new Date(venda.dataVenda).toISOString().split("T")[0],
                              servicos: servs,
                              custoServico: String(venda.custoServico || ""),
                              observacoes: venda.observacoes || "",
                            });
                            setOpenEdit(venda);
                          }}>
                          <Edit2 className="w-3.5 h-3.5" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-orange-600 border-orange-200 hover:bg-orange-50 text-xs gap-1"
                          onClick={() => { setOpenEstorno(venda); setMotivoEstorno(""); }}>
                          <XCircle className="w-3.5 h-3.5" /> Estorno
                        </Button>
                        {user?.role === "admin" && (
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => { if (confirm("Remover venda permanentemente?")) deleteMutation.mutate({ id: venda.id }); }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Edição */}
      <Dialog open={!!openEdit} onOpenChange={(o) => { if (!o) setOpenEdit(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Venda</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!editForm.clienteNome || !editForm.valorFaturado) { toast.error("Preencha os campos obrigatórios"); return; }
            const custoAuto = editForm.servicos.includes("limpa_nome") && editForm.servicos.includes("rating") ? 180
              : editForm.servicos.includes("limpa_nome") ? 70
              : editForm.servicos.includes("rating") ? 110 : 0;
            updateMutation.mutate({
              id: editForm.id,
              clienteNome: editForm.clienteNome,
              clienteCpfCnpj: editForm.clienteCpfCnpj || undefined,
              tipo: editForm.tipo as "PF" | "PJ",
              valorFaturado: parseFloat(editForm.valorFaturado),
              valorColetado: parseFloat(editForm.valorColetado || editForm.valorFaturado),
              consultorId: editForm.consultorId ? parseInt(editForm.consultorId) : undefined,
              comissaoPercent: parseFloat(editForm.comissaoPercent) || 10,
              dataVenda: editForm.dataVenda,
              servicos: editForm.servicos,
              custoServico: editForm.custoServico ? parseFloat(editForm.custoServico) : custoAuto,
              observacoes: editForm.observacoes || undefined,
            });
          }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Nome do Cliente *</Label>
                <Input value={editForm.clienteNome || ""} onChange={e => setEditForm({ ...editForm, clienteNome: e.target.value })} />
              </div>
              <div>
                <Label>CPF/CNPJ</Label>
                <Input value={editForm.clienteCpfCnpj || ""} onChange={e => setEditForm({ ...editForm, clienteCpfCnpj: e.target.value })} />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select value={editForm.tipo || "PF"} onValueChange={v => setEditForm({ ...editForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data da Venda</Label>
                <Input type="date" value={editForm.dataVenda || ""} onChange={e => setEditForm({ ...editForm, dataVenda: e.target.value })} />
              </div>
              <div>
                <Label>Valor Faturado (R$) *</Label>
                <Input type="number" step="0.01" value={editForm.valorFaturado || ""} onChange={e => setEditForm({ ...editForm, valorFaturado: e.target.value })} />
              </div>
              <div>
                <Label>Valor Coletado (R$)</Label>
                <Input type="number" step="0.01" value={editForm.valorColetado || ""} onChange={e => setEditForm({ ...editForm, valorColetado: e.target.value })} />
              </div>
              <div>
                <Label>Consultor</Label>
                <Select value={editForm.consultorId || ""} onValueChange={v => setEditForm({ ...editForm, consultorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Comissão (%)</Label>
                <Input type="number" step="0.1" value={editForm.comissaoPercent || "10"} onChange={e => setEditForm({ ...editForm, comissaoPercent: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Serviços Contratados</Label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(editForm.servicos || []).includes("limpa_nome")} onChange={e => setEditForm({ ...editForm, servicos: e.target.checked ? [...(editForm.servicos || []), "limpa_nome"] : (editForm.servicos || []).filter((s: string) => s !== "limpa_nome") })} className="w-4 h-4 rounded" />
                    <span className="text-sm">🧹 Limpa Nome</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={(editForm.servicos || []).includes("rating")} onChange={e => setEditForm({ ...editForm, servicos: e.target.checked ? [...(editForm.servicos || []), "rating"] : (editForm.servicos || []).filter((s: string) => s !== "rating") })} className="w-4 h-4 rounded" />
                    <span className="text-sm">⭐ Rating Bancário</span>
                  </label>
                </div>
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Input value={editForm.observacoes || ""} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(null)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={updateMutation.isPending}>Salvar Alterações</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Estorno */}
      <Dialog open={!!openEstorno} onOpenChange={(o) => { if (!o) { setOpenEstorno(null); setMotivoEstorno(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" /> Cancelar Venda / Estorno
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-orange-800">{openEstorno?.clienteNome}</p>
              <p className="text-orange-600 mt-0.5">
                Faturado: {formatCurrency(parseFloat(String(openEstorno?.valorFaturado || 0)))} · Coletado: {formatCurrency(parseFloat(String(openEstorno?.valorColetado || 0)))}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <p className="font-medium mb-1">⚠️ Esta ação irá:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Cancelar todas as parcelas pendentes</li>
                <li>Remover esta venda de todos os cálculos (comissão, ranking, faturamento)</li>
                <li>Mover o cliente para a coluna "Estorno" no Pipeline</li>
              </ul>
            </div>
            <div>
              <Label>Motivo do Cancelamento *</Label>
              <Input
                placeholder="Ex: Pedido de estorno pelo cliente, desistência..."
                value={motivoEstorno}
                onChange={e => setMotivoEstorno(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => { setOpenEstorno(null); setMotivoEstorno(""); }} className="flex-1">Voltar</Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!motivoEstorno.trim() || cancelarMutation.isPending}
                onClick={() => cancelarMutation.mutate({ id: openEstorno.id, motivo: motivoEstorno.trim() })}
              >
                {cancelarMutation.isPending ? "Cancelando..." : "Confirmar Estorno"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LifeDashboardLayout>
  );
}
