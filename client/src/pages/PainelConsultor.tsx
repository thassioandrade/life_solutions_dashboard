import { useState, useRef } from "react";
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
  Clock, User, Upload, X, CheckCircle2, Trophy, Target, Loader2,
  FileText, CreditCard, Banknote
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
  confirmado: "Confirmado", realizado: "✅ Realizado", noshow: "❌ No-Show",
  cancelado: "🚫 Cancelado", remarcado: "🔄 Remarcado",
};

const SERVICOS_OPCOES = ["Limpa Nome", "Rating Bancário", "Planejamento Financeiro", "Consultoria", "Outro"];
const FORMAS_PAGAMENTO = [
  { value: "pix", label: "💚 PIX" },
  { value: "boleto", label: "📄 Boleto" },
  { value: "cartao", label: "💳 Cartão" },
  { value: "transferencia", label: "🏦 Transferência" },
  { value: "dinheiro", label: "💵 Dinheiro" },
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
  });

  // Buscar consultor vinculado ao usuário logado
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
  const { data: parcelasConsultor } = trpc.parcelas.listByConsultor.useQuery(
    { consultorId: consultor?.id || 0 },
    { enabled: !!consultor?.id }
  );
  const { data: metaConfig } = trpc.configuracoes.get.useQuery({ chave: "meta_coletado_mensal" });
  const { data: rankingData } = trpc.rankings.listByPeriod.useQuery(
    { mes, ano },
    { enabled: !!consultor?.id }
  );

  const updateAgendamento = trpc.agendamentos.update.useMutation({
    onSuccess: () => {
      utils.agendamentos.listByConsultor.invalidate();
      utils.vendas.listByConsultor.invalidate();
      toast.success("Agendamento atualizado com sucesso!");
      setModalAberto(false);
    },
    onError: (e) => toast.error("Erro ao salvar: " + e.message),
  });

  const createVenda = trpc.vendas.create.useMutation({
    onSuccess: () => utils.vendas.listByConsultor.invalidate(),
    onError: (e) => toast.error("Erro ao registrar venda: " + e.message),
  });

  const createParcelas = trpc.parcelas.create.useMutation({
    onError: (e) => toast.error("Erro ao criar parcelas: " + e.message),
  });

  const uploadComprovante = trpc.upload.comprovante.useMutation({
    onError: (e) => toast.error("Erro no upload: " + e.message),
  });

  // Métricas
  const totalColetado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0) || 0;
  const totalFaturado = vendas?.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0) || 0;
  const comissaoTotal = vendas?.reduce((s, v) => {
    const coletado = parseFloat(String(v.valorColetado || 0));
    const pct = parseFloat(String(v.comissaoPercent || 10));
    return s + (coletado * pct / 100);
  }, 0) || 0;
  const totalParcelas = parcelasConsultor?.filter(p => p.status === "pago").reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0) || 0;
  const realizadas = agendamentos?.filter(a => a.status === "realizado").length || 0;
  const noshow = agendamentos?.filter(a => a.status === "noshow").length || 0;
  const totalAg = agendamentos?.length || 0;
  const taxaFechamento = realizadas > 0 ? Math.round((vendas?.length || 0) / realizadas * 100) : 0;
  const taxaComparecimento = totalAg > 0 ? Math.round((realizadas / totalAg) * 100) : 0;

  const metaValor = metaConfig?.valor ? parseFloat(String(metaConfig.valor)) : 0;
  const metaPercent = metaValor > 0 ? Math.min(100, Math.round((totalColetado / metaValor) * 100)) : 0;

  // Calendário
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
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const result = await uploadComprovante.mutateAsync({
          fileBase64: base64,
          mimeType: file.type,
          tipo: "comprovante",
        });
        setVenda(v => ({ ...v, comprovanteUrl: result.url, comprovanteFile: file }));
        toast.success("Comprovante enviado!");
        setUploadingComprovante(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingComprovante(false);
    }
  }

  async function handleSalvar() {
    if (!agSelecionado) return;
    setSalvando(true);
    try {
      const coletado = parseFloat(venda.valorColetado) || 0;
      const faturado = parseFloat(venda.valorFaturado) || 0;

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
      });

      // Se resultou em venda, criar registro de venda + parcelas
      if (venda.resultouVenda && coletado > 0 && consultor) {
        const vendaResult = await createVenda.mutateAsync({
          clienteNome: agSelecionado.clienteNome,
          clienteCpfCnpj: agSelecionado.clienteCpfCnpj || undefined,
          tipo: "PF",
          consultorId: consultor.id,
          dataVenda: new Date().toISOString(),
          valorFaturado: faturado,
          valorColetado: coletado,
          parcelasRestantes: venda.parcelasQtd,
          servicos: venda.servicos,
          observacoes: venda.observacoes,
          comissaoPercent: 10,
          custoServico: 0,
        });

        // Criar parcelas se houver
        if (venda.parcelasQtd > 0 && venda.datesVencimento.length > 0 && vendaResult) {
          const valorParcela = (faturado - coletado) / venda.parcelasQtd;
          // Buscar a venda recém-criada para obter o ID
          const vendasAtuais = await utils.vendas.listByConsultor.fetch({
            consultorId: consultor.id,
            mes: new Date().getMonth() + 1,
            ano: new Date().getFullYear(),
          });
          const ultimaVenda = vendasAtuais?.[0];
          if (ultimaVenda && valorParcela > 0) {
            await createParcelas.mutateAsync({
              vendaId: ultimaVenda.id,
              parcelas: venda.datesVencimento.map(d => ({
                valor: valorParcela,
                vencimento: d,
              })),
            });
          }
        }
      }
    } finally {
      setSalvando(false);
    }
  }

  // Ranking do consultor atual
  const rankingConsultor = rankingData?.find((r: { consultorId: number }) => r.consultorId === consultor?.id);
  const posicaoRanking = rankingData ? rankingData.findIndex((r: { consultorId: number }) => r.consultorId === consultor?.id) + 1 : 0;

  return (
    <LifeDashboardLayout title="Meu Painel">
      <div className="space-y-6">
        {/* Header com navegação de mês */}
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
            {/* Métricas principais */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl p-4 border" style={{ background: "rgba(0,85,255,0.06)", borderColor: "rgba(0,85,255,0.2)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <DollarSign className="w-4 h-4" style={{ color: "#0055FF" }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0055FF" }}>Coletado</p>
                </div>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalColetado)}</p>
                {totalParcelas > 0 && <p className="text-xs text-gray-400 mt-0.5">+ {formatCurrency(totalParcelas)} parcelas pagas</p>}
              </div>
              <div className="rounded-xl p-4 border" style={{ background: "rgba(0,85,255,0.06)", borderColor: "rgba(0,85,255,0.2)" }}>
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-4 h-4" style={{ color: "#0055FF" }} />
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#0055FF" }}>Faturado</p>
                </div>
                <p className="text-xl font-bold text-gray-800">{formatCurrency(totalFaturado)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{vendas?.length || 0} vendas</p>
              </div>
              <div className="rounded-xl p-4 border bg-amber-50 border-amber-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <CreditCard className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Comissão</p>
                </div>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(comissaoTotal)}</p>
                <p className="text-xs text-gray-400 mt-0.5">A receber</p>
              </div>
              <div className="rounded-xl p-4 border bg-purple-50 border-purple-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <CalendarDays className="w-4 h-4 text-purple-600" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Reuniões</p>
                </div>
                <p className="text-xl font-bold text-purple-700">{totalAg}</p>
                <p className="text-xs text-gray-400 mt-0.5">{realizadas} realizadas · {noshow} no-show</p>
              </div>
            </div>

            {/* Taxas e Meta */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Taxas */}
              <Card className="border-gray-200">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{taxaComparecimento}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Taxa Comparec.</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{taxaFechamento}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Taxa Fechamento</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{totalAg > 0 ? Math.round((noshow / totalAg) * 100) : 0}%</p>
                      <p className="text-xs text-gray-500 mt-0.5">Taxa No-Show</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Meta do mês */}
              {metaValor > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Target className="w-4 h-4" style={{ color: "#0055FF" }} />
                        <span className="text-sm font-semibold text-gray-700">🎯 Meta do Mês</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: metaPercent >= 100 ? "#16a34a" : "#0055FF" }}>
                        {metaPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5 mb-1">
                      <div
                        className="h-2.5 rounded-full transition-all"
                        style={{ width: `${metaPercent}%`, background: metaPercent >= 100 ? "#16a34a" : "#0055FF" }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>{formatCurrency(totalColetado)}</span>
                      <span>{formatCurrency(metaValor)}</span>
                    </div>
                    {metaPercent >= 100 && (
                      <p className="text-xs text-emerald-600 font-medium mt-1">🎉 Meta atingida!</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Ranking */}
              {posicaoRanking > 0 && (
                <Card className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg" style={{ background: "#0055FF" }}>
                        {posicaoRanking}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span className="text-sm font-semibold text-gray-700">Ranking — {MESES[mes-1]}</span>
                        </div>
                        <p className="text-xs text-gray-400">{posicaoRanking}º lugar · {formatCurrency(totalColetado)} coletado</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Calendário de Reuniões */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" style={{ color: "#0055FF" }} />
                  Calendário de Reuniões — {MESES[mes-1]} {ano}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Header dos dias da semana */}
                <div className="grid grid-cols-7 mb-1">
                  {DIAS_SEMANA.map(d => (
                    <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                {/* Grid do calendário */}
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: primeiroDia }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: diasNoMes }, (_, i) => i + 1).map(dia => {
                    const agsNoDia = agsPorDia[dia] || [];
                    const temAg = agsNoDia.length > 0;
                    const hoje = new Date();
                    const isHoje = hoje.getDate() === dia && hoje.getMonth() + 1 === mes && hoje.getFullYear() === ano;
                    return (
                      <div
                        key={dia}
                        onClick={() => temAg && abrirModal(agsNoDia[0])}
                        className={`relative min-h-[52px] rounded-lg p-1 text-center transition-all ${
                          temAg ? "cursor-pointer hover:shadow-md" : ""
                        } ${isHoje ? "ring-2 ring-offset-1" : ""}`}
                        style={{
                          background: temAg ? "rgba(0,85,255,0.08)" : "transparent",
                          borderRadius: "8px",

                        }}
                      >
                        <span className={`text-xs font-medium ${isHoje ? "font-bold" : "text-gray-600"}`}
                          style={{ color: isHoje ? "#0055FF" : undefined }}>
                          {dia}
                        </span>
                        {agsNoDia.map((ag, idx) => (
                          <div
                            key={ag.id}
                            className="mt-0.5 text-[9px] leading-tight px-0.5 py-0.5 rounded truncate"
                            style={{
                              background: ag.status === "realizado" ? "#d1fae5" :
                                ag.status === "noshow" ? "#fee2e2" :
                                ag.status === "cancelado" ? "#f3f4f6" :
                                "rgba(0,85,255,0.15)",
                              color: ag.status === "realizado" ? "#065f46" :
                                ag.status === "noshow" ? "#991b1b" :
                                ag.status === "cancelado" ? "#6b7280" :
                                "#0055FF",
                            }}
                          >
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

            {/* Lista de Agendamentos */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-700">Todos os Agendamentos — {MESES[mes-1]} {ano}</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingAg ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                ) : !agendamentos || agendamentos.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">Nenhum agendamento no período</div>
                ) : (
                  <div className="space-y-2">
                    {agendamentos.map((ag) => {
                      const dataHora = new Date(ag.dataHora);
                      return (
                        <div
                          key={ag.id}
                          onClick={() => abrirModal(ag as Agendamento)}
                          className={`flex items-center justify-between py-2.5 px-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all ${
                            ag.origem === "publico" ? "border-blue-200 bg-blue-50/30" : "border-gray-100 hover:bg-gray-50"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-800 truncate">{ag.clienteNome}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <CalendarDays className="w-3 h-3" />
                                {dataHora.toLocaleDateString("pt-BR")}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                              {ag.clienteTelefone && (
                                <span className="text-xs text-gray-400">{ag.clienteTelefone}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                            {ag.resultouVenda && ag.valorColetado && (
                              <span className="text-xs font-semibold" style={{ color: "#0055FF" }}>
                                {formatCurrency(parseFloat(String(ag.valorColetado)))}
                              </span>
                            )}
                            <Badge className={`text-xs border ${STATUS_COLORS[ag.status] || ""}`}>
                              {STATUS_LABELS[ag.status] || ag.status}
                            </Badge>
                            {ag.origem === "publico" && (
                              <Badge className="text-xs text-white border-0" style={{ background: "#0055FF" }}>🌐</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vendas do mês */}
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
                          {v.servicos && v.servicos.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {(v.servicos as string[]).map((s, i) => (
                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold" style={{ color: "#0055FF" }}>{formatCurrency(parseFloat(String(v.valorColetado || 0)))}</p>
                          <p className="text-xs text-gray-400">Faturado: {formatCurrency(parseFloat(String(v.valorFaturado || 0)))}</p>
                          <p className="text-xs text-amber-600">Comissão: {formatCurrency(parseFloat(String(v.valorColetado || 0)) * parseFloat(String(v.comissaoPercent || 10)) / 100)}</p>
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

      {/* Modal de Atualização do Agendamento */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {agSelecionado?.clienteNome}
            </DialogTitle>
            {agSelecionado && (
              <p className="text-xs text-gray-400">
                {new Date(agSelecionado.dataHora).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                {agSelecionado.clienteTelefone && ` · ${agSelecionado.clienteTelefone}`}
              </p>
            )}
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Status da Reunião */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-2 block">Status da Reunião *</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "confirmado", label: "Confirmado (aguardando)" },
                  { value: "realizado", label: "✅ Realizado" },
                  { value: "noshow", label: "❌ No-Show (não compareceu)" },
                  { value: "cancelado", label: "🚫 Cancelado" },
                  { value: "remarcado", label: "🔄 Remarcado" },
                ].map(s => (
                  <button
                    key={s.value}
                    onClick={() => setVenda(v => ({ ...v, status: s.value, resultouVenda: s.value === "realizado" ? v.resultouVenda : false }))}
                    className={`text-left text-xs px-3 py-2 rounded-lg border transition-all ${
                      venda.status === s.value
                        ? "border-transparent text-white font-medium"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                    style={venda.status === s.value ? { background: "#0055FF" } : {}}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Campos de venda (apenas se realizado) */}
            {venda.status === "realizado" && (
              <>
                {/* Resultou em venda */}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
                  <Checkbox
                    id="resultouVenda"
                    checked={venda.resultouVenda}
                    onCheckedChange={(c) => setVenda(v => ({ ...v, resultouVenda: !!c }))}
                  />
                  <Label htmlFor="resultouVenda" className="text-sm cursor-pointer">Resultou em fechamento de venda</Label>
                </div>

                {venda.resultouVenda && (
                  <>
                    {/* Valores */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">💵 Coletado à Vista (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 500.00"
                          value={venda.valorColetado}
                          onChange={e => setVenda(v => ({ ...v, valorColetado: e.target.value }))}
                          className="text-sm"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5">Recebido agora, na hora</p>
                      </div>
                      <div>
                        <Label className="text-xs font-semibold text-gray-600 mb-1 block">📊 Faturado Total (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ex: 2500.00"
                          value={venda.valorFaturado}
                          onChange={e => setVenda(v => ({ ...v, valorFaturado: e.target.value }))}
                          className="text-sm"
                        />
                        <p className="text-[10px] text-gray-400 mt-0.5">Total que o cliente vai pagar</p>
                      </div>
                    </div>

                    {/* Parcelas */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-1 block">Restante a receber em parcelas</Label>
                      <div className="flex items-center gap-2 mb-2">
                        <Select
                          value={String(venda.parcelasQtd)}
                          onValueChange={v => handleParcelasChange(parseInt(v))}
                        >
                          <SelectTrigger className="w-40 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">à vista (sem parcelas)</SelectItem>
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                              <SelectItem key={n} value={String(n)}>{n}x</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="text-xs text-gray-400">Quantas vezes?</span>
                      </div>

                      {venda.parcelasQtd > 0 && venda.datesVencimento.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-xs text-gray-500">Datas de vencimento (edite se necessário):</p>
                          {venda.datesVencimento.map((d, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-16">Parcela {i+1}</span>
                              <Input
                                type="date"
                                value={d}
                                onChange={e => {
                                  const newDates = [...venda.datesVencimento];
                                  newDates[i] = e.target.value;
                                  setVenda(v => ({ ...v, datesVencimento: newDates }));
                                }}
                                className="text-xs h-7 flex-1"
                              />
                              {venda.valorFaturado && venda.valorColetado && (
                                <span className="text-xs text-gray-400 w-24 text-right">
                                  {formatCurrency((parseFloat(venda.valorFaturado) - parseFloat(venda.valorColetado || "0")) / venda.parcelasQtd)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Serviços */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-2 block">Serviços Contratados pelo Cliente</Label>
                      <div className="flex flex-wrap gap-2">
                        {SERVICOS_OPCOES.map(s => (
                          <button
                            key={s}
                            onClick={() => setVenda(v => ({
                              ...v,
                              servicos: v.servicos.includes(s)
                                ? v.servicos.filter(x => x !== s)
                                : [...v.servicos, s]
                            }))}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                              venda.servicos.includes(s)
                                ? "text-white border-transparent"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                            style={venda.servicos.includes(s) ? { background: "#0055FF" } : {}}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Forma de Pagamento */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-2 block">💳 Forma de Pagamento</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {FORMAS_PAGAMENTO.map(fp => (
                          <button
                            key={fp.value}
                            onClick={() => setVenda(v => ({ ...v, formaPagamento: fp.value }))}
                            className={`text-xs px-2 py-2 rounded-lg border transition-all ${
                              venda.formaPagamento === fp.value
                                ? "text-white border-transparent"
                                : "border-gray-200 text-gray-600 hover:border-gray-300"
                            }`}
                            style={venda.formaPagamento === fp.value ? { background: "#0055FF" } : {}}
                          >
                            {fp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Comprovante */}
                    <div>
                      <Label className="text-xs font-semibold text-gray-600 mb-2 block">Comprovante de Pagamento</Label>
                      {venda.comprovanteUrl ? (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          <span className="text-xs text-emerald-700 flex-1 truncate">✅ Comprovante enviado</span>
                          <button
                            onClick={() => setVenda(v => ({ ...v, comprovanteUrl: "", comprovanteFile: null }))}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) handleUploadComprovante(file);
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingComprovante}
                            className="w-full text-xs border-dashed"
                          >
                            {uploadingComprovante ? (
                              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Enviando...</>
                            ) : (
                              <><Upload className="w-3.5 h-3.5 mr-1.5" /> Anexar comprovante (imagem ou PDF)</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}

            {/* Observações */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</Label>
              <Textarea
                placeholder="Notas sobre a reunião..."
                value={venda.observacoes}
                onChange={e => setVenda(v => ({ ...v, observacoes: e.target.value }))}
                className="text-sm resize-none"
                rows={2}
              />
            </div>

            {/* Botões */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setModalAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ background: "#0055FF" }}
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando...</> : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LifeDashboardLayout>
  );
}
