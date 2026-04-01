import { useState, useRef, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { usePromessaAlarm } from "@/hooks/usePromessaAlarm";
import ModalEditarVenda, { type VendaEditData } from "@/components/ModalEditarVenda";
import * as XLSX from "xlsx";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronLeft, ChevronRight, CalendarDays, DollarSign, TrendingUp,
  Clock, Upload, X, CheckCircle2, Trophy, Target, Loader2,
  CreditCard, AlertTriangle, Bell, FileText, XCircle, Edit2
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const STATUS_COLORS: Record<string, string> = {
  confirmado: "bg-blue-100 text-blue-700 border-blue-200",
  realizado: "bg-emerald-100 text-emerald-700 border-emerald-200",
  noshow: "bg-red-100 text-red-700 border-red-200",
  cancelado: "bg-gray-100 text-gray-600 border-gray-200",
  remarcado: "bg-amber-100 text-amber-700 border-amber-200",
};
const STATUS_LABELS: Record<string, string> = {
  confirmado: "Confirmado", realizado: "Realizado", noshow: "No-Show",
  cancelado: "Cancelado", remarcado: "Remarcado",
};
const SERVICOS_OPCOES = ["Limpa Nome", "Rating Bancário", "Planejamento Financeiro", "Consultoria", "Outro"];
const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function getDiasNoMes(ano: number, mes: number) {
  return new Date(ano, mes, 0).getDate();
}
function getPrimeiroDiaSemana(ano: number, mes: number) {
  return new Date(ano, mes - 1, 1).getDay();
}
function diasAtraso(vencimento: Date | string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento);
  v.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - v.getTime()) / (1000 * 60 * 60 * 24));
}

type Agendamento = {
  id: number;
  clienteNome: string;
  clienteEmail?: string | null;
  clienteTelefone?: string | null;
  clienteCpfCnpj?: string | null;
  dataHora: Date;
  status: string;
  valorColetado?: string | null;
  valorFaturado?: string | null;
  parcelasQtd?: number | null;
  servicos?: string[] | null;
  formaPagamento?: string | null;
  resultouVenda?: boolean | null;
  comprovanteUrl?: string | null;
  observacoes?: string | null;
  origem?: string;
  vendaId?: number | null; // para evitar duplicação ao editar
};

type ModalVendaState = {
  status: string;
  valorColetado: string;
  valorFaturado: string;
  parcelasQtd: number;
  datesVencimento: string[];
  servicos: string[];
  formaPagamento: string;
  resultouVenda: boolean;
  observacoes: string;
  comprovanteUrl: string;
  comprovanteFile: File | null;
  clienteTelefone: string;
  clienteCpfCnpj: string;
};

