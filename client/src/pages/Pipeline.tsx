import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Trash2, Edit2, User, Phone, DollarSign, Check, X, Settings2, GripVertical, Kanban } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const CORES = ["#0055FF","#16a34a","#dc2626","#d97706","#7c3aed","#0891b2","#db2777","#65a30d","#9333ea","#ea580c"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Card Arrastável ──────────────────────────────────────────────────────────
function LeadCard({ lead, consultores, colunas, onDelete, onMove }: {
  lead: any;
  consultores: any[];
  colunas: any[];
  onDelete: (id: number) => void;
  onMove: (leadId: number, colunaId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `lead-${lead.id}`,
    data: { type: "lead", lead },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const consultor = consultores?.find((c: any) => c.id === lead.consultorId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 hover:shadow-md transition-shadow group cursor-default"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 flex-shrink-0 touch-none"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </button>
          <p className="text-sm font-medium text-gray-800 truncate">{lead.nome}</p>
        </div>
        <Button
          variant="ghost" size="sm"
          className="h-5 w-5 p-0 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={() => onDelete(lead.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {lead.telefone && (
        <div className="flex items-center gap-1 mt-1.5">
          <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500">{lead.telefone}</p>
        </div>
      )}
      {consultor && (
        <div className="flex items-center gap-1 mt-0.5">
          <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
          <p className="text-xs text-gray-500">{consultor.nome}</p>
        </div>
      )}
      {lead.valor && parseFloat(String(lead.valor)) > 0 && (
        <div className="flex items-center gap-1 mt-0.5">
          <DollarSign className="w-3 h-3 text-blue-500 flex-shrink-0" />
          <p className="text-xs text-blue-600 font-medium">{formatCurrency(parseFloat(String(lead.valor)))}</p>
        </div>
      )}
      {lead.observacoes && (
        <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{lead.observacoes}</p>
      )}

      {/* Mover para coluna via select */}
      {colunas.length > 1 && (
        <div className="mt-2 pt-2 border-t border-gray-100">
          <Select onValueChange={v => onMove(lead.id, parseInt(v))}>
            <SelectTrigger className="h-6 text-xs border-gray-200 bg-gray-50">
              <SelectValue placeholder="Mover para..." />
            </SelectTrigger>
            <SelectContent>
              {colunas.filter((c: any) => c.id !== lead.colunaId).map((c: any) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs">{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ─── Coluna Kanban ────────────────────────────────────────────────────────────
function KanbanColuna({ coluna, leads, consultores, colunas, onAddLead, onDeleteLead, onMoveLead, onRenameColuna, onDeleteColuna, isVendaRealizada }: {
  coluna: any;
  leads: any[];
  consultores: any[];
  colunas: any[];
  onAddLead: (colunaId: number) => void;
  onDeleteLead: (id: number) => void;
  onMoveLead: (leadId: number, colunaId: number) => void;
  onRenameColuna: (id: number, nome: string, cor: string) => void;
  onDeleteColuna: (id: number, nome: string) => void;
  isVendaRealizada: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [novoNome, setNovoNome] = useState(coluna.nome);
  const [novaCor, setNovaCor] = useState(coluna.cor || "#0055FF");

  const totalValor = leads.reduce((s, l) => s + parseFloat(String(l.valor || 0)), 0);

  const handleSalvar = () => {
    if (!novoNome.trim()) return;
    onRenameColuna(coluna.id, novoNome.trim(), novaCor);
    setEditando(false);
  };

  return (
    <div className="flex-shrink-0 w-72">
      <div className="rounded-xl bg-gray-50 border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2.5" style={{ borderTop: `3px solid ${coluna.cor || "#0055FF"}` }}>
          {editando ? (
            <div className="space-y-2">
              <Input
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                className="h-7 text-sm"
                autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleSalvar(); if (e.key === "Escape") setEditando(false); }}
              />
              <div className="flex items-center gap-1 flex-wrap">
                {CORES.map(c => (
                  <button
                    key={c}
                    className={`w-5 h-5 rounded-full border-2 transition-transform ${novaCor === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setNovaCor(c)}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="h-6 text-xs flex-1 bg-[#0055FF] hover:bg-[#0044CC]" onClick={handleSalvar}><Check className="w-3 h-3 mr-1" />Salvar</Button>
                <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditando(false)}><X className="w-3 h-3" /></Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-700">{coluna.nome}</p>
                  {isVendaRealizada && <Badge className="text-[10px] px-1 py-0 bg-green-100 text-green-700 border-green-200">Fixa</Badge>}
                </div>
                <p className="text-xs text-gray-500">{leads.length} lead(s) · {formatCurrency(totalValor)}</p>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-blue-600"
                  onClick={() => { setNovoNome(coluna.nome); setNovaCor(coluna.cor || "#0055FF"); setEditando(true); }}>
                  <Edit2 className="w-3 h-3" />
                </Button>
                {!isVendaRealizada && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                    onClick={() => onDeleteColuna(coluna.id, coluna.nome)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Cards */}
        <div className="p-2 space-y-2 min-h-[120px]">
          <SortableContext items={leads.map(l => `lead-${l.id}`)} strategy={verticalListSortingStrategy}>
            {leads.map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                consultores={consultores}
                colunas={colunas}
                onDelete={onDeleteLead}
                onMove={onMoveLead}
              />
            ))}
          </SortableContext>
          {leads.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-xs border-2 border-dashed border-gray-200 rounded-lg">
              Arraste um lead aqui
            </div>
          )}
        </div>

        {/* Botão add lead */}
        <div className="px-2 pb-2">
          <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50"
            onClick={() => onAddLead(coluna.id)}>
            <Plus className="w-3 h-3 mr-1" /> Adicionar lead
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Pipeline() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [filtroConsultor, setFiltroConsultor] = useState<string>("todos");

  const [openLead, setOpenLead] = useState(false);
  const [openColuna, setOpenColuna] = useState(false);
  const [selectedColuna, setSelectedColuna] = useState<number | null>(null);
  const [leadForm, setLeadForm] = useState({ nome: "", telefone: "", email: "", valor: "", consultorId: "", observacoes: "" });
  const [colunaForm, setColunaForm] = useState({ nome: "", cor: "#0055FF" });

  const [activeLead, setActiveLead] = useState<any>(null);
  const [overColunaId, setOverColunaId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: colunas, refetch: refetchColunas } = trpc.pipeline.getColunas.useQuery();
  const { data: leads, refetch: refetchLeads } = trpc.pipeline.getLeads.useQuery({ mes, ano });
  const { data: consultores } = trpc.consultores.list.useQuery();

  const createLeadMutation = trpc.pipeline.createLead.useMutation({
    onSuccess: () => {
      toast.success("Lead adicionado!");
      setOpenLead(false);
      setLeadForm({ nome: "", telefone: "", email: "", valor: "", consultorId: "", observacoes: "" });
      refetchLeads();
    },
    onError: (e) => toast.error(e.message),
  });
  const moverLeadMutation = trpc.pipeline.moverLead.useMutation({
    onSuccess: () => refetchLeads(),
    onError: (e) => toast.error(e.message),
  });
  const deleteLeadMutation = trpc.pipeline.deleteLead.useMutation({
    onSuccess: () => { toast.success("Lead removido!"); refetchLeads(); },
    onError: (e) => toast.error(e.message),
  });
  const createColunaMutation = trpc.pipeline.createColuna.useMutation({
    onSuccess: () => {
      toast.success("Coluna criada!");
      setOpenColuna(false);
      setColunaForm({ nome: "", cor: "#0055FF" });
      refetchColunas();
    },
    onError: (e) => toast.error(e.message),
  });
  const updateColunaMutation = trpc.pipeline.updateColuna.useMutation({
    onSuccess: () => { toast.success("Coluna atualizada!"); refetchColunas(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteColunaMutation = trpc.pipeline.deleteColuna.useMutation({
    onSuccess: () => { toast.success("Coluna removida!"); refetchColunas(); refetchLeads(); },
    onError: (e) => toast.error(e.message),
  });

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "lead") {
      setActiveLead(event.active.data.current.lead);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) { setOverColunaId(null); return; }
    const overId = String(over.id);
    if (overId.startsWith("coluna-")) {
      setOverColunaId(parseInt(overId.replace("coluna-", "")));
    } else if (overId.startsWith("lead-")) {
      const leadId = parseInt(overId.replace("lead-", ""));
      const lead = leads?.find(l => l.id === leadId);
      if (lead) setOverColunaId(lead.colunaId);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    const draggedLead = activeLead;
    setActiveLead(null);
    setOverColunaId(null);
    if (!over || !draggedLead) return;

    const overId = String(over.id);
    let novaColunaId: number | null = null;

    if (overId.startsWith("coluna-")) {
      novaColunaId = parseInt(overId.replace("coluna-", ""));
    } else if (overId.startsWith("lead-")) {
      const leadId = parseInt(overId.replace("lead-", ""));
      const lead = leads?.find(l => l.id === leadId);
      if (lead) novaColunaId = lead.colunaId;
    }

    if (novaColunaId && novaColunaId !== draggedLead.colunaId) {
      moverLeadMutation.mutate({ id: draggedLead.id, colunaId: novaColunaId });
    }
  };

  const handleAddLead = (colunaId: number) => {
    setSelectedColuna(colunaId);
    setOpenLead(true);
  };

  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.nome || !selectedColuna) { toast.error("Preencha o nome"); return; }
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

  // Filtro de leads
  const leadsVisiveis = leads?.filter(l => {
    if (filtroConsultor === "todos") return true;
    return String(l.consultorId) === filtroConsultor;
  }) || [];

  const leadsByColuna = (colunaId: number) => leadsVisiveis.filter(l => l.colunaId === colunaId);
  const isVendaRealizada = (coluna: any) => coluna.nome.toLowerCase().includes("venda realizada");

  return (
    <LifeDashboardLayout title="Pipeline">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pipeline de Vendas</h1>
            <p className="text-sm text-gray-500">{leadsVisiveis.length} lead(s) no período</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filtro por consultor (admin) */}
            {user?.role === "admin" && consultores && consultores.length > 0 && (
              <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
                <SelectTrigger className="h-8 text-sm w-44">
                  <SelectValue placeholder="Todos os consultores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os consultores</SelectItem>
                  {consultores.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Navegação de mês */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => { if (mes === 1) { setMes(12); setAno(a => a - 1); } else setMes(m => m - 1); }}>
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <span className="text-xs font-medium text-gray-700 w-28 text-center">{MESES[mes - 1]} {ano}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
                onClick={() => { if (mes === 12) { setMes(1); setAno(a => a + 1); } else setMes(m => m + 1); }}>
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Nova Coluna — disponível para todos */}
            <Button size="sm" className="h-8 gap-1.5 bg-[#0055FF] hover:bg-[#0044CC] text-white"
              onClick={() => setOpenColuna(true)}>
              <Settings2 className="w-3.5 h-3.5" /> Nova Coluna
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        {!colunas || colunas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Kanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg font-medium">Nenhuma coluna criada</p>
            <p className="text-sm mt-1">Clique em "Nova Coluna" para começar</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
              {colunas.map((coluna: any) => (
                <div
                  key={coluna.id}
                  id={`coluna-${coluna.id}`}
                  className={`transition-all ${overColunaId === coluna.id ? "ring-2 ring-blue-400 ring-offset-1 rounded-xl" : ""}`}
                >
                  <KanbanColuna
                    coluna={coluna}
                    leads={leadsByColuna(coluna.id)}
                    consultores={consultores || []}
                    colunas={colunas}
                    onAddLead={handleAddLead}
                    onDeleteLead={(id) => { if (confirm("Remover este lead?")) deleteLeadMutation.mutate({ id }); }}
                    onMoveLead={(leadId, colunaId) => moverLeadMutation.mutate({ id: leadId, colunaId })}
                    onRenameColuna={(id, nome, cor) => updateColunaMutation.mutate({ id, nome, cor })}
                    onDeleteColuna={(id, nome) => { if (confirm(`Remover a coluna "${nome}"? Todos os leads serão excluídos.`)) deleteColunaMutation.mutate({ id }); }}
                    isVendaRealizada={isVendaRealizada(coluna)}
                  />
                </div>
              ))}
            </div>

            <DragOverlay>
              {activeLead && (
                <div className="bg-white rounded-lg p-3 shadow-xl border-2 border-blue-400 w-64 rotate-2">
                  <p className="text-sm font-medium text-gray-800">{activeLead.nome}</p>
                  {activeLead.valor && parseFloat(String(activeLead.valor)) > 0 && (
                    <p className="text-xs text-blue-600 font-medium mt-1">{formatCurrency(parseFloat(String(activeLead.valor)))}</p>
                  )}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* Modal: Novo Lead */}
      <Dialog open={openLead} onOpenChange={setOpenLead}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateLead} className="space-y-3">
            <div>
              <Label>Coluna</Label>
              <Select value={selectedColuna ? String(selectedColuna) : ""} onValueChange={v => setSelectedColuna(parseInt(v))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                <SelectContent>
                  {colunas?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome do cliente *</Label>
              <Input className="mt-1" value={leadForm.nome} onChange={e => setLeadForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Telefone</Label>
                <Input className="mt-1" value={leadForm.telefone} onChange={e => setLeadForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(11) 99999-9999" />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input className="mt-1" type="number" value={leadForm.valor} onChange={e => setLeadForm(f => ({ ...f, valor: e.target.value }))} placeholder="0,00" />
              </div>
            </div>
            <div>
              <Label>Consultor</Label>
              <Select value={leadForm.consultorId} onValueChange={v => setLeadForm(f => ({ ...f, consultorId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar consultor" /></SelectTrigger>
                <SelectContent>
                  {consultores?.map((c: any) => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observações</Label>
              <Input className="mt-1" value={leadForm.observacoes} onChange={e => setLeadForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas sobre o lead..." />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" className="flex-1 bg-[#0055FF] hover:bg-[#0044CC]" disabled={createLeadMutation.isPending}>
                {createLeadMutation.isPending ? "Adicionando..." : "Adicionar Lead"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpenLead(false)}>Cancelar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Nova Coluna */}
      <Dialog open={openColuna} onOpenChange={setOpenColuna}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Coluna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome da coluna *</Label>
              <Input
                className="mt-1"
                value={colunaForm.nome}
                onChange={e => setColunaForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Em negociação, Proposta enviada..."
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && colunaForm.nome.trim()) {
                    createColunaMutation.mutate({ nome: colunaForm.nome.trim(), cor: colunaForm.cor, ordem: (colunas?.length || 0) });
                  }
                }}
              />
            </div>
            <div>
              <Label>Cor da coluna</Label>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {CORES.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${colunaForm.cor === c ? "border-gray-800 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColunaForm(f => ({ ...f, cor: c }))}
                  />
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1 bg-[#0055FF] hover:bg-[#0044CC]"
                disabled={!colunaForm.nome.trim() || createColunaMutation.isPending}
                onClick={() => {
                  if (!colunaForm.nome.trim()) return;
                  createColunaMutation.mutate({ nome: colunaForm.nome.trim(), cor: colunaForm.cor, ordem: (colunas?.length || 0) });
                }}
              >
                {createColunaMutation.isPending ? "Criando..." : "Criar Coluna"}
              </Button>
              <Button variant="outline" onClick={() => setOpenColuna(false)}>Cancelar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </LifeDashboardLayout>
  );
}
