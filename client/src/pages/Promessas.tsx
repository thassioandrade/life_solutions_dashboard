import { useState, useMemo } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Bell, Plus, Edit2, Trash2, CheckCircle2, XCircle,
  Phone, User, Calendar, DollarSign, Clock, AlertTriangle, FileText,
  Upload, CreditCard, Package
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR");
}
function calcDias(dataPromessa: Date | string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const d = new Date(dataPromessa);
  d.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
}

type Promessa = {
  id: number;
  clienteNome: string;
  clienteTelefone?: string | null;
  clienteCpfCnpj?: string | null;
  dataPromessa: Date | string;
  valor?: string | null;
  valorColetado?: string | null;
  valorFaturado?: string | null;
  servicos?: string[] | null;
  formaPagamento?: string | null;
  parcelasQtd?: number | null;
  comprovanteUrl?: string | null;
  vendaId?: number | null;
  observacoes?: string | null;
  consultorId?: number | null;
  agendamentoId?: number | null;
  status: string;
  createdAt: Date | string;
};

type FormState = {
  clienteNome: string;
  clienteTelefone: string;
  clienteCpfCnpj: string;
  dataPromessa: string;
  valor: string;
  observacoes: string;
  consultorId: string;
};

type PagamentoForm = {
  valorColetado: string;
  valorFaturado: string;
  servicos: string[];
  formaPagamento: string;
  parcelasQtd: number;
  comprovanteUrl: string;
  datesVencimento: string[];
};

const FORM_VAZIO: FormState = {
  clienteNome: "",
  clienteTelefone: "",
  clienteCpfCnpj: "",
  dataPromessa: "",
  valor: "",
  observacoes: "",
  consultorId: "",
};

const PAGAMENTO_VAZIO: PagamentoForm = {
  valorColetado: "",
  valorFaturado: "",
  servicos: [],
  formaPagamento: "",
  parcelasQtd: 0,
  comprovanteUrl: "",
  datesVencimento: [],
};

const SERVICOS_OPCOES = [
  { value: "limpa_nome", label: "Limpa Nome" },
  { value: "rating", label: "Rating Bancário" },
];

const FORMAS_PAGAMENTO = ["PIX", "Cartão de Crédito", "Cartão de Débito", "Boleto", "Dinheiro", "Transferência"];

