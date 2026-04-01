import { useState, useRef } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import ModalEditarVenda, { type VendaEditData } from "@/components/ModalEditarVenda";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, User, Phone, CheckCircle, Edit2, Trash2, Upload, X, Loader2, Paperclip } from "lucide-react";
import { toast } from "sonner";
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
  confirmado: "Confirmado",
  realizado: "Realizado",
  noshow: "No-Show",
  cancelado: "Cancelado",
  remarcado: "Remarcado",
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Agendamentos() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<any | null>(null);
  const [form, setForm] = useState({ clienteNome: "", clienteEmail: "", clienteTelefone: "", consultorId: "", dataHora: "", observacoes: "" });
  const [formData, setFormData] = useState("");
  const [formHora, setFormHora] = useState("");
  const [editForm, setEditForm] = useState<VendaEditData | null>(null);
  const [uploadingComprovante, setUploadingComprovante] = useState(false);

  // Modal Vai Fechar (Promessa)
  const [modalPromessaAberto, setModalPromessaAberto] = useState(false);
  const [agParaPromessa, setAgParaPromessa] = useState<any | null>(null);
  const [promessaData, setPromessaData] = useState({ dataPromessa: "", horarioPromessa: "", valor: "", observacoes: "" });

  const { data: agendamentos, refetch } = trpc.agendamentos.listByPeriod.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();

  const createMutation = trpc.agendamentos.create.useMutation({
    onSuccess: () => { toast.success("Agendamento criado!"); setOpenCreate(false); setForm({ clienteNome: "", clienteEmail: "", clienteTelefone: "", consultorId: "", dataHora: "", observacoes: "" }); setFormData(""); setFormHora(""); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.agendamentos.update.useMutation({
    onSuccess: () => { toast.success("Atualizado!"); setOpenEdit(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.agendamentos.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const uploadComprovanteMut = trpc.upload.comprovante.useMutation({
    onError: (e) => toast.error("Erro ao enviar comprovante: " + e.message),
  });
  const createPromessaMut = trpc.promessas.create.useMutation({
    onSuccess: () => {
      toast.success("Promessa registrada! Lead movido para 'Vai Fechar'.");
      setModalPromessaAberto(false);
      setAgParaPromessa(null);
      setPromessaData({ dataPromessa: "", horarioPromessa: "", valor: "", observacoes: "" });
      // Marcar agendamento como vaiFechar
      if (agParaPromessa) {
        updateMutation.mutate({ id: agParaPromessa.id, vaiFechar: true });
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteNome || !formData || !formHora) { toast.error("Preencha os campos obrigatórios"); return; }
    createMutation.mutate({
      ...form,
      dataHora: `${formData}T${formHora}`,
      consultorId: form.consultorId ? parseInt(form.consultorId) : undefined,
    });
  };

  const handleUpdate = (data: VendaEditData) => {
    if (!openEdit) return;
    const custoAuto = data.servicos.includes("Limpa Nome") && data.servicos.includes("Rating Bancário") ? 180
      : data.servicos.includes("Limpa Nome") ? 70
      : data.servicos.includes("Rating Bancário") ? 110 : 0;
    updateMutation.mutate({
      id: openEdit.id,
      status: (editForm as any)?._status || openEdit.status,
      resultouVenda: (editForm as any)?._resultouVenda,
      vaiFechar: (editForm as any)?._vaiFechar,
      comprovanteUrl: (editForm as any)?._comprovanteUrl,
      clienteTelefone: data.clienteTelefone || undefined,
      valorColetado: data.valorColetado ? parseFloat(data.valorColetado) : undefined,
      valorFaturado: data.valorFaturado ? parseFloat(data.valorFaturado) : undefined,
      servicos: data.servicos,
      formaPagamento: data.formaPagamento || undefined,
      parcelasQtd: data.parcelasQtd || 0,
      observacoes: data.observacoes || undefined,
    });
  };

  async function handleUploadComprovante(file: File) {
    setUploadingComprovante(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await uploadComprovanteMut.mutateAsync({ fileBase64: base64, mimeType: file.type, tipo: "comprovante" });
      setEditForm((f: any) => ({ ...f, comprovanteUrl: result.url }));
      toast.success("Comprovante enviado!");
    } catch (err) {
      console.error("Erro ao enviar comprovante:", err);
      toast.error("Erro ao enviar comprovante. Tente novamente.");
    } finally {
      setUploadingComprovante(false);
    }
  }

  function handleVaiFechar(ag: any) {
    setAgParaPromessa(ag);
    setPromessaData({ dataPromessa: "", horarioPromessa: "", valor: "", observacoes: "" });
    setOpenEdit(null); // fechar modal de edição
    setModalPromessaAberto(true);
  }

  function handleSalvarPromessa() {
    if (!promessaData.dataPromessa) { toast.error("Preencha a data do retorno"); return; }
    if (!agParaPromessa) return;
    createPromessaMut.mutate({
      clienteNome: agParaPromessa.clienteNome,
      clienteTelefone: agParaPromessa.clienteTelefone || undefined,
      dataPromessa: promessaData.dataPromessa,
      horarioPromessa: promessaData.horarioPromessa || undefined,
      valor: promessaData.valor ? parseFloat(promessaData.valor) : undefined,
      observacoes: promessaData.observacoes || undefined,
      consultorId: agParaPromessa.consultorId || undefined,
      agendamentoId: agParaPromessa.id,
    });
  }

  return (
    <LifeDashboardLayout title="Agendamentos">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Agendamentos</h2>
            <p className="text-sm text-gray-500">{agendamentos?.length || 0} agendamento(s) no período</p>
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
            <Dialog open={openCreate} onOpenChange={setOpenCreate}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white ml-2">
                  <Plus className="w-4 h-4 mr-1" /> Novo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <Label>Nome do Cliente *</Label>
                    <Input placeholder="Nome completo" value={form.clienteNome} onChange={e => setForm({ ...form, clienteNome: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Email</Label>
                      <Input type="email" placeholder="email@..." value={form.clienteEmail} onChange={e => setForm({ ...form, clienteEmail: e.target.value })} />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={form.clienteTelefone} onChange={e => setForm({ ...form, clienteTelefone: e.target.value })} />
                    </div>
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
                    <Label>Data e Hora *</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input type="date" value={formData} onChange={e => setFormData(e.target.value)} min={new Date().toISOString().slice(0, 10)} />
                      <Input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Input placeholder="..." value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending}>Criar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {!agendamentos || agendamentos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum agendamento em {MESES[mes-1]} {ano}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {agendamentos.map((ag) => {
              const consultor = consultores?.find(c => c.id === ag.consultorId);
              const dataHora = new Date(ag.dataHora);
              return (
                <Card key={ag.id} className={`hover:shadow-sm transition-shadow ${ag.origem === "publico" ? "border-blue-300 bg-blue-50/30" : "border-gray-200"}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">{ag.clienteNome}</p>
                          <Badge className={`text-xs ${STATUS_COLORS[ag.status] || ""}`}>{STATUS_LABELS[ag.status] || ag.status}</Badge>
                          {ag.origem === "publico" && (
                            <Badge className="text-xs text-white border-0" style={{ background: "#0055FF" }}>🌐 Online</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <CalendarDays className="w-3 h-3" />
                            {dataHora.toLocaleDateString("pt-BR")}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {dataHora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                          {consultor && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <User className="w-3 h-3" />
                              {consultor.nome}
                            </div>
                          )}
                          {ag.clienteTelefone && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Phone className="w-3 h-3" />
                              {ag.clienteTelefone}
                            </div>
                          )}
                        </div>
                        {(ag as any).vaiFechar && !ag.resultouVenda && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-violet-600">
                            <span>🤝</span>
                            Vai fechar
                          </div>
                        )}
                        {ag.resultouVenda && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-blue-600">
                            <CheckCircle className="w-3 h-3" />
                            Resultou em venda — {ag.valorColetado ? formatCurrency(parseFloat(String(ag.valorColetado))) : ""}
                          </div>
                        )}
                        {ag.comprovanteUrl && (
                          <div className="mt-1.5">
                            <a href={ag.comprovanteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                              <Paperclip className="w-3 h-3" /> Ver comprovante
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {/* Botão Vai Fechar */}
                        {!ag.resultouVenda && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs text-violet-700 border-violet-300 hover:bg-violet-50"
                            onClick={() => handleVaiFechar(ag)}
                            title="Vai Fechar"
                          >
                            🤝
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const servs = Array.isArray(ag.servicos) ? ag.servicos : [];
                            setEditForm({
                              id: ag.id,
                              clienteNome: ag.clienteNome || "",
                              clienteCpfCnpj: ag.clienteCpfCnpj || "",
                              clienteTelefone: ag.clienteTelefone || "",
                              tipo: "PF",
                              valorFaturado: String(ag.valorFaturado || ""),
                              valorColetado: String(ag.valorColetado || ""),
                              comissaoPercent: "10",
                              custoServico: "",
                              dataVenda: ag.dataHora ? new Date(ag.dataHora).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
                              servicos: servs,
                              formaPagamento: ag.formaPagamento || "",
                              observacoes: ag.observacoes || "",
                              parcelasQtd: ag.parcelasQtd || 0,
                              datesVencimento: [],
                              // guardar campos especiais do agendamento
                              _status: ag.status,
                              _resultouVenda: ag.resultouVenda || false,
                              _vaiFechar: (ag as any).vaiFechar || false,
                              _comprovanteUrl: ag.comprovanteUrl || "",
                            } as any);
                            setOpenEdit(ag);
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {user?.role === "admin" && (
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => { if (confirm("Remover agendamento?")) deleteMutation.mutate({ id: ag.id }); }}>
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

      {/* Modal Vai Fechar - Promessa de Pagamento */}
      <Dialog open={modalPromessaAberto} onOpenChange={setModalPromessaAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-violet-800">
              📌 Registrar Promessa de Fechamento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {agParaPromessa && (
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <p className="text-sm font-semibold text-violet-800">{agParaPromessa.clienteNome}</p>
                {agParaPromessa.clienteTelefone && (
                  <p className="text-xs text-violet-600 mt-0.5">📞 {agParaPromessa.clienteTelefone}</p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1 block">Data do retorno *</Label>
                <Input
                  type="date"
                  value={promessaData.dataPromessa}
                  onChange={e => setPromessaData(p => ({ ...p, dataPromessa: e.target.value }))}
                  className="text-sm"
                  min={new Date().toISOString().split('T')[0]}
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
            {promessaData.horarioPromessa && promessaData.dataPromessa && (
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
              <Button variant="outline" className="flex-1" onClick={() => { setModalPromessaAberto(false); setAgParaPromessa(null); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 text-white"
                style={{ background: "#7c3aed" }}
                onClick={handleSalvarPromessa}
                disabled={!promessaData.dataPromessa || createPromessaMut.isPending}
              >
                {createPromessaMut.isPending ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Salvando...</> : "Registrar Promessa"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Modal de Edição de Venda */}
      <ModalEditarVenda
        open={!!openEdit}
        onClose={() => setOpenEdit(null)}
        venda={editForm}
        consultores={consultores}
        showConsultor={false}
        isSaving={updateMutation.isPending}
        title="Editar Agendamento"
        onSave={handleUpdate}
      />
    </LifeDashboardLayout>
  );
}
