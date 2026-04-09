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
import ModalGerenciarParcelas from "@/components/ModalGerenciarParcelas";
import ModalEditarVenda, { type VendaEditData } from "@/components/ModalEditarVenda";
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
  const [formDatesVencimento, setFormDatesVencimento] = useState<string[]>([]);
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<VendaEditData | null>(null);
  const [openGerenciarParcelas, setOpenGerenciarParcelas] = useState<any | null>(null);

  const isAdmin = user?.role === "admin";
  const { data: todosConsultores } = trpc.consultores.list.useQuery();
  const consultorLogado = todosConsultores?.find(c => c.email === user?.email);
  const consultorLogadoId = consultorLogado?.id;

  // Admin vê todos; consultor vê apenas os próprios
  const { data: vendasAdmin, refetch: refetchAdmin } = trpc.vendas.listByPeriod.useQuery(
    { mes, ano }, { enabled: isAdmin }
  );
  const { data: vendasConsultor, refetch: refetchConsultor } = trpc.vendas.listByConsultor.useQuery(
    { consultorId: consultorLogadoId || 0, mes, ano },
    { enabled: !isAdmin && !!consultorLogadoId }
  );
  const vendas = isAdmin ? vendasAdmin : vendasConsultor;
  const refetch = isAdmin ? refetchAdmin : refetchConsultor;
  const consultores = isAdmin ? todosConsultores : undefined;

  const utils = trpc.useUtils();

  function invalidarTudo() {
    refetch();
    utils.parcelasCompletas.byConsultor.invalidate();
    utils.parcelas.pendentesConsultor.invalidate();
    utils.parcelas.coletadoByConsultor.invalidate();
    utils.parcelas.futurasConsultor.invalidate();
    utils.parcelas.devedores.invalidate();
    utils.parcelas.listPendentes.invalidate();
    utils.parcelas.listAll.invalidate();
    utils.parcelas.vencendoHoje.invalidate();
    utils.parcelas.coletadoAdmin.invalidate();
    utils.dashboard.stats.invalidate();
    utils.dashboardFinanceiro.get.invalidate();
    utils.rankings.listByPeriod.invalidate();
  }

  const createParcelasMut = trpc.parcelas.create.useMutation({
    onSuccess: () => invalidarTudo(),
    onError: (e) => toast.error("Erro ao criar parcelas: " + e.message),
  });
  const createMutation = trpc.vendas.create.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.vendas.update.useMutation({
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.vendas.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); invalidarTudo(); },
    onError: (e) => toast.error(e.message),
  });
  const cancelarMutation = trpc.vendas.cancelar.useMutation({
    onSuccess: () => { toast.success("Venda cancelada e cliente movido para Estorno no Pipeline!"); setOpenEstorno(null); setMotivoEstorno(""); invalidarTudo(); },
    onError: (e) => toast.error(e.message),
  });
  const pagarParcelaMutation = trpc.parcelas.markPaid.useMutation({
    onSuccess: () => { toast.success("Parcela paga!"); invalidarTudo(); },
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

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (!form.clienteNome || !form.valorFaturado) { toast.error("Preencha os campos obrigatórios"); return; }
    const custoAuto = form.servicos.includes("limpa_nome") && form.servicos.includes("rating") ? 180
      : form.servicos.includes("limpa_nome") ? 70
      : form.servicos.includes("rating") ? 110 : 0;
    const faturado = parseFloat(form.valorFaturado);
    const coletado = parseFloat(form.valorColetado || form.valorFaturado);
    const qtdParcelas = parseInt(form.qtdParcelas) || 0;
    try {
      const vendaResult = await createMutation.mutateAsync({
        clienteNome: form.clienteNome,
        clienteCpfCnpj: form.clienteCpfCnpj || undefined,
        tipo: form.tipo as "PF" | "PJ",
        valorFaturado: faturado,
        valorColetado: coletado,
        parcelasRestantes: qtdParcelas,
        consultorId: form.consultorId ? parseInt(form.consultorId) : undefined,
        comissaoPercent: parseFloat(form.comissaoPercent) || 10,
        dataVenda: form.dataVenda,
        servicos: form.servicos,
        custoServico: form.custoServico ? parseFloat(form.custoServico) : custoAuto,
      });
      const vendaId = vendaResult?.vendaId;
      // Criar parcelas se houver parcelamento
      if (vendaId && qtdParcelas > 0 && coletado < faturado) {
        let dates = formDatesVencimento;
        if (dates.length === 0) {
          const hoje = new Date();
          dates = Array.from({ length: qtdParcelas }, (_, i) => {
            const d = new Date(hoje);
            d.setMonth(d.getMonth() + i + 1);
            return d.toISOString().split("T")[0];
          });
        }
        const restante = faturado - coletado;
        const valorParcela = restante / qtdParcelas;
        if (valorParcela > 0) {
          await createParcelasMut.mutateAsync({
            vendaId,
            parcelas: dates.map(d => ({ valor: valorParcela, vencimento: d })),
          });
          toast.success(`Venda registrada com ${qtdParcelas} parcela(s)!`);
        }
      } else {
        toast.success("Venda registrada!");
      }
      setOpenCreate(false);
      setForm({ clienteNome: "", clienteEmail: "", clienteCpfCnpj: "", tipo: "PF", valorFaturado: "", valorColetado: "", formaPagamento: "", qtdParcelas: "1", consultorId: "", comissaoPercent: "10", dataVenda: new Date().toISOString().split("T")[0], servicos: [], custoServico: "" });
      setFormDatesVencimento([]);
      invalidarTudo();
    } catch (err) {
      console.error("Erro ao criar venda:", err);
    }
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
            <Dialog open={openCreate} onOpenChange={(open) => {
              setOpenCreate(open);
              if (open && !isAdmin && consultorLogadoId) {
                setForm(f => ({ ...f, consultorId: String(consultorLogadoId) }));
              }
            }}>
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
                      <Label>Qtd. Parcelas do Restante</Label>
                      <Input type="number" min="0" max="60" value={form.qtdParcelas} onChange={e => {
                        const qtd = parseInt(e.target.value) || 0;
                        setForm({ ...form, qtdParcelas: e.target.value });
                        // Gerar datas automáticas para as parcelas
                        const hoje = new Date();
                        const dates = Array.from({ length: qtd }, (_, i) => {
                          const d = new Date(hoje);
                          d.setMonth(d.getMonth() + i + 1);
                          return d.toISOString().split("T")[0];
                        });
                        setFormDatesVencimento(dates);
                      }} />
                    </div>
                    {parseInt(form.qtdParcelas) > 0 && parseFloat(form.valorColetado || "0") < parseFloat(form.valorFaturado || "0") && (
                      <div className="col-span-2">
                        <Label className="text-sm font-medium">Datas de Vencimento das Parcelas</Label>
                        <div className="space-y-2 mt-1">
                          {Array.from({ length: parseInt(form.qtdParcelas) || 0 }, (_, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 w-16">Parcela {i + 1}:</span>
                              <Input
                                type="date"
                                value={formDatesVencimento[i] || ""}
                                onChange={e => {
                                  const nd = [...formDatesVencimento];
                                  nd[i] = e.target.value;
                                  setFormDatesVencimento(nd);
                                }}
                                className="text-xs h-7 flex-1"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {isAdmin && (
                    <div>
                      <Label>Consultor</Label>
                      <Select value={form.consultorId} onValueChange={v => setForm({ ...form, consultorId: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    )}
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
              const parcelasPagas = parcelas.filter((p: any) => p.status === 'pago').length;
              const parcelasPendentes = parcelas.filter((p: any) => p.status === 'pendente');
              const valorFuturo = parcelasPendentes.reduce((s: number, p: any) => s + parseFloat(String(p.valor || 0)), 0);
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
                          {valorFuturo > 0 && (
                            <div className="text-sm">
                              <span className="text-gray-500 text-xs">A Receber: </span>
                              <span className="font-medium text-emerald-600">{formatCurrency(valorFuturo)}</span>
                              <span className="text-gray-400 text-xs ml-1">({parcelasPendentes.length} parcela{parcelasPendentes.length !== 1 ? 's' : ''})</span>
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => setOpenGerenciarParcelas(venda)}
                          className="mt-2 text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          {parcelas.length > 0 ? `${parcelasPagas}/${parcelas.length} parcelas pagas` : "Gerenciar Parcelas"}
                        </button>
                      </div>
                      <div className="flex gap-1.5">
                        <Button variant="outline" size="sm" className="h-8 px-2 text-emerald-600 border-emerald-200 hover:bg-emerald-50 text-xs gap-1"
                          onClick={() => setOpenGerenciarParcelas(venda)}>
                          <CreditCard className="w-3.5 h-3.5" /> Parcelas
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 px-2 text-blue-600 border-blue-200 hover:bg-blue-50 text-xs gap-1"
                          onClick={() => {
                            const servs = Array.isArray(venda.servicos) ? venda.servicos : [];
                            setEditForm({
                              id: venda.id,
                              clienteNome: venda.clienteNome || "",
                              clienteCpfCnpj: venda.clienteCpfCnpj || "",
                              clienteTelefone: (venda as any).clienteTelefone || "",
                              tipo: venda.tipo || "PF",
                              valorFaturado: String(venda.valorFaturado || ""),
                              valorColetado: String(venda.valorColetado || ""),
                              consultorId: String(venda.consultorId || ""),
                              comissaoPercent: String(venda.comissaoPercent || "10"),
                              dataVenda: new Date(venda.dataVenda).toISOString().split("T")[0],
                              servicos: servs,
                              custoServico: String(venda.custoServico || ""),
                              observacoes: venda.observacoes || "",
                              formaPagamento: (venda as any).formaPagamento || "",
                              parcelasQtd: 0,
                              datesVencimento: [],
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
      <ModalEditarVenda
        open={!!openEdit}
        onClose={() => setOpenEdit(null)}
        venda={editForm}
        consultores={consultores}
        showConsultor={true}
        isSaving={updateMutation.isPending}
        onSave={async (data) => {
          const custoAuto = data.servicos.includes("Limpa Nome") && data.servicos.includes("Rating Bancário") ? 180
            : data.servicos.includes("Limpa Nome") ? 70
            : data.servicos.includes("Rating Bancário") ? 110 : 0;
          try {
            await updateMutation.mutateAsync({
              id: data.id,
              clienteNome: data.clienteNome,
              clienteCpfCnpj: data.clienteCpfCnpj || undefined,
              clienteTelefone: data.clienteTelefone || undefined,
              tipo: data.tipo as "PF" | "PJ",
              valorFaturado: parseFloat(data.valorFaturado),
              valorColetado: parseFloat(data.valorColetado || data.valorFaturado),
              consultorId: data.consultorId ? parseInt(data.consultorId) : undefined,
              comissaoPercent: parseFloat(data.comissaoPercent || "10") || 10,
              dataVenda: data.dataVenda,
              servicos: data.servicos,
              custoServico: data.custoServico ? parseFloat(data.custoServico) : custoAuto,
              observacoes: data.observacoes || undefined,
            });
            // Criar parcelas se informadas
            const qtd = data.parcelasQtd || 0;
            const faturado = parseFloat(data.valorFaturado) || 0;
            const coletado = parseFloat(data.valorColetado || data.valorFaturado) || 0;
            const restante = faturado - coletado;
            if (qtd > 0 && restante > 0 && data.datesVencimento && data.datesVencimento.length > 0) {
              const valorParcela = restante / qtd;
              const datas = data.datesVencimento.slice(0, qtd);
              await createParcelasMut.mutateAsync({
                vendaId: data.id,
                parcelas: datas.map(d => ({ valor: valorParcela, vencimento: d })),
              });
              toast.success(`Venda atualizada com ${qtd} parcela(s) criada(s)!`);
            } else {
              toast.success("Venda atualizada!");
            }
            setOpenEdit(null);
            invalidarTudo();
          } catch (err: any) {
            toast.error("Erro ao salvar: " + (err?.message || "Tente novamente"));
          }
        }}
      />

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
      {/* Modal de Gerenciar Parcelas */}
      {openGerenciarParcelas && (
        <ModalGerenciarParcelas
          vendaId={openGerenciarParcelas.id}
          clienteNome={openGerenciarParcelas.clienteNome}
          valorFaturado={parseFloat(String(openGerenciarParcelas.valorFaturado || 0))}
          valorColetado={parseFloat(String(openGerenciarParcelas.valorColetado || 0))}
          open={!!openGerenciarParcelas}
          onClose={() => setOpenGerenciarParcelas(null)}
          onUpdate={() => invalidarTudo()}
        />
      )}
    </LifeDashboardLayout>
  );
}