export default function Promessas() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [modalAberto, setModalAberto] = useState(false);
  const [modalPagamento, setModalPagamento] = useState<Promessa | null>(null);
  const [editando, setEditando] = useState<Promessa | null>(null);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [pagForm, setPagForm] = useState<PagamentoForm>(PAGAMENTO_VAZIO);
  const [filtroStatus, setFiltroStatus] = useState<"todas" | "pendente" | "concluido" | "cancelado">("todas");
  const [filtroConsultor, setFiltroConsultor] = useState<string>("todos");
  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  const utils = trpc.useUtils();
  const { data: promessas, isLoading } = trpc.promessas.list.useQuery(undefined, { enabled: isAdmin });
  const { data: consultores } = trpc.consultores.list.useQuery(undefined, { enabled: isAdmin });
  const { data: promessasHoje } = trpc.promessas.hoje.useQuery(undefined, { enabled: isAdmin });

  const createMut = trpc.promessas.create.useMutation({
    onSuccess: () => {
      toast.success("Promessa registrada com sucesso!");
      utils.promessas.list.invalidate();
      utils.promessas.hoje.invalidate();
      setModalAberto(false);
      setForm(FORM_VAZIO);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const updateMut = trpc.promessas.update.useMutation({
    onSuccess: () => {
      toast.success("Promessa atualizada!");
      utils.promessas.list.invalidate();
      utils.promessas.hoje.invalidate();
      utils.vendas.listByPeriod.invalidate();
      setModalAberto(false);
      setModalPagamento(null);
      setEditando(null);
      setForm(FORM_VAZIO);
      setPagForm(PAGAMENTO_VAZIO);
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const deleteMut = trpc.promessas.delete.useMutation({
    onSuccess: () => {
      toast.success("Promessa removida.");
      utils.promessas.list.invalidate();
      utils.promessas.hoje.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uploadComprovanteMut = (trpc.agendamentos as any).uploadComprovante?.useMutation?.({
    onSuccess: (data: { url: string }) => {
      setPagForm(f => ({ ...f, comprovanteUrl: data.url }));
      setUploadingComprovante(false);
      toast.success("Comprovante enviado!");
    },
    onError: () => {
      setUploadingComprovante(false);
      toast.error("Erro ao enviar comprovante");
    },
  });

  const promessasFiltradas = useMemo(() => {
    if (!promessas) return [];
    let list = promessas as Promessa[];
    if (filtroConsultor !== "todos") {
      const cId = parseInt(filtroConsultor);
      list = list.filter(p => p.consultorId === cId);
    }
    if (filtroStatus !== "todas") {
      list = list.filter(p => p.status === filtroStatus);
    }
    return list.sort((a, b) => new Date(a.dataPromessa).getTime() - new Date(b.dataPromessa).getTime());
  }, [promessas, filtroStatus, filtroConsultor]);

  const hoje = (promessasHoje || []) as Promessa[];
  const pendentes = (promessas as Promessa[] || []).filter(p => p.status === "pendente");
  const atrasadas = pendentes.filter(p => calcDias(p.dataPromessa) < 0);
  const futuras = pendentes.filter(p => calcDias(p.dataPromessa) > 0);

  function abrirNova() {
    setEditando(null);
    setForm(FORM_VAZIO);
    setModalAberto(true);
  }

  function abrirEditar(p: Promessa) {
    setEditando(p);
    const d = new Date(p.dataPromessa);
    setForm({
      clienteNome: p.clienteNome,
      clienteTelefone: p.clienteTelefone || "",
      clienteCpfCnpj: p.clienteCpfCnpj || "",
      dataPromessa: d.toISOString().split("T")[0],
      valor: p.valor ? String(parseFloat(p.valor)) : "",
      observacoes: p.observacoes || "",
      consultorId: p.consultorId ? String(p.consultorId) : "",
    });
    setModalAberto(true);
  }

  function abrirPagamento(p: Promessa) {
    setModalPagamento(p);
    setPagForm({
      valorColetado: p.valor ? String(parseFloat(p.valor)) : "",
      valorFaturado: p.valor ? String(parseFloat(p.valor)) : "",
      servicos: p.servicos || [],
      formaPagamento: p.formaPagamento || "",
      parcelasQtd: p.parcelasQtd || 0,
      comprovanteUrl: p.comprovanteUrl || "",
      datesVencimento: [],
    });
  }

  function handleSalvar() {
    if (!form.clienteNome.trim()) { toast.error("Nome do cliente é obrigatório"); return; }
    if (!form.dataPromessa) { toast.error("Data da promessa é obrigatória"); return; }
    const payload = {
      clienteNome: form.clienteNome.trim(),
      clienteTelefone: form.clienteTelefone || undefined,
      clienteCpfCnpj: form.clienteCpfCnpj || undefined,
      dataPromessa: form.dataPromessa,
      valor: form.valor ? parseFloat(form.valor) : undefined,
      observacoes: form.observacoes || undefined,
      consultorId: form.consultorId ? parseInt(form.consultorId) : undefined,
    };
    if (editando) {
      updateMut.mutate({ id: editando.id, ...payload });
    } else {
      createMut.mutate(payload);
    }
  }

  function handleParcelasChange(qtd: number) {
    setPagForm(f => {
      const coletado = parseFloat(f.valorColetado) || 0;
      const faturado = parseFloat(f.valorFaturado) || coletado;
      const dates = Array.from({ length: qtd }, (_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() + i + 1);
        return d.toISOString().split("T")[0];
      });
      return { ...f, parcelasQtd: qtd, datesVencimento: dates };
    });
  }

  function handleConfirmarPagamento() {
    if (!modalPagamento) return;
    if (!pagForm.valorColetado || parseFloat(pagForm.valorColetado) <= 0) {
      toast.error("Informe o valor coletado");
      return;
    }
    if (!pagForm.formaPagamento) {
      toast.error("Informe a forma de pagamento");
      return;
    }

    updateMut.mutate({
      id: modalPagamento.id,
      status: "concluido",
      valorColetado: parseFloat(pagForm.valorColetado),
      valorFaturado: parseFloat(pagForm.valorFaturado) || parseFloat(pagForm.valorColetado),
      servicos: pagForm.servicos,
      formaPagamento: pagForm.formaPagamento,
      parcelasQtd: pagForm.parcelasQtd,
      comprovanteUrl: pagForm.comprovanteUrl || undefined,
      datesVencimento: pagForm.datesVencimento.length > 0 ? pagForm.datesVencimento : undefined,
    });
  }

  function marcarCancelado(p: Promessa) {
    updateMut.mutate({ id: p.id, status: "cancelado" });
  }

  function toggleServico(v: string) {
    setPagForm(f => ({
      ...f,
      servicos: f.servicos.includes(v) ? f.servicos.filter(s => s !== v) : [...f.servicos, v],
    }));
  }

  async function handleUploadComprovante(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 5MB)"); return; }
    setUploadingComprovante(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        if (uploadComprovanteMut) {
          uploadComprovanteMut.mutate({ base64, mimeType: file.type, filename: file.name });
        } else {
          // Fallback: usar URL de objeto local temporário
          const url = URL.createObjectURL(file);
          setPagForm(f => ({ ...f, comprovanteUrl: url }));
          setUploadingComprovante(false);
          toast.success("Comprovante selecionado (será enviado ao salvar)");
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingComprovante(false);
      toast.error("Erro ao processar arquivo");
    }
  }

  function getStatusBadge(p: Promessa) {
    const dias = calcDias(p.dataPromessa);
    if (p.status === "concluido") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">✅ Pago</Badge>;
    if (p.status === "cancelado") return <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-[10px]">Cancelado</Badge>;
    if (dias < 0) return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">{Math.abs(dias)}d atrasado</Badge>;
    if (dias === 0) return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px]">Hoje!</Badge>;
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[10px]">Em {dias}d</Badge>;
  }

  // Cálculo de comissão líquida no modal de pagamento
  const coletadoModal = parseFloat(pagForm.valorColetado) || 0;
  const custoLimpaModal = pagForm.servicos.includes("limpa_nome") ? 70 : 0;
  const custoRatingModal = pagForm.servicos.includes("rating") ? 110 : 0;
  const custoTotalModal = custoLimpaModal + custoRatingModal;
  const baseComissaoModal = Math.max(0, coletadoModal - custoTotalModal);
  const comissaoModal = baseComissaoModal * 0.10;

  return (
    <LifeDashboardLayout title="Promessas de Pagamento">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Promessas de Pagamento</h2>
            <p className="text-sm text-gray-500">Clientes interessados com data prometida de fechamento</p>
          </div>
          <Button onClick={abrirNova} className="text-white gap-2" style={{ background: "#0055FF" }}>
            <Plus className="w-4 h-4" />
            Nova Promessa
          </Button>
        </div>

        {/* Alerta do dia */}
        {hoje.length > 0 && (
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-amber-600 animate-pulse" />
              <p className="font-bold text-amber-800 text-base">
                {hoje.length} promessa{hoje.length > 1 ? "s" : ""} para HOJE — Ligue agora!
              </p>
            </div>
            <div className="space-y-2">
              {hoje.map(p => {
                const consultor = consultores?.find(c => c.id === p.consultorId);
                return (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-200 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-amber-600" />
                      </div>
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
                        {p.observacoes && <p className="text-xs text-gray-400 mt-0.5 italic">{p.observacoes}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => abrirPagamento(p)} disabled={updateMut.isPending}>
                        <CheckCircle2 className="w-3 h-3" />
                        Fechou!
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                        onClick={() => abrirEditar(p)}>
                        <Edit2 className="w-3 h-3" />
                        Editar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer" onClick={() => setFiltroStatus("pendente")}>
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium flex items-center gap-1">
              <Bell className="w-3 h-3" /> Hoje
            </p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{hoje.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">Para ligar hoje</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer" onClick={() => setFiltroStatus("pendente")}>
            <p className="text-xs text-red-600 uppercase tracking-wide font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Atrasadas
            </p>
            <p className="text-2xl font-bold text-red-700 mt-1">{atrasadas.length}</p>
            <p className="text-xs text-red-500 mt-0.5">Passaram da data</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 cursor-pointer" onClick={() => setFiltroStatus("pendente")}>
            <p className="text-xs text-blue-600 uppercase tracking-wide font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" /> Futuras
            </p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{futuras.length}</p>
            <p className="text-xs text-blue-500 mt-0.5">Agendadas</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 cursor-pointer" onClick={() => setFiltroStatus("concluido")}>
            <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Concluídas
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {(promessas as Promessa[] || []).filter(p => p.status === "concluido").length}
            </p>
            <p className="text-xs text-emerald-500 mt-0.5">Vendas fechadas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1">
            {(["todas", "pendente", "concluido", "cancelado"] as const).map(f => (
              <button key={f} onClick={() => setFiltroStatus(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${filtroStatus === f ? "text-white border-transparent" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
                style={filtroStatus === f ? { background: "#0055FF" } : {}}>
                {f === "todas" ? "Todas" : f === "pendente" ? "Pendentes" : f === "concluido" ? "Concluídas" : "Canceladas"}
              </button>
            ))}
          </div>
          {isAdmin && (
            <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
              <SelectTrigger className="w-44 text-sm h-8">
                <SelectValue placeholder="Todas as consultoras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as consultoras</SelectItem>
                {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Lista de promessas */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Quadro de Promessas ({promessasFiltradas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
            ) : promessasFiltradas.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma promessa encontrada</p>
                <p className="text-sm mt-1">Clique em "Nova Promessa" para registrar um interessado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {promessasFiltradas.map(p => {
                  const dias = calcDias(p.dataPromessa);
                  const isAtrasada = p.status === "pendente" && dias < 0;
                  const isHoje = p.status === "pendente" && dias === 0;
                  const consultor = consultores?.find(c => c.id === p.consultorId);
                  return (
                    <div key={p.id} className={`flex items-start justify-between p-3 rounded-lg border transition-all gap-3 ${isAtrasada ? "border-red-200 bg-red-50" : isHoje ? "border-amber-200 bg-amber-50" : p.status === "concluido" ? "border-emerald-200 bg-emerald-50/40" : p.status === "cancelado" ? "border-gray-200 bg-gray-50 opacity-60" : "border-gray-100 hover:bg-gray-50"}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800">{p.clienteNome}</p>
                          {getStatusBadge(p)}
                          {p.vendaId && <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px]">Venda criada</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(p.dataPromessa)}
                          </span>
                          {p.clienteTelefone && (
                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                              <Phone className="w-3 h-3" />
                              {p.clienteTelefone}
                            </span>
                          )}
                          {p.valor && (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <DollarSign className="w-3 h-3" />
                              Prometido: {formatCurrency(parseFloat(p.valor))}
                            </span>
                          )}
                          {p.valorColetado && (
                            <span className="flex items-center gap-1 text-blue-600 font-bold">
                              <DollarSign className="w-3 h-3" />
                              Pago: {formatCurrency(parseFloat(p.valorColetado))}
                            </span>
                          )}
                          {consultor && <span className="text-gray-400">{consultor.nome}</span>}
                        </div>
                        {p.observacoes && (
                          <p className="text-xs text-gray-500 mt-1 italic bg-white/60 rounded px-2 py-1 border border-gray-100">
                            {p.observacoes}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {p.status === "pendente" && (
                          <>
                            <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                              onClick={() => abrirPagamento(p)} disabled={updateMut.isPending} title="Registrar pagamento">
                              <CheckCircle2 className="w-3 h-3" />
                              Pago
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                              onClick={() => abrirEditar(p)} title="Editar">
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-gray-400 hover:text-red-600 gap-1"
                              onClick={() => marcarCancelado(p)} disabled={updateMut.isPending} title="Cancelar">
                              <XCircle className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        {p.status !== "pendente" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:text-red-700 gap-1"
                            onClick={() => deleteMut.mutate({ id: p.id })} disabled={deleteMut.isPending} title="Excluir">
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de criação/edição */}
      <Dialog open={modalAberto} onOpenChange={open => { setModalAberto(open); if (!open) { setEditando(null); setForm(FORM_VAZIO); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editando ? "Editar Promessa" : "Nova Promessa de Pagamento"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">Nome do Cliente *</Label>
              <Input placeholder="Nome completo" value={form.clienteNome}
                onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Telefone</Label>
                <Input placeholder="(11) 99999-9999" value={form.clienteTelefone}
                  onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">CPF/CNPJ</Label>
                <Input placeholder="000.000.000-00" value={form.clienteCpfCnpj}
                  onChange={e => setForm(f => ({ ...f, clienteCpfCnpj: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Data Prometida *</Label>
                <Input type="date" value={form.dataPromessa}
                  onChange={e => setForm(f => ({ ...f, dataPromessa: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Valor Estimado</Label>
                <Input type="number" placeholder="0,00" min="0" step="0.01" value={form.valor}
                  onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              </div>
            </div>
            {isAdmin && (
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Consultora</Label>
                <Select value={form.consultorId} onValueChange={v => setForm(f => ({ ...f, consultorId: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Selecionar consultora" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem consultora</SelectItem>
                    {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</Label>
              <Textarea placeholder="Detalhes do interesse, serviços, situação do cliente..." value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                className="text-sm resize-none" rows={3} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1 text-white" style={{ background: "#0055FF" }}
                onClick={handleSalvar} disabled={createMut.isPending || updateMut.isPending}>
                {editando ? "Salvar Alterações" : "Registrar Promessa"}
              </Button>
              <Button variant="outline" onClick={() => { setModalAberto(false); setEditando(null); setForm(FORM_VAZIO); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento — Registrar venda */}
      <Dialog open={!!modalPagamento} onOpenChange={open => { if (!open) { setModalPagamento(null); setPagForm(PAGAMENTO_VAZIO); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Registrar Pagamento — {modalPagamento?.clienteNome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">

            {/* Valores */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Valores
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-gray-600 mb-1 block">Valor Coletado (entrada) *</Label>
                  <Input type="number" placeholder="0,00" min="0" step="0.01"
                    value={pagForm.valorColetado}
                    onChange={e => setPagForm(f => ({ ...f, valorColetado: e.target.value }))} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Quanto o cliente pagou agora</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-gray-600 mb-1 block">Valor Faturado (total contrato)</Label>
                  <Input type="number" placeholder="0,00" min="0" step="0.01"
                    value={pagForm.valorFaturado}
                    onChange={e => setPagForm(f => ({ ...f, valorFaturado: e.target.value }))} />
                  <p className="text-[10px] text-gray-400 mt-0.5">Valor total do contrato</p>
                </div>
              </div>
            </div>

            {/* Serviços */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" /> Serviços Contratados
              </p>
              <div className="flex gap-4">
                {SERVICOS_OPCOES.map(s => (
                  <div key={s.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`srv-${s.value}`}
                      checked={pagForm.servicos.includes(s.value)}
                      onCheckedChange={() => toggleServico(s.value)}
                    />
                    <label htmlFor={`srv-${s.value}`} className="text-sm text-gray-700 cursor-pointer">{s.label}</label>
                  </div>
                ))}
              </div>
            </div>

            {/* Forma de pagamento */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" /> Forma de Pagamento *
              </p>
              <Select value={pagForm.formaPagamento} onValueChange={v => setPagForm(f => ({ ...f, formaPagamento: v }))}>
                <SelectTrigger className="text-sm"><SelectValue placeholder="Selecionar forma de pagamento" /></SelectTrigger>
                <SelectContent>
                  {FORMAS_PAGAMENTO.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Parcelas */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Parcelas Restantes
              </p>
              <Select value={String(pagForm.parcelasQtd)} onValueChange={v => handleParcelasChange(parseInt(v))}>
                <SelectTrigger className="text-sm w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 0 ? "À vista (sem parcelas)" : `${n} parcela${n > 1 ? "s" : ""}`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pagForm.parcelasQtd > 0 && pagForm.datesVencimento.length > 0 && (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Datas de vencimento das parcelas:</p>
                  {pagForm.datesVencimento.map((d, i) => {
                    const faturado = parseFloat(pagForm.valorFaturado) || parseFloat(pagForm.valorColetado) || 0;
                    const coletado = parseFloat(pagForm.valorColetado) || 0;
                    const valorParcela = pagForm.parcelasQtd > 0 ? (faturado - coletado) / pagForm.parcelasQtd : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16">Parcela {i + 1}:</span>
                        <Input type="date" value={d} className="text-xs h-7 flex-1"
                          onChange={e => {
                            const newDates = [...pagForm.datesVencimento];
                            newDates[i] = e.target.value;
                            setPagForm(f => ({ ...f, datesVencimento: newDates }));
                          }} />
                        {valorParcela > 0 && <span className="text-xs text-emerald-600 font-medium w-24 text-right">{formatCurrency(valorParcela)}</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Comprovante */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Comprovante de Pagamento
              </p>
              {pagForm.comprovanteUrl ? (
                <div className="flex items-center gap-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs text-emerald-700 flex-1 truncate">Comprovante anexado</span>
                  <Button size="sm" variant="outline" className="h-6 text-xs"
                    onClick={() => setPagForm(f => ({ ...f, comprovanteUrl: "" }))}>
                    Remover
                  </Button>
                </div>
              ) : (
                <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{uploadingComprovante ? "Enviando..." : "Clique para anexar comprovante (JPG, PNG, PDF)"}</span>
                  <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleUploadComprovante} disabled={uploadingComprovante} />
                </label>
              )}
            </div>

            {/* Resumo de comissão */}
            {coletadoModal > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">Resumo da Comissão</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <div className="flex justify-between">
                    <span>Valor coletado:</span>
                    <span className="font-medium">{formatCurrency(coletadoModal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Base de cálculo (coletado - custos):</span>
                    <span className="font-medium">{formatCurrency(baseComissaoModal)}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                    <span className="font-bold text-blue-700">Comissão líquida (10%):</span>
                    <span className="font-bold text-blue-700">{formatCurrency(comissaoModal)}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleConfirmarPagamento} disabled={updateMut.isPending}>
                {updateMut.isPending ? "Registrando..." : "✅ Confirmar Pagamento e Criar Venda"}
              </Button>
              <Button variant="outline" onClick={() => { setModalPagamento(null); setPagForm(PAGAMENTO_VAZIO); }}>
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LifeDashboardLayout>
  );
}
