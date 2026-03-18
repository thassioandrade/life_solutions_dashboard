import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, CalendarDays, Clock, User, Phone, CheckCircle, XCircle, AlertCircle, Edit2, Trash2 } from "lucide-react";
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
  const [editForm, setEditForm] = useState<any>({});

  const { data: agendamentos, refetch } = trpc.agendamentos.listByPeriod.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();

  const createMutation = trpc.agendamentos.create.useMutation({
    onSuccess: () => { toast.success("Agendamento criado!"); setOpenCreate(false); setForm({ clienteNome: "", clienteEmail: "", clienteTelefone: "", consultorId: "", dataHora: "", observacoes: "" }); refetch(); },
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clienteNome || !form.dataHora) { toast.error("Preencha os campos obrigatórios"); return; }
    createMutation.mutate({
      ...form,
      consultorId: form.consultorId ? parseInt(form.consultorId) : undefined,
    });
  };

  const handleUpdate = () => {
    if (!openEdit) return;
    updateMutation.mutate({
      id: openEdit.id,
      ...editForm,
      valorColetado: editForm.valorColetado ? parseFloat(editForm.valorColetado) : undefined,
      valorFaturado: editForm.valorFaturado ? parseFloat(editForm.valorFaturado) : undefined,
    });
  };

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
                    <Input type="datetime-local" value={form.dataHora} onChange={e => setForm({ ...form, dataHora: e.target.value })} />
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
                        {ag.resultouVenda && (
                          <div className="mt-1.5 flex items-center gap-2 text-xs text-blue-600">
                            <CheckCircle className="w-3 h-3" />
                            Resultou em venda — {ag.valorColetado ? formatCurrency(parseFloat(String(ag.valorColetado))) : ""}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        <Dialog open={openEdit?.id === ag.id} onOpenChange={(o) => { setOpenEdit(o ? ag : null); setEditForm({ status: ag.status, observacoes: ag.observacoes || "", valorColetado: ag.valorColetado || "", valorFaturado: ag.valorFaturado || "", resultouVenda: ag.resultouVenda || false }); }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Atualizar Agendamento</DialogTitle></DialogHeader>
                            <div className="space-y-3">
                              <div>
                                <Label>Status</Label>
                                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {["confirmado","realizado","noshow","cancelado","remarcado"].map(s => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label>Valor Faturado (R$)</Label>
                                  <Input type="number" step="0.01" value={editForm.valorFaturado} onChange={e => setEditForm({ ...editForm, valorFaturado: e.target.value })} />
                                </div>
                                <div>
                                  <Label>Valor Coletado (R$)</Label>
                                  <Input type="number" step="0.01" value={editForm.valorColetado} onChange={e => setEditForm({ ...editForm, valorColetado: e.target.value })} />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id="resultouVenda" checked={editForm.resultouVenda} onChange={e => setEditForm({ ...editForm, resultouVenda: e.target.checked })} />
                                <Label htmlFor="resultouVenda">Resultou em venda</Label>
                              </div>
                              <div>
                                <Label>Observações</Label>
                                <Input value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} />
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setOpenEdit(null)} className="flex-1">Cancelar</Button>
                                <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleUpdate} disabled={updateMutation.isPending}>Salvar</Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
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
    </LifeDashboardLayout>
  );
}