export default function PainelConsultor() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [agSelecionado, setAgSelecionado] = useState<Agendamento | null>(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);
  const [abaPainel, setAbaPainel] = useState<"agenda" | "parcelas" | "devedores" | "vendas">("agenda");
  const [openEstornoConsultor, setOpenEstornoConsultor] = useState<any | null>(null);
  const [motivoEstornoConsultor, setMotivoEstornoConsultor] = useState("");
  const [openEditVenda, setOpenEditVenda] = useState<any | null>(null);
  const [editVendaForm, setEditVendaForm] = useState<VendaEditData | null>(null);
  const [filtroParcelas, setFiltroParcelas] = useState<"todas" | "pendentes" | "pagas" | "atrasadas">("todas");
  const [modalPagamentoParcela, setModalPagamentoParcela] = useState<{ id: number; valor: number; clienteNome: string } | null>(null);
  const [pagParcelaForm, setPagParcelaForm] = useState({ formaPagamento: "", comprovanteUrl: "", comprovanteFile: null as File | null });
  const [uploadingParcela, setUploadingParcela] = useState(false);
  const [modalPromessaAberto, setModalPromessaAberto] = useState(false);
  const [promessaData, setPromessaData] = useState({ dataPromessa: "", horarioPromessa: "", valor: "", observacoes: "" });
  const [salvandoPromessa, setSalvandoPromessa] = useState(false);
  const [, navigate] = useLocation();
  // Ao fechar o modal de agendamento, abre o de promessa com delay para evitar conflito Radix
  const [pendingOpenPromessa, setPendingOpenPromessa] = useState(false);
  useEffect(() => {
    if (pendingOpenPromessa && !modalAberto) {
      setPendingOpenPromessa(false);
      setTimeout(() => setModalPromessaAberto(true), 80);
    }
  }, [pendingOpenPromessa, modalAberto]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [venda, setVenda] = useState<ModalVendaState>({
    status: "confirmado",
    valorColetado: "",
    valorFaturado: "",
    parcelasQtd: 0,
    datesVencimento: [],
    servicos: [],
    formaPagamento: "",
    resultouVenda: false,
    observacoes: "",
    comprovanteUrl: "",
    comprovanteFile: null,
    clienteTelefone: "",
    clienteCpfCnpj: "",
  });

  const { data: consultores } = trpc.consultores.list.useQuery();
  const consultor = consultores?.find(c => c.email === user?.email);
  const utils = trpc.useUtils();

  const { data: agendamentos, isLoading: loadingAg } = trpc.agendamentos.listByConsultor.useQuery(
    { consultorId: consultor?.id || 0, mes, ano },
    { enabled: !!consultor?.id }
  );
  const { data: vendas } = trpc.vendas.listByConsultor.useQuery(
    { consultorId: consultor?.id || 0, mes, ano },
    { enabled: !!consultor?.id }
  );
  const { data: parcelasCompletas } = trpc.parcelasCompletas.byConsultor.useQuery(
    { consultorId: consultor?.id || 0 },
    { enabled: !!consultor?.id }
  );
  const { data: custosServicos } = trpc.custosServicos.get.useQuery();
  const { data: metaConfig } = trpc.configuracoes.get.useQuery({ chave: "meta_coletado_mensal" });
  const { data: rankingData } = trpc.rankings.listByPeriod.useQuery(
    { mes, ano },
    { enabled: !!consultor?.id }
  );
  const { data: parcelasVencendo } = trpc.parcelas.vencendoHoje.useQuery();
  const { data: promessasHoje } = trpc.promessas.hojeByConsultor.useQuery(
    { consultorId: consultor?.id || 0 },
    { enabled: !!consultor?.id }
  );
  const { data: parcelasFuturas } = trpc.parcelas.futurasConsultor.useQuery(
    { consultorId: consultor?.id || 0 },
    { enabled: !!consultor?.id }
  );
  const { data: coletadoParcelas } = trpc.parcelas.coletadoByConsultor.useQuery(
    { consultorId: consultor?.id || 0, mes, ano },
    { enabled: !!consultor?.id }
  );

  const updateAgendamento = trpc.agendamentos.update.useMutation({
    onSuccess: () => {
      utils.agendamentos.listByConsultor.invalidate();
      utils.agendamentos.listByPeriod.invalidate();
      utils.vendas.listByConsultor.invalidate();
      utils.vendas.listByPeriod.invalidate();
      utils.parcelasCompletas.byConsultor.invalidate();
      utils.rankings.listByPeriod.invalidate();
      utils.servicosVendidos.byPeriodo.invalidate();
      toast.success("Agendamento atualizado!");
      setModalAberto(false);
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });
  const createVenda = trpc.vendas.create.useMutation({
    onSuccess: () => {
      utils.vendas.listByConsultor.invalidate();
      utils.vendas.listByPeriod.invalidate();
      utils.rankings.listByPeriod.invalidate();
      utils.servicosVendidos.byPeriodo.invalidate();
    },
    onError: (e) => toast.error("Erro ao registrar venda: " + e.message),
  });
  const createParcelas = trpc.parcelas.create.useMutation({
    onError: (e) => toast.error("Erro ao criar parcelas: " + e.message),
  });
  const uploadComprovante = trpc.upload.comprovante.useMutation({
    onError: (e) => toast.error("Erro no upload: " + e.message),
  });
  const cancelarVendaMutation = trpc.vendas.cancelar.useMutation({
    onSuccess: () => { toast.success("Venda cancelada! Cliente movido para Estorno no Pipeline."); setOpenEstornoConsultor(null); setMotivoEstornoConsultor(""); utils.vendas.listByConsultor.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const updateVendaMutation = trpc.vendas.update.useMutation({
    onSuccess: () => { toast.success("Venda atualizada!"); setOpenEditVenda(null); utils.vendas.listByConsultor.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const okConsultorMutation = trpc.parcelas.okConsultor.useMutation({
    onSuccess: () => {
      utils.parcelasCompletas.byConsultor.invalidate();
      utils.parcelas.coletadoByConsultor.invalidate();
      setModalPagamentoParcela(null);
      setPagParcelaForm({ formaPagamento: "", comprovanteUrl: "", comprovanteFile: null });
      toast.success("Parcela marcada como recebida!");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  async function handleUploadComprovanteParcela(file: File) {
    setUploadingParcela(true);
    try {
      const result = await new Promise<{ url: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const base64 = (ev.target?.result as string).split(",")[1];
            const res = await uploadComprovante.mutateAsync({ fileBase64: base64, mimeType: file.type, tipo: "comprovante_parcela" });
            resolve(res);
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error("Erro ao ler arquivo"));
        reader.readAsDataURL(file);
      });
      setPagParcelaForm(f => ({ ...f, comprovanteUrl: result.url, comprovanteFile: file }));
      toast.success("Comprovante carregado!");
    } catch (e: any) {
      toast.error("Erro no upload: " + (e.message || "Tente novamente"));
    } finally {
      setUploadingParcela(false);
    }
  }

  async function handleConfirmarPagamentoParcela() {
    if (!modalPagamentoParcela) return;
    if (!pagParcelaForm.formaPagamento) { toast.error("Selecione a forma de pagamento"); return; }
    await okConsultorMutation.mutateAsync({
      id: modalPagamentoParcela.id,
      ok: true,
      formaPagamento: pagParcelaForm.formaPagamento,
      comprovanteUrl: pagParcelaForm.comprovanteUrl || undefined,
    });
  }
  const createPromessaMutation = trpc.promessas.create.useMutation({
    onSuccess: () => {
      utils.promessas.hojeByConsultor.invalidate();
      utils.promessas.list.invalidate();
      toast.success("Promessa registrada! Alarme configurado para " + promessaData.dataPromessa + (promessaData.horarioPromessa ? " às " + promessaData.horarioPromessa : ""));
      setModalPromessaAberto(false);
      setPromessaData({ dataPromessa: "", horarioPromessa: "", valor: "", observacoes: "" });
      // Redirecionar para a aba de Promessas de Pagamento
      setTimeout(() => navigate("/promessas"), 300);
    },
    onError: (e) => toast.error("Erro ao registrar promessa: " + e.message),
  });
  async function handleSalvarPromessa() {
    if (!promessaData.dataPromessa) { toast.error("Informe a data da promessa"); return; }
    if (!agSelecionado) return;
    setSalvandoPromessa(true);
    try {
      await createPromessaMutation.mutateAsync({
        clienteNome: agSelecionado.clienteNome,
        clienteTelefone: agSelecionado.clienteTelefone || undefined,
        clienteCpfCnpj: agSelecionado.clienteCpfCnpj || undefined,
        dataPromessa: promessaData.dataPromessa,
        horarioPromessa: promessaData.horarioPromessa || undefined,
        valor: promessaData.valor ? parseFloat(promessaData.valor) : undefined,
        observacoes: promessaData.observacoes || undefined,
        consultorId: consultor?.id,
        agendamentoId: agSelecionado.id,
      });
    } finally {
      setSalvandoPromessa(false);
    }
  }

  // Métricas
  const totalColetado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0) || 0;
  const totalFaturado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0) || 0;
  // comissaoTotal: soma de (coletado - custoServico) × 10% por venda
  // Isso representa a comissão bruta já descontando os custos de serviços
  const comissaoTotal = vendas?.reduce((s, v) => {
    const coletado = parseFloat(String(v.valorColetado || 0));
    const custo = parseFloat(String(v.custoServico || 0));
    const pct = parseFloat(String(v.comissaoPercent || 10));
    return s + ((coletado - custo) * pct / 100);
  }, 0) || 0;

  const qtdLimpaName = useMemo(() => {
    return vendas?.reduce((s, v) => {
      const servs = v.servicos as string[] | null;
      return s + (servs?.filter(x => x.toLowerCase().includes("limpa")).length || 0);
    }, 0) || 0;
  }, [vendas]);
  const qtdRating = useMemo(() => {
    return vendas?.reduce((s, v) => {
      const servs = v.servicos as string[] | null;
      return s + (servs?.filter(x => x.toLowerCase().includes("rating")).length || 0);
    }, 0) || 0;
  }, [vendas]);

  const custoLimpaName = custosServicos?.custo_limpa_nome ?? 70;
  const custoRating = custosServicos?.custo_rating ?? 110;

  const realizadas = agendamentos?.filter(a => a.status === "realizado").length || 0;
  const noshow = agendamentos?.filter(a => a.status === "noshow").length || 0;
  const totalAg = agendamentos?.length || 0;
  const taxaFechamento = realizadas > 0 ? Math.round((vendas?.length || 0) / realizadas * 100) : 0;
  const taxaComparecimento = totalAg > 0 ? Math.round((realizadas / totalAg) * 100) : 0;
  const metaValor = metaConfig?.valor ? parseFloat(String(metaConfig.valor)) : 0;
  const metaPercent = metaValor > 0 ? Math.min(100, Math.round((totalColetado / metaValor) * 100)) : 0;

  const parcelasFiltradas = useMemo(() => {
    if (!parcelasCompletas) return [];
    return parcelasCompletas.filter(p => {
      if (filtroParcelas === "pagas") return p.status === "pago";
      if (filtroParcelas === "pendentes") return p.status === "pendente" && diasAtraso(p.vencimento) <= 0;
      if (filtroParcelas === "atrasadas") return p.status === "pendente" && diasAtraso(p.vencimento) > 0;
      return true;
    });
  }, [parcelasCompletas, filtroParcelas]);

  const devedores = useMemo(() => {
    if (!parcelasCompletas) return [];
    const atrasadas = parcelasCompletas.filter(p => p.status === "pendente" && diasAtraso(p.vencimento) > 0);
    const map = new Map<string, { nome: string; cpf: string | null; telefone: string | null; parcelas: typeof atrasadas; totalDevido: number; maxAtraso: number }>();
    for (const p of atrasadas) {
      const key = p.clienteNome;
      if (!map.has(key)) {
        map.set(key, { nome: p.clienteNome, cpf: p.clienteCpfCnpj ?? null, telefone: p.clienteTelefone ?? null, parcelas: [], totalDevido: 0, maxAtraso: 0 });
      }
      const entry = map.get(key)!;
      entry.parcelas.push(p);
      entry.totalDevido += parseFloat(String(p.valor || 0));
      entry.maxAtraso = Math.max(entry.maxAtraso, diasAtraso(p.vencimento));
    }
    return Array.from(map.values()).sort((a, b) => b.maxAtraso - a.maxAtraso);
  }, [parcelasCompletas]);

  const qtdDevedores = devedores.length;
  const qtdVencendoHoje = parcelasVencendo?.filter(p => p.consultorId === consultor?.id).length || 0;
  const qtdPromessasHoje = promessasHoje?.length || 0;

  // Alarme em tempo real para promessas no horário
  const { alarmeAtivo, dispensarAlarme, dispensarTodos } = usePromessaAlarm(promessasHoje);

  const diasNoMes = getDiasNoMes(ano, mes);
  const primeiroDia = getPrimeiroDiaSemana(ano, mes);
  const agsPorDia: Record<number, Agendamento[]> = {};
  agendamentos?.forEach(ag => {
    const d = new Date(ag.dataHora).getDate();
    if (!agsPorDia[d]) agsPorDia[d] = [];
    agsPorDia[d].push(ag as Agendamento);
  });

  function abrirModal(ag: Agendamento) {
    setAgSelecionado(ag);
    setVenda({
      status: ag.status,
      valorColetado: ag.valorColetado ? String(parseFloat(String(ag.valorColetado))) : "",
      valorFaturado: ag.valorFaturado ? String(parseFloat(String(ag.valorFaturado))) : "",
      parcelasQtd: ag.parcelasQtd || 0,
      datesVencimento: [],
      servicos: ag.servicos || [],
      formaPagamento: ag.formaPagamento || "",
      resultouVenda: ag.resultouVenda || false,
      observacoes: ag.observacoes || "",
      comprovanteUrl: ag.comprovanteUrl || "",
      comprovanteFile: null,
      clienteTelefone: ag.clienteTelefone || "",
      clienteCpfCnpj: ag.clienteCpfCnpj || "",
    });
    setModalAberto(true);
  }

  function handleParcelasChange(qtd: number) {
    const hoje = new Date();
    const dates = Array.from({ length: qtd }, (_, i) => {
      const d = new Date(hoje);
      d.setMonth(d.getMonth() + i + 1);
      return d.toISOString().split("T")[0];
    });
    setVenda(v => ({ ...v, parcelasQtd: qtd, datesVencimento: dates }));
  }

  async function handleUploadComprovante(file: File) {
    setUploadingComprovante(true);
    try {
      // Usar Promise para capturar erros do FileReader corretamente
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadComprovante.mutateAsync({ fileBase64: base64, mimeType: file.type, tipo: "comprovante" });
      setVenda(v => ({ ...v, comprovanteUrl: result.url, comprovanteFile: file }));
      toast.success("Comprovante enviado!");
    } catch (err) {
      console.error("Erro ao enviar comprovante:", err);
      toast.error("Erro ao enviar comprovante. Tente novamente.");
    } finally {
      setUploadingComprovante(false);
    }
  }

  const coletadoModal = parseFloat(venda.valorColetado) || 0;
  const custoModalServicos = venda.servicos.reduce((s, serv) => {
    if (serv.toLowerCase().includes("limpa")) return s + custoLimpaName;
    if (serv.toLowerCase().includes("rating")) return s + custoRating;
    return s;
  }, 0);
  // Comissão líquida = (coletado - custos dos serviços) × 10%
  const comissaoLiquidaModal = (coletadoModal - custoModalServicos) * 0.10;

  async function handleSalvar() {
    if (!agSelecionado) return;
    setSalvando(true);
    try {
      const coletado = parseFloat(venda.valorColetado) || 0;
      const faturado = parseFloat(venda.valorFaturado) || 0;
      // Verificar se já existe venda vinculada a este agendamento (evitar duplicação)
      const jaTemVenda = !!agSelecionado.vendaId;
      let vendaIdFinal = agSelecionado.vendaId ?? null;

      if (venda.resultouVenda && coletado > 0 && consultor) {
        if (!jaTemVenda) {
          // Criar nova venda apenas se ainda não existe
          const vendaResult = await createVenda.mutateAsync({
            clienteNome: agSelecionado.clienteNome,
            clienteCpfCnpj: venda.clienteCpfCnpj || agSelecionado.clienteCpfCnpj || undefined,
            clienteTelefone: venda.clienteTelefone || agSelecionado.clienteTelefone || undefined,
            tipo: "PF",
            consultorId: consultor.id,
            dataVenda: new Date().toISOString(),
            valorFaturado: faturado,
            valorColetado: coletado,
            parcelasRestantes: venda.parcelasQtd,
            servicos: venda.servicos,
            observacoes: venda.observacoes,
            comissaoPercent: 10,
            custoServico: custoModalServicos,
          });
          vendaIdFinal = vendaResult?.vendaId ?? null;
          // Se backend detectou duplicata, avisar e não criar parcelas novamente
          if ((vendaResult as any)?.duplicata) {
            toast.warning("Venda já registrada para este cliente. Vinculando ao registro existente.");
          } else if (vendaIdFinal && venda.parcelasQtd > 0) {
            // Criar parcelas se houver parcelamento (somente em venda nova)
            let datesParaCriar = venda.datesVencimento;
            if (datesParaCriar.length === 0) {
              const hoje = new Date();
              datesParaCriar = Array.from({ length: venda.parcelasQtd }, (_, i) => {
                const d = new Date(hoje);
                d.setMonth(d.getMonth() + i + 1);
                return d.toISOString().split("T")[0];
              });
            }
            const restante = faturado - coletado;
            const valorParcela = restante > 0 ? restante / venda.parcelasQtd : faturado / venda.parcelasQtd;
            if (valorParcela > 0) {
              await createParcelas.mutateAsync({
                vendaId: vendaIdFinal,
                parcelas: datesParaCriar.map(d => ({ valor: valorParcela, vencimento: d })),
              });
            }
          }
        } else {
          // Atualizar venda existente com novos valores
          await updateVendaMutation.mutateAsync({
            id: vendaIdFinal!,
            valorFaturado: faturado,
            valorColetado: coletado,
            servicos: venda.servicos,
            observacoes: venda.observacoes,
            custoServico: custoModalServicos,
          });
        }
      }

      // Salvar agendamento com vendaId para evitar duplicação futura
      await updateAgendamento.mutateAsync({
        id: agSelecionado.id,
        status: venda.status as "confirmado" | "realizado" | "noshow" | "cancelado" | "remarcado",
        valorColetado: coletado,
        valorFaturado: faturado,
        parcelasQtd: venda.parcelasQtd,
        servicos: venda.servicos,
        formaPagamento: venda.formaPagamento,
        resultouVenda: venda.resultouVenda,
        observacoes: venda.observacoes,
        comprovanteUrl: venda.comprovanteUrl || undefined,
        clienteTelefone: venda.clienteTelefone || undefined,
        clienteCpfCnpj: venda.clienteCpfCnpj || undefined,
        vendaId: vendaIdFinal ?? undefined,
      });
      // Atualizar o agendamento selecionado localmente para refletir o vendaId
      setAgSelecionado(prev => prev ? { ...prev, vendaId: vendaIdFinal } : prev);
    } finally {
      setSalvando(false);
    }
  }

  const rankingConsultor = rankingData?.find((r: { consultorId: number }) => r.consultorId === consultor?.id);
  const posicaoRanking = rankingData ? rankingData.findIndex((r: { consultorId: number }) => r.consultorId === consultor?.id) + 1 : 0;

  return (
    <LifeDashboardLayout title="Meu Painel">
      <div className="space-y-6">
        {/* Alarme de Promessa - Overlay pulsante */}
        {alarmeAtivo.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden border-4 border-violet-500">
              <div className="bg-violet-600 px-6 py-4 text-white text-center">
                <div className="text-3xl mb-1">⏰</div>
                <h2 className="text-xl font-bold">Hora de Ligar!</h2>
                <p className="text-violet-200 text-sm">Promessa de fechamento agora</p>
              </div>
              <div className="p-5 space-y-3">
                {alarmeAtivo.map(p => (
                  <div key={p.id} className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                    <p className="font-bold text-gray-900 text-lg">{p.clienteNome}</p>
                    {p.clienteTelefone && (
                      <a href={`tel:${p.clienteTelefone}`} className="flex items-center gap-2 mt-1 text-blue-600 font-bold text-base hover:underline">
                        📞 {p.clienteTelefone}
                      </a>
                    )}
                    {p.valor && (
                      <p className="text-emerald-700 font-semibold text-sm mt-1">
                        Valor estimado: {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(parseFloat(p.valor))}
                      </p>
                    )}
                    {p.observacoes && (
                      <p className="text-gray-500 text-xs mt-1 italic">{p.observacoes}</p>
                    )}
                    <button
                      onClick={() => dispensarAlarme(p.id)}
                      className="mt-3 w-full py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors"
                    >
                      ✔ Entendido, vou ligar!
                    </button>
                  </div>
                ))}
                {alarmeAtivo.length > 1 && (
                  <button onClick={dispensarTodos} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700">
                    Dispensar todos
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meu Painel</h1>
            {consultor && <p className="text-sm text-gray-500">Olá, {consultor.nome} 👋</p>}
          </div>
          <div className="flex items-center gap-2">
            {qtdVencendoHoje > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1">
                <Bell className="w-3 h-3" />
                {qtdVencendoHoje} venc. hoje
              </Badge>
            )}
            {qtdPromessasHoje > 0 && (
              <a href="/promessas">
                <Badge className="bg-violet-100 text-violet-700 border border-violet-200 gap-1 cursor-pointer animate-pulse">
                  <Bell className="w-3 h-3" />
                  {qtdPromessasHoje} promessa{qtdPromessasHoje > 1 ? "s" : ""} hoje!
                </Badge>
              </a>
            )}
            {qtdDevedores > 0 && (
              <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1 cursor-pointer" onClick={() => setAbaPainel("devedores")}>
                <AlertTriangle className="w-3 h-3" />
                {qtdDevedores} devedor{qtdDevedores > 1 ? "es" : ""}
              </Badge>
            )}
            <button onClick={() => { const d = new Date(ano, mes - 2, 1); setMes(d.getMonth() + 1); setAno(d.getFullYear()); }} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm font-semibold text-gray-700 min-w-[130px] text-center">{MESES[mes - 1]} {ano}</span>
            <button onClick={() => { const d = new Date(ano, mes, 1); setMes(d.getMonth() + 1); setAno(d.getFullYear()); }} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {!consultor ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 text-center">
              <p className="text-amber-700 font-medium">Consultora não encontrada para este usuário.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Métricas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl p-4 border" style={{ background: "rgba(0,85,255,0.06)", borderColor: "rgba(0,85,255,0.2)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-4 h-4" style={{ color: "#0055FF" }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0055FF" }}>Coletado</p>
                </div>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalColetado)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{vendas?.length || 0} vendas</p>
              </div>
              <div className="rounded-xl p-4 border" style={{ background: "rgba(0,85,255,0.06)", borderColor: "rgba(0,85,255,0.2)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-4 h-4" style={{ color: "#0055FF" }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0055FF" }}>Faturado</p>
                </div>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalFaturado)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Total contratado</p>
              </div>
              <div className="rounded-xl p-4 border bg-amber-50 border-amber-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Comissão</p>
                </div>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(comissaoTotal)}</p>
                <p className="text-xs text-gray-400 mt-0.5">Sua comissão do mês</p>
              </div>
              <div className="rounded-xl p-4 border bg-emerald-50 border-emerald-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Vendas</p>
                </div>
                <p className="text-xl font-bold text-emerald-700">{vendas?.length || 0}</p>
                <p className="text-xs text-gray-400 mt-0.5">{realizadas} reuniões realizadas</p>
              </div>
            </div>

            {/* Cards de Coletado Parcelas (separado do coletado normal) */}
            {coletadoParcelas && (coletadoParcelas.totalColetado > 0 || coletadoParcelas.parcelas.length > 0) && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
                        <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                      </div>
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-700">Coletado Parcelas — {MESES[mes-1]}</p>
                    </div>
                    <p className="text-2xl font-bold text-teal-800">{formatCurrency(coletadoParcelas.totalColetado)}</p>
                    <p className="text-xs text-teal-600 mt-0.5">{coletadoParcelas.parcelas.length} parcela{coletadoParcelas.parcelas.length !== 1 ? 's' : ''} recebida{coletadoParcelas.parcelas.length !== 1 ? 's' : ''} no mês</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-1">Sua Comissão</p>
                    <p className="text-xl font-bold text-amber-700">{formatCurrency(coletadoParcelas.totalComissao)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">10% sobre parcelas recebidas</p>
                  </div>
                </div>
                {coletadoParcelas.parcelas.length > 0 && (
                  <div className="mt-3 space-y-1.5">
                    {coletadoParcelas.parcelas.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-3 py-1.5 border border-teal-100">
                        <span className="font-medium text-gray-700">{p.clienteNome}</span>
                        <span className="text-gray-400">{p.dataPagamento ? new Date(p.dataPagamento).toLocaleDateString('pt-BR') : '—'}</span>
                        <span className="font-bold text-teal-700">{formatCurrency(parseFloat(String(p.valor || 0)))}</span>
                        <span className="text-amber-600 font-semibold">Com: {formatCurrency(parseFloat(String(p.valor || 0)) * parseFloat(String(p.comissaoPercent || 10)) / 100)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Serviços vendidos */}
            {(qtdLimpaName > 0 || qtdRating > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {qtdLimpaName > 0 && (
                  <div className="rounded-xl p-3 border bg-indigo-50 border-indigo-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-lg">🧹</div>
                      <div>
                        <p className="text-sm font-bold text-indigo-700">{qtdLimpaName}x Limpa Nome</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const clientes = vendas?.filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("limpa"))).map(v => ({
                          "Nome": v.clienteNome,
                          "CPF/CNPJ": v.clienteCpfCnpj || "",
                          "Telefone": v.clienteTelefone || "",
                          "Serviço": "Limpa Nome",
                          "Data Venda": new Date(v.dataVenda).toLocaleDateString("pt-BR"),
                        })) || [];
                        const ws = XLSX.utils.json_to_sheet(clientes);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Limpa Nome");
                        XLSX.writeFile(wb, `limpa-nome-${MESES[mes-1]}-${ano}.xlsx`);
                        toast.success("Excel exportado!");
                      }}
                      className="w-full py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      📅 Exportar Excel
                    </button>
                  </div>
                )}
                {qtdRating > 0 && (
                  <div className="rounded-xl p-3 border bg-violet-50 border-violet-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-lg">⭐</div>
                      <div>
                        <p className="text-sm font-bold text-violet-700">{qtdRating}x Rating Bancário</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const clientes = vendas?.filter(v => (v.servicos as string[] | null)?.some(s => s.toLowerCase().includes("rating"))).map(v => ({
                          "Nome": v.clienteNome,
                          "CPF/CNPJ": v.clienteCpfCnpj || "",
                          "Telefone": v.clienteTelefone || "",
                          "Serviço": "Rating Bancário",
                          "Data Venda": new Date(v.dataVenda).toLocaleDateString("pt-BR"),
                        })) || [];
                        const ws = XLSX.utils.json_to_sheet(clientes);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Rating Bancário");
                        XLSX.writeFile(wb, `rating-bancario-${MESES[mes-1]}-${ano}.xlsx`);
                        toast.success("Excel exportado!");
                      }}
                      className="w-full py-1.5 text-xs font-semibold text-violet-700 bg-violet-100 hover:bg-violet-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                    >
                      📅 Exportar Excel
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Taxas e Meta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-gray-200">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{taxaComparecimento}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Comparec.</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{taxaFechamento}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Fechamento</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{totalAg > 0 ? Math.round((noshow / totalAg) * 100) : 0}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">No-Show</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              {metaValor > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" style={{ color: "#0055FF" }} />
                        <span className="text-sm font-semibold text-gray-700">Meta do Mês</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: metaPercent >= 100 ? "#16a34a" : "#0055FF" }}>{metaPercent}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                      <div className="h-2.5 rounded-full transition-all" style={{ width: `${metaPercent}%`, background: metaPercent >= 100 ? "#16a34a" : "#0055FF" }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{formatCurrency(totalColetado)}</span>
                      <span>{formatCurrency(metaValor)}</span>
                    </div>
                    {metaPercent >= 100 && <p className="text-xs text-emerald-600 font-medium mt-1">Meta atingida!</p>}
                  </CardContent>
                </Card>
              )}
              {posicaoRanking > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "#0055FF" }}>{posicaoRanking}</div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">
                          {posicaoRanking === 1 ? "🥇" : posicaoRanking === 2 ? "🥈" : posicaoRanking === 3 ? "🥉" : "🏅"} {posicaoRanking}º no Ranking
                        </p>
                        <p className="text-xs text-gray-400">{rankingConsultor ? formatCurrency(parseFloat(String(rankingConsultor.valorColetado || 0))) : "—"} coletado</p>
                      </div>
                      <Trophy className="w-5 h-5 ml-auto text-amber-400" />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Projeção de Comissões Futuras - Mês a Mês */}
            {parcelasFuturas && parcelasFuturas.length > 0 && (() => {
              // Agrupar parcelas por mês/ano
              // REGRA: parcelas futuras são SEMPRE a 2ª, 3ª... parcela.
              // O custo do serviço já foi descontado no coletado inicial (1ª parcela/entrada).
              // Portanto, comissão de parcelas futuras = valor × 10% SEMPRE, sem nenhum desconto.
              const grupos: Record<string, { mes: number; ano: number; label: string; valor: number; comissao: number; qtd: number }> = {};
              parcelasFuturas.forEach(p => {
                const d = new Date(p.vencimento);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                if (!grupos[key]) {
                  grupos[key] = { mes: d.getMonth() + 1, ano: d.getFullYear(), label: `${MESES[d.getMonth()]} ${d.getFullYear()}`, valor: 0, comissao: 0, qtd: 0 };
                }
                const valorParcela = parseFloat(String(p.valor || 0));
                const pct = parseFloat(String(p.comissaoPercent || 10)) / 100;
                // Sem desconto de custo: parcelas futuras = valor × 10% direto
                grupos[key].valor += valorParcela;
                grupos[key].comissao += valorParcela * pct;
                grupos[key].qtd += 1;
              });
              const mesesOrdenados = Object.values(grupos).sort((a, b) => a.ano !== b.ano ? a.ano - b.ano : a.mes - b.mes);
              const totalFuturo = mesesOrdenados.reduce((s, m) => s + m.comissao, 0);
              return (
                <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-bold text-blue-800">Projeção de Comissões Futuras</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-blue-500 uppercase tracking-wide">Total projetado</p>
                      <p className="text-base font-bold text-blue-700">{formatCurrency(totalFuturo)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {mesesOrdenados.map(g => {
                      const isAtual = g.mes === mes && g.ano === ano;
                      return (
                        <div key={`${g.mes}-${g.ano}`} className={`rounded-lg p-3 border text-center transition-all ${isAtual ? "bg-blue-600 border-blue-700" : "bg-white border-blue-200 hover:border-blue-400"}`}>
                          <p className={`text-xs font-semibold mb-1 ${isAtual ? "text-blue-100" : "text-gray-500"}`}>{g.label}</p>
                          <p className={`text-sm font-bold ${isAtual ? "text-white" : "text-blue-700"}`}>{formatCurrency(g.comissao)}</p>
                          <p className={`text-[10px] mt-0.5 ${isAtual ? "text-blue-200" : "text-gray-400"}`}>{g.qtd} parcela{g.qtd > 1 ? "s" : ""} · {formatCurrency(g.valor)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-blue-400 mt-2 text-center">* Estimativa com base nas parcelas pendentes agendadas. O mês atual está destacado.</p>
                </div>
              );
            })()}

            {/* Abas */}
            <div className="flex gap-1 border-b border-gray-200">
              {[
                { key: "agenda", label: "Agenda", count: totalAg },
                { key: "parcelas", label: "Parcelas", count: parcelasCompletas?.length || 0 },
                { key: "devedores", label: "Devedores", count: qtdDevedores, alert: qtdDevedores > 0 },
              ].map(aba => (
                <button
                  key={aba.key}
                  onClick={() => setAbaPainel(aba.key as typeof abaPainel)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${abaPainel === aba.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                  style={abaPainel === aba.key ? { borderBottomColor: "#0055FF", color: "#0055FF" } : {}}
                >
                  {aba.label}
                  {aba.count > 0 && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${aba.alert ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{aba.count}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Aba: Agenda */}
            {abaPainel === "agenda" && (
              <>
                <Card className="border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">Calendário — {MESES[mes - 1]} {ano}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-7 gap-0.5 mb-1">
                      {DIAS_SEMANA.map(d => <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
                      {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(dia => {
                        const agsNoDia = agsPorDia[dia] || [];
                        const temAg = agsNoDia.length > 0;
                        const isHoje = dia === now.getDate() && mes === now.getMonth() + 1 && ano === now.getFullYear();
                        return (
                          <div key={dia} onClick={() => temAg && abrirModal(agsNoDia[0])}
                            className={`min-h-[44px] p-1 flex flex-col cursor-pointer transition-all ${temAg ? "hover:ring-2 hover:ring-blue-300" : ""}`}
                            style={{ background: temAg ? "rgba(0,85,255,0.08)" : "transparent", borderRadius: "8px", outline: isHoje ? "2px solid #0055FF" : undefined }}>
                            <span className="text-xs font-medium" style={{ color: isHoje ? "#0055FF" : "#374151", fontWeight: isHoje ? 700 : undefined }}>{dia}</span>
                            {agsNoDia.map(ag => (
                              <div key={ag.id} className="mt-0.5 text-[9px] leading-tight px-0.5 py-0.5 rounded truncate"
                                style={{ background: ag.status === "realizado" ? "#d1fae5" : ag.status === "noshow" ? "#fee2e2" : "rgba(0,85,255,0.15)", color: ag.status === "realizado" ? "#065f46" : ag.status === "noshow" ? "#991b1b" : "#0055FF" }}>
                                {ag.clienteNome.split(" ")[0]}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-400 mt-3 text-center">Clique em um dia com reunião para atualizar o status</p>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-gray-700">Agendamentos — {MESES[mes-1]} {ano}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loadingAg ? (
                      <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                    ) : !agendamentos || agendamentos.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">Nenhum agendamento no período</div>
                    ) : (
                      <div className="space-y-2">
                        {agendamentos.map(ag => {
                          const dataHora = new Date(ag.dataHora);
                          return (
                            <div key={ag.id} onClick={() => abrirModal(ag as Agendamento)}
                              className={`flex items-center justify-between py-2.5 px-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${ag.origem === "publico" ? "border-blue-200 bg-blue-50/30" : "border-gray-100 hover:bg-gray-50"}`}>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-800 truncate">{ag.clienteNome}</p>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  <span className="flex items-center gap-1 text-xs text-gray-500"><CalendarDays className="w-3 h-3" />{dataHora.toLocaleDateString("pt-BR")}</span>
                                  <span className="flex items-center gap-1 text-xs text-gray-500"><Clock className="w-3 h-3" />{dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
                                  {ag.clienteTelefone && <span className="text-xs text-gray-400">{ag.clienteTelefone}</span>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                {ag.resultouVenda && ag.valorColetado && (
                                  <span className="text-xs font-semibold" style={{ color: "#0055FF" }}>{formatCurrency(parseFloat(String(ag.valorColetado)))}</span>
                                )}
                                <Badge className={`text-xs border ${STATUS_COLORS[ag.status] || ""}`}>{STATUS_LABELS[ag.status] || ag.status}</Badge>
                                {ag.origem === "publico" && <Badge className="text-xs text-white border-0" style={{ background: "#0055FF" }}>Online</Badge>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {vendas && vendas.length > 0 && (
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-700">Vendas Registradas — {MESES[mes-1]} {ano}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {vendas.map(v => (
                          <div key={v.id} className="flex items-start justify-between py-2.5 px-3 rounded-lg border border-gray-100 bg-gray-50/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800">{v.clienteNome}</p>
                              <p className="text-xs text-gray-400">{new Date(v.dataVenda).toLocaleDateString("pt-BR")}</p>
                              {v.servicos && (v.servicos as string[]).length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {(v.servicos as string[]).map((s, i) => <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{s}</span>)}
                                </div>
                              )}
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="text-right">
                                <p className="text-sm font-semibold" style={{ color: "#0055FF" }}>{formatCurrency(parseFloat(String(v.valorColetado || 0)))}</p>
                                <p className="text-xs text-gray-400">Fat: {formatCurrency(parseFloat(String(v.valorFaturado || 0)))}</p>
                                <p className="text-xs text-amber-600">Com: {formatCurrency((parseFloat(String(v.valorColetado || 0)) - parseFloat(String(v.custoServico || 0))) * parseFloat(String(v.comissaoPercent || 10)) / 100)}</p>
                                {(() => {
                                  const parcs = (v as any).parcelas || [];
                                  const pendentes = parcs.filter((p: any) => p.status === 'pendente');
                                  const futuro = pendentes.reduce((s: number, p: any) => s + parseFloat(String(p.valor || 0)), 0);
                                  return futuro > 0 ? (
                                    <p className="text-xs text-emerald-600 font-medium">A Rec: {formatCurrency(futuro)} ({pendentes.length}x)</p>
                                  ) : null;
                                })()} 
                              </div>
                              <div className="flex gap-1">
                                <Button variant="outline" size="sm" className="h-7 px-1.5 text-blue-600 border-blue-200 hover:bg-blue-50 flex-shrink-0"
                                  onClick={() => {
                                    const servs = Array.isArray(v.servicos) ? v.servicos : [];
                                    setEditVendaForm({
                                      id: v.id,
                                      clienteNome: v.clienteNome || "",
                                      clienteCpfCnpj: v.clienteCpfCnpj || "",
                                      clienteTelefone: (v as any).clienteTelefone || "",
                                      tipo: v.tipo || "PF",
                                      valorFaturado: String(v.valorFaturado || ""),
                                      valorColetado: String(v.valorColetado || ""),
                                      comissaoPercent: String(v.comissaoPercent || "10"),
                                      dataVenda: new Date(v.dataVenda).toISOString().split("T")[0],
                                      servicos: servs,
                                      custoServico: String(v.custoServico || ""),
                                      observacoes: v.observacoes || "",
                                      formaPagamento: (v as any).formaPagamento || "",
                                      parcelasQtd: 0,
                                      datesVencimento: [],
                                    });
                                    setOpenEditVenda(v);
                                  }}>
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button variant="outline" size="sm" className="h-7 px-1.5 text-orange-600 border-orange-200 hover:bg-orange-50 flex-shrink-0"
                                  onClick={() => { setOpenEstornoConsultor(v); setMotivoEstornoConsultor(""); }}>
                                  <XCircle className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Aba: Parcelas */}
            {abaPainel === "parcelas" && (
              <Card className="border-gray-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">Minhas Parcelas</CardTitle>
                    <div className="flex gap-1">
                      {(["todas", "pendentes", "pagas", "atrasadas"] as const).map(f => (
                        <button key={f} onClick={() => setFiltroParcelas(f)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-all ${filtroParcelas === f ? "text-white border-transparent" : "border-gray-200 text-gray-600"}`}
                          style={filtroParcelas === f ? { background: "#0055FF" } : {}}>
                          {f === "todas" ? "Todas" : f === "pendentes" ? "Pendentes" : f === "pagas" ? "Pagas" : "Atrasadas"}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {parcelasFiltradas.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhuma parcela encontrada</div>
                  ) : (
                    <div className="space-y-2">
                      {parcelasFiltradas.map(p => {
                        const atraso = diasAtraso(p.vencimento);
                        const isAtrasada = p.status === "pendente" && atraso > 0;
                        const isHoje = p.status === "pendente" && atraso === 0;
                        return (
                          <div key={p.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg border ${isAtrasada ? "border-red-200 bg-red-50" : isHoje ? "border-amber-200 bg-amber-50" : p.status === "pago" ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100"}`}>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-800 truncate">{p.clienteNome}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-gray-500">Venc: {new Date(p.vencimento).toLocaleDateString("pt-BR")}</span>
                                {isAtrasada && <span className="text-xs font-medium text-red-600">{atraso}d atrasado</span>}
                                {isHoje && <span className="text-xs font-medium text-amber-600">Vence hoje</span>}
                                {p.status === "pago" && p.dataPagamento && <span className="text-xs text-emerald-600">Pago em {new Date(p.dataPagamento).toLocaleDateString("pt-BR")}</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                              <p className={`text-sm font-semibold ${isAtrasada ? "text-red-700" : p.status === "pago" ? "text-emerald-700" : "text-gray-800"}`}>
                                {formatCurrency(parseFloat(String(p.valor || 0)))}
                              </p>
                              {p.status === "pendente" && (
                                <button
                                  onClick={() => setModalPagamentoParcela({ id: p.id, valor: parseFloat(String(p.valor || 0)), clienteNome: p.clienteNome || "Cliente" })}
                                  className="text-xs px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-700 hover:bg-emerald-100 transition-colors font-medium"
                                >
                                  Recebi
                                </button>
                              )}
                              {p.status === "pago" && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Aba: Devedores */}
            {abaPainel === "devedores" && (
              <Card className="border-red-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Lista de Devedores ({qtdDevedores})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {devedores.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      Nenhum devedor!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {devedores.map((d, i) => (
                        <div key={i} className="p-3 rounded-lg border border-red-200 bg-red-50">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-sm font-bold text-red-800">{d.nome}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {d.cpf && <span className="text-xs text-red-600">CPF: {d.cpf}</span>}
                                {d.telefone && <span className="text-xs text-red-600">{d.telefone}</span>}
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
                                <span>{diasAtraso(p.vencimento)}d atraso</span>
                                <span className="font-semibold">{formatCurrency(parseFloat(String(p.valor || 0)))}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{agSelecionado?.clienteNome}</DialogTitle>
            {agSelecionado && (
              <p className="text-xs text-gray-400">
                {new Date(agSelecionado.dataHora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {agSelecionado.clienteTelefone && ` · ${agSelecionado.clienteTelefone}`}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Status */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-2 block">Status da Reunião</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "confirmado", label: "Confirmado" },
                  { value: "realizado", label: "Realizado" },
                  { value: "noshow", label: "No-Show" },
                  { value: "cancelado", label: "Cancelado" },
                  { value: "remarcado", label: "Remarcado" },
                ].map(s => (
                  <button type="button" key={s.value}
                    onClick={() => setVenda(v => ({ ...v, status: s.value, resultouVenda: s.value === "realizado" ? v.resultouVenda : false }))}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${venda.status === s.value ? "border-transparent text-white font-medium" : "border-gray-200 text-gray-600"}`}
                    style={venda.status === s.value ? { background: "#0055FF" } : {}}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {venda.status === "realizado" && (
              <>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Checkbox id="resultouVenda" checked={venda.resultouVenda} onCheckedChange={(c) => setVenda(v => ({ ...v, resultouVenda: !!c }))} />
                  <Label htmlFor="resultouVenda" className="text-sm cursor-pointer">Resultou em fechamento de venda</Label>
                </div>

                {venda.resultouVenda && (
                  <>
                    {/* Dados do cliente */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">Telefone do Cliente</Label>
                        <Input type="tel" placeholder="(11) 99999-9999" value={venda.clienteTelefone} onChange={e => setVenda(v => ({ ...v, clienteTelefone: e.target.value }))} className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">CPF/CNPJ</Label>
                        <Input type="text" placeholder="000.000.000-00" value={venda.clienteCpfCnpj} onChange={e => setVenda(v => ({ ...v, clienteCpfCnpj: e.target.value }))} className="text-sm" />
                      </div>
                    </div>

                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">Coletado à Vista (R$)</Label>
                        <Input type="number" step="0.01" placeholder="500.00" value={venda.valorColetado} onChange={e => setVenda(v => ({ ...v, valorColetado: e.target.value }))} className="text-sm" />
                        <p className="text-[10px] text-gray-400 mt-0.5">Recebido agora</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">Faturado Total (R$)</Label>
                        <Input type="number" step="0.01" placeholder="1500.00" value={venda.valorFaturado} onChange={e => setVenda(v => ({ ...v, valorFaturado: e.target.value }))} className="text-sm" />
                        <p className="text-[10px] text-gray-400 mt-0.5">Total do contrato</p>
                      </div>
                    </div>

                    {/* Cálculo de comissão em tempo real */}
                    {coletadoModal > 0 && (
                      <div className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                        <p className="text-xs font-semibold text-amber-700 mb-2">Cálculo de Comissão</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-gray-600">
                            <span>Base de cálculo</span>
                            <span className="font-medium">{formatCurrency(coletadoModal - custoModalServicos)}</span>
                          </div>
                          <div className={`flex justify-between font-bold border-t border-amber-200 pt-1 ${comissaoLiquidaModal >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                            <span>Comissão líquida (10%)</span>
                            <span>{formatCurrency(comissaoLiquidaModal)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Parcelas */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-1 block">Parcelas do Restante</Label>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Select value={String(venda.parcelasQtd)} onValueChange={v => handleParcelasChange(parseInt(v))}>
                          <SelectTrigger className="w-40 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">À vista</SelectItem>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => <SelectItem key={n} value={String(n)}>{n}x</SelectItem>)}
                          </SelectContent>
                        </Select>
                        {venda.parcelasQtd > 0 && (
                          <div className="flex items-center gap-2">
                            <Label className="text-xs text-gray-500">Data 1ª parcela:</Label>
                            <Input type="date" className="text-xs h-7 w-36"
                              value={venda.datesVencimento[0] || ""}
                              onChange={e => {
                                const base = new Date(e.target.value + "T12:00:00");
                                const dates = Array.from({ length: venda.parcelasQtd }, (_, i) => {
                                  const d = new Date(base);
                                  d.setMonth(d.getMonth() + i);
                                  return d.toISOString().split("T")[0];
                                });
                                setVenda(v => ({ ...v, datesVencimento: dates }));
                              }}
                            />
                          </div>
                        )}
                      </div>
                      {venda.parcelasQtd > 0 && venda.datesVencimento.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-500">Datas de vencimento:</p>
                          {venda.datesVencimento.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">Parcela {i+1}</span>
                              <Input type="date" value={d} onChange={e => { const nd = [...venda.datesVencimento]; nd[i] = e.target.value; setVenda(v => ({ ...v, datesVencimento: nd })); }} className="text-xs h-7 flex-1" />
                              {venda.valorFaturado && venda.valorColetado && (
                                <span className="text-xs text-gray-400 w-24 text-right">{formatCurrency((parseFloat(venda.valorFaturado) - parseFloat(venda.valorColetado || "0")) / venda.parcelasQtd)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Serviços */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-2 block">Serviços Contratados</Label>
                      <div className="flex flex-wrap gap-2">
                        {SERVICOS_OPCOES.map(s => (
                          <button type="button" key={s}
                            onClick={() => setVenda(v => ({ ...v, servicos: v.servicos.includes(s) ? v.servicos.filter(x => x !== s) : [...v.servicos, s] }))}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${venda.servicos.includes(s) ? "text-white border-transparent" : "border-gray-200 text-gray-600"}`}
                            style={venda.servicos.includes(s) ? { background: "#0055FF" } : {}}>
                            {s}
                          </button>
                        ))}
                      </div>

                    </div>

                    {/* Forma de Pagamento */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-2 block">Forma de Pagamento</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {FORMAS_PAGAMENTO.map(fp => (
                          <button type="button" key={fp.value} onClick={() => setVenda(v => ({ ...v, formaPagamento: fp.value }))}
                            className={`text-xs px-2 py-2 rounded-lg border transition-all ${venda.formaPagamento === fp.value ? "text-white border-transparent" : "border-gray-200 text-gray-600"}`}
                            style={venda.formaPagamento === fp.value ? { background: "#0055FF" } : {}}>
                            {fp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comprovante */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-2 block">Comprovante</Label>
                      {venda.comprovanteUrl ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs text-emerald-700 flex-1 truncate">Comprovante enviado</span>
                          <button type="button" onClick={() => setVenda(v => ({ ...v, comprovanteUrl: "", comprovanteFile: null }))} className="text-gray-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadComprovante(f); }} />
                          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingComprovante} className="w-full text-xs border-dashed">
                            {uploadingComprovante ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enviando...</> : <><Upload className="w-3.5 h-3.5 mr-1.5" /> Anexar comprovante</>}
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</Label>
              <Textarea placeholder="Notas sobre a reunião..." value={venda.observacoes} onChange={e => setVenda(v => ({ ...v, observacoes: e.target.value }))} className="text-sm resize-none" rows={2} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalAberto(false)}>Cancelar</Button>
              <Button
                variant="outline"
                className="flex-1 border-violet-300 text-violet-700 hover:bg-violet-50"
                onClick={() => {
                  setPromessaData({ dataPromessa: "", horarioPromessa: "", valor: "", observacoes: "" });
                  // Fechar o modal de agendamento primeiro, depois abrir o de promessa
                  // (Radix bloqueia inputs em dialogs sobrepostos)
                  setPendingOpenPromessa(true);
                  setModalAberto(false);
                }}
              >
                📌 Vai Fechar
              </Button>
              <Button className="flex-1 text-white" style={{ background: "#0055FF" }} onClick={handleSalvar} disabled={salvando}>
                {salvando ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando...</> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Vai Fechar - Promessa de Pagamento */}
      <Dialog open={modalPromessaAberto} onOpenChange={setModalPromessaAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-violet-800">
              📌 Registrar Promessa de Fechamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-violet-800">{agSelecionado?.clienteNome}</p>
              {agSelecionado?.clienteTelefone && (
                <p className="text-xs text-violet-600 mt-0.5">📞 {agSelecionado.clienteTelefone}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Data do retorno *</Label>
                <Input
                  type="date"
                  value={promessaData.dataPromessa}
                  onChange={e => setPromessaData(p => ({ ...p, dataPromessa: e.target.value }))}
                  className="text-sm"
                  min={new Date().toISOString().split('T')[0]}
                  placeholder="Selecione a data"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Horário do alarme</Label>
                <Input
                  type="time"
                  value={promessaData.horarioPromessa}
                  onChange={e => setPromessaData(p => ({ ...p, horarioPromessa: e.target.value }))}
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">Valor estimado (R$)</Label>
              <Input
                type="number"
                placeholder="0,00"
                value={promessaData.valor}
                onChange={e => setPromessaData(p => ({ ...p, valor: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</Label>
              <Textarea
                placeholder="O que o cliente disse? Qual o motivo do retorno?"
                value={promessaData.observacoes}
                onChange={e => setPromessaData(p => ({ ...p, observacoes: e.target.value }))}
                className="text-sm resize-none"
                rows={2}
              />
            </div>
            {promessaData.horarioPromessa && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800">
                ⏰ Um alarme tocará em <strong>{promessaData.dataPromessa} às {promessaData.horarioPromessa}</strong> para lembrar de ligar e fechar a venda!
              </div>
            )}
            {!promessaData.dataPromessa && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                ⚠️ Preencha a <strong>data do retorno</strong> para liberar o botão
              </p>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setModalPromessaAberto(false)}>Cancelar</Button>
              <Button
                className="flex-1 text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50"
                onClick={handleSalvarPromessa}
                disabled={salvandoPromessa || !promessaData.dataPromessa}
                title={!promessaData.dataPromessa ? "Preencha a data do retorno para liberar" : ""}
              >
                {salvandoPromessa ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando...</> : "📌 Registrar Promessa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Venda */}
      <ModalEditarVenda
        open={!!openEditVenda}
        onClose={() => setOpenEditVenda(null)}
        venda={editVendaForm}
        showConsultor={false}
        isSaving={updateVendaMutation.isPending}
        onSave={(data) => {
          const custoAuto = data.servicos.includes("Limpa Nome") && data.servicos.includes("Rating Bancário") ? 180
            : data.servicos.includes("Limpa Nome") ? 70
            : data.servicos.includes("Rating Bancário") ? 110 : 0;
          updateVendaMutation.mutate({
            id: data.id,
            clienteNome: data.clienteNome,
            clienteCpfCnpj: data.clienteCpfCnpj || undefined,
            clienteTelefone: data.clienteTelefone || undefined,
            tipo: data.tipo as "PF" | "PJ",
            valorFaturado: parseFloat(data.valorFaturado),
            valorColetado: parseFloat(data.valorColetado || data.valorFaturado),
            comissaoPercent: parseFloat(data.comissaoPercent || "10") || 10,
            dataVenda: data.dataVenda,
            servicos: data.servicos,
            custoServico: data.custoServico ? parseFloat(data.custoServico) : custoAuto,
            observacoes: data.observacoes || undefined,
          });
        }}
      />

      {/* Modal de Estorno de Venda */}
      <Dialog open={!!openEstornoConsultor} onOpenChange={(o) => { if (!o) { setOpenEstornoConsultor(null); setMotivoEstornoConsultor(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="w-5 h-5" /> Cancelar Venda / Estorno
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm">
              <p className="font-medium text-orange-800">{openEstornoConsultor?.clienteNome}</p>
              <p className="text-orange-600 mt-0.5">
                Coletado: {formatCurrency(parseFloat(String(openEstornoConsultor?.valorColetado || 0)))}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <p className="font-medium mb-1">⚠️ Esta ação irá:</p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Cancelar todas as parcelas pendentes</li>
                <li>Remover esta venda dos seus cálculos de comissão e ranking</li>
                <li>Mover o cliente para a coluna "Estorno" no Pipeline</li>
              </ul>
            </div>
            <div>
              <Label>Motivo do Cancelamento *</Label>
              <Input
                placeholder="Ex: Pedido de estorno pelo cliente, desistência..."
                value={motivoEstornoConsultor}
                onChange={e => setMotivoEstornoConsultor(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => { setOpenEstornoConsultor(null); setMotivoEstornoConsultor(""); }} className="flex-1">Voltar</Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                disabled={!motivoEstornoConsultor.trim() || cancelarVendaMutation.isPending}
                onClick={() => cancelarVendaMutation.mutate({ id: openEstornoConsultor.id, motivo: motivoEstornoConsultor.trim() })}
              >
                {cancelarVendaMutation.isPending ? "Cancelando..." : "Confirmar Estorno"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento de Parcela */}
      <Dialog open={!!modalPagamentoParcela} onOpenChange={(o) => { if (!o) { setModalPagamentoParcela(null); setPagParcelaForm({ formaPagamento: "", comprovanteUrl: "", comprovanteFile: null }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="w-5 h-5" />
              Confirmar Recebimento de Parcela
            </DialogTitle>
          </DialogHeader>
          {modalPagamentoParcela && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-800">{modalPagamentoParcela.clienteNome}</p>
                <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(modalPagamentoParcela.valor)}</p>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-2 block">Forma de Pagamento *</Label>
                <div className="grid grid-cols-3 gap-2">
                  {FORMAS_PAGAMENTO.map(fp => (
                    <button key={fp.value} onClick={() => setPagParcelaForm(f => ({ ...f, formaPagamento: fp.value }))}
                      className={`text-xs px-2 py-2 rounded-lg border transition-all ${
                        pagParcelaForm.formaPagamento === fp.value
                          ? "bg-emerald-600 text-white border-transparent"
                          : "border-gray-200 text-gray-600 hover:border-emerald-300"
                      }`}>
                      {fp.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-2 block">Comprovante (opcional)</Label>
                {pagParcelaForm.comprovanteUrl ? (
                  <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs text-emerald-700 flex-1 truncate">{pagParcelaForm.comprovanteFile?.name || "Comprovante carregado"}</span>
                    <button onClick={() => setPagParcelaForm(f => ({ ...f, comprovanteUrl: "", comprovanteFile: null }))} className="text-gray-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-lg cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 transition-colors">
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">{uploadingParcela ? "Enviando..." : "Clique para anexar comprovante"}</span>
                    <input type="file" className="hidden" accept="image/*,application/pdf" disabled={uploadingParcela}
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadComprovanteParcela(f); }} />
                  </label>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => { setModalPagamentoParcela(null); setPagParcelaForm({ formaPagamento: "", comprovanteUrl: "", comprovanteFile: null }); }}>Cancelar</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleConfirmarPagamentoParcela} disabled={okConsultorMutation.isPending || !pagParcelaForm.formaPagamento}>
                  {okConsultorMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Recebimento"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </LifeDashboardLayout>
  );
}
