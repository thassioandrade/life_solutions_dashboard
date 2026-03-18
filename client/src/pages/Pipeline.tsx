import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, Kanban, User, Phone, DollarSign, Trash2, Edit2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Pipeline() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [openLead, setOpenLead] = useState(false);
  const [openColuna, setOpenColuna] = useState(false);
  const [selectedColuna, setSelectedColuna] = useState<number | null>(null);
  const [leadForm, setLeadForm] = useState({ nome: "", telefone: "", email: "", valor: "", consultorId: "", observacoes: "" });
  const [colunaForm, setColunaForm] = useState({ nome: "", cor: "#16a34a" });

  const { data: colunas, refetch: refetchColunas } = trpc.pipeline.getColunas.useQuery();
  const { data: leads, refetch: refetchLeads } = trpc.pipeline.getLeads.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();

  const createLeadMutation = trpc.pipeline.createLead.useMutation({
    onSuccess: () => { toast.success("Lead adicionado!"); setOpenLead(false); setLeadForm({ nome: "", telefone: "", email: "", valor: "", consultorId: "", observacoes: "" }); refetchLeads(); },
    onError: (e) => toast.error(e.message),
  });
  const updateLeadMutation = trpc.pipeline.updateLead.useMutation({
    onSuccess: () => { refetchLeads(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteLeadMutation = trpc.pipeline.deleteLead.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetchLeads(); },
    onError: (e) => toast.error(e.message),
  });
  const createColunaMutation = trpc.pipeline.createColuna.useMutation({
    onSuccess: () => { toast.success("Coluna criada!"); setOpenColuna(false); setColunaForm({ nome: "", cor: "#16a34a" }); refetchColunas(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteColunaMutation = trpc.pipeline.deleteColuna.useMutation({
    onSuccess: () => { toast.success("Coluna removida!"); refetchColunas(); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.nome || !selectedColuna) { toast.error("Preencha o nome e selecione a coluna"); return; }
    createLeadMutation.mutate({
      colunaId: selectedColuna,
      nome: leadForm.nome,
      telefone: leadForm.telefone || undefined,
      email: leadForm.email || undefined,
      valor: leadForm.valor ? parseFloat(leadForm.valor) : undefined,
      consultorId: leadForm.consultorId ? parseInt(leadForm.consultorId) : undefined,
      observacoes: leadForm.observacoes || undefined,
      mes, ano,
    });
  };

  const handleMoveCard = (leadId: number, novaColunaId: number) => {
    updateLeadMutation.mutate({ id: leadId, colunaId: novaColunaId });
    refetchLeads();
  };

  const leadsByColuna = (colunaId: number) => leads?.filter(l => l.colunaId === colunaId) || [];

  return (
    <LifeDashboardLayout title="Pipeline">
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Pipeline de Leads</h2>
            <p className="text-sm text-gray-500">{leads?.length || 0} lead(s) no período</p>
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
            {user?.role === "admin" && (
              <Dialog open={openColuna} onOpenChange={setOpenColuna}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="ml-1">
                    <Plus className="w-4 h-4 mr-1" /> Coluna
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Nova Coluna</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Nome</Label>
                      <Input placeholder="Ex: Qualificado" value={colunaForm.nome} onChange={e => setColunaForm({ ...colunaForm, nome: e.target.value })} />
                    </div>
                    <div>
                      <Label>Cor</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={colunaForm.cor} onChange={e => setColunaForm({ ...colunaForm, cor: e.target.value })} className="w-10 h-10 rounded cursor-pointer border" />
                        <Input value={colunaForm.cor} onChange={e => setColunaForm({ ...colunaForm, cor: e.target.value })} className="flex-1" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setOpenColuna(false)} className="flex-1">Cancelar</Button>
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => createColunaMutation.mutate({ nome: colunaForm.nome, cor: colunaForm.cor })} disabled={!colunaForm.nome}>Criar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={openLead} onOpenChange={setOpenLead}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
                <form onSubmit={handleCreateLead} className="space-y-3">
                  <div>
                    <Label>Coluna *</Label>
                    <Select value={selectedColuna ? String(selectedColuna) : ""} onValueChange={v => setSelectedColuna(parseInt(v))}>
                      <SelectTrigger><SelectValue placeholder="Selecionar coluna..." /></SelectTrigger>
                      <SelectContent>
                        {colunas?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nome *</Label>
                    <Input placeholder="Nome do lead" value={leadForm.nome} onChange={e => setLeadForm({ ...leadForm, nome: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Telefone</Label>
                      <Input placeholder="(00) 00000-0000" value={leadForm.telefone} onChange={e => setLeadForm({ ...leadForm, telefone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Valor (R$)</Label>
                      <Input type="number" step="0.01" placeholder="0,00" value={leadForm.valor} onChange={e => setLeadForm({ ...leadForm, valor: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Consultor</Label>
                    <Select value={leadForm.consultorId} onValueChange={v => setLeadForm({ ...leadForm, consultorId: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                      <SelectContent>
                        {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setOpenLead(false)} className="flex-1">Cancelar</Button>
                    <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createLeadMutation.isPending}>Adicionar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Kanban Board */}
        {!colunas || colunas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Kanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma coluna criada</p>
            <p className="text-sm mt-1">Crie colunas para organizar seu pipeline</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {colunas.map((coluna) => {
              const colunaLeads = leadsByColuna(coluna.id);
              const totalValor = colunaLeads.reduce((s, l) => s + parseFloat(String(l.valor || 0)), 0);
              return (
                <div key={coluna.id} className="flex-shrink-0 w-72">
                  <div className="rounded-xl bg-gray-100 overflow-hidden">
                    {/* Column header */}
                    <div className="px-3 py-2.5 flex items-center justify-between" style={{ borderTop: `3px solid ${coluna.cor || "#16a34a"}` }}>
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{coluna.nome}</p>
                        <p className="text-xs text-gray-500">{colunaLeads.length} lead(s) · {formatCurrency(totalValor)}</p>
                      </div>
                      {user?.role === "admin" && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => { if (confirm(`Remover coluna "${coluna.nome}"?`)) deleteColunaMutation.mutate({ id: coluna.id }); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 min-h-[100px]">
                      {colunaLeads.map((lead) => {
                        const consultor = consultores?.find(c => c.id === lead.consultorId);
                        return (
                          <div key={lead.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group">
                            <div className="flex items-start justify-between">
                              <p className="text-sm font-medium text-gray-800">{lead.nome}</p>
                              <Button
                                variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => { if (confirm("Remover lead?")) deleteLeadMutation.mutate({ id: lead.id }); }}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            {lead.telefone && (
                              <div className="flex items-center gap-1 mt-1">
                                <Phone className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-500">{lead.telefone}</p>
                              </div>
                            )}
                            {consultor && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 text-gray-400" />
                                <p className="text-xs text-gray-500">{consultor.nome}</p>
                              </div>
                            )}
                            {lead.valor && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <DollarSign className="w-3 h-3 text-blue-500" />
                                <p className="text-xs text-blue-600 font-medium">{formatCurrency(parseFloat(String(lead.valor)))}</p>
                              </div>
                            )}
                            {/* Move to other column */}
                            {colunas.length > 1 && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <Select onValueChange={v => handleMoveCard(lead.id, parseInt(v))}>
                                  <SelectTrigger className="h-6 text-xs border-gray-200">
                                    <SelectValue placeholder="Mover para..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {colunas.filter(c => c.id !== coluna.id).map(c => (
                                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.nome}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {colunaLeads.length === 0 && (
                        <div className="text-center py-6 text-gray-400 text-xs">Sem leads</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
