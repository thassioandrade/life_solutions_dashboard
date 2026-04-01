import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Trash2, Edit2, CheckCircle, Clock, AlertTriangle, X } from "lucide-react";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function statusColor(status: string, vencimento: Date | string) {
  if (status === "pago") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento); v.setHours(0, 0, 0, 0);
  if (v < hoje) return "bg-red-100 text-red-700 border-red-200";
  if (v.getTime() === hoje.getTime()) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-gray-100 text-gray-600 border-gray-200";
}

function statusLabel(status: string, vencimento: Date | string) {
  if (status === "pago") return "Pago";
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento); v.setHours(0, 0, 0, 0);
  if (v < hoje) return "Atrasado";
  if (v.getTime() === hoje.getTime()) return "Vence hoje";
  return "Pendente";
}

interface Props {
  vendaId: number;
  clienteNome: string;
  valorFaturado: number;
  valorColetado: number;
  open: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

export default function ModalGerenciarParcelas({ vendaId, clienteNome, valorFaturado, valorColetado, open, onClose, onUpdate }: Props) {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ vencimento: "", valor: "", observacoes: "" });
  const [novasParcelas, setNovasParcelas] = useState<{ vencimento: string; valor: string }[]>([]);
  const [adicionando, setAdicionando] = useState(false);

  const utils = trpc.useUtils();

  const { data: parcelas, refetch } = trpc.parcelas.listByVenda.useQuery(
    { vendaId },
    { enabled: open }
  );

  function invalidar() {
    refetch();
    utils.vendas.listByPeriod.invalidate();
    utils.parcelas.listPendentes.invalidate();
    utils.parcelas.devedores.invalidate();
    utils.dashboard.stats.invalidate();
    onUpdate?.();
  }

  const updateVencimento = trpc.parcelas.updateVencimento.useMutation({
    onSuccess: () => { toast.success("Parcela atualizada!"); setEditandoId(null); invalidar(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteParcela = trpc.parcelas.delete.useMutation({
    onSuccess: () => { toast.success("Parcela removida!"); invalidar(); },
    onError: (e) => toast.error(e.message),
  });

  const markPaid = trpc.parcelas.markPaid.useMutation({
    onSuccess: () => { toast.success("Parcela marcada como paga!"); invalidar(); },
    onError: (e) => toast.error(e.message),
  });

  const createParcelas = trpc.parcelas.create.useMutation({
    onSuccess: () => { toast.success("Parcela(s) adicionada(s)!"); setNovasParcelas([]); setAdicionando(false); invalidar(); },
    onError: (e) => toast.error(e.message),
  });

  function iniciarEdicao(p: any) {
    setEditandoId(p.id);
    setEditForm({
      vencimento: new Date(p.vencimento).toISOString().split("T")[0],
      valor: String(parseFloat(String(p.valor || 0))),
      observacoes: (p as any).observacoes || "",
    });
  }

  function salvarEdicao(id: number) {
    if (!editForm.vencimento) { toast.error("Informe a data de vencimento"); return; }
    updateVencimento.mutate({
      id,
      vencimento: editForm.vencimento,
      valor: editForm.valor ? parseFloat(editForm.valor) : undefined,
      observacoes: editForm.observacoes || undefined,
    });
  }

  function adicionarLinhaNovaParcela() {
    // Calcular próxima data sugerida
    const ultimaData = parcelas && parcelas.length > 0
      ? new Date(parcelas[parcelas.length - 1].vencimento)
      : new Date();
    const proxData = new Date(ultimaData);
    proxData.setMonth(proxData.getMonth() + 1);
    // Calcular valor sugerido: restante / 1
    const totalParcelas = parseFloat(String(parcelas?.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0) || 0));
    const restante = valorFaturado - valorColetado - totalParcelas;
    const valorSugerido = restante > 0 ? restante : 0;
    setNovasParcelas(prev => [...prev, {
      vencimento: proxData.toISOString().split("T")[0],
      valor: String(valorSugerido.toFixed(2)),
    }]);
  }

  function salvarNovasParcelas() {
    const validas = novasParcelas.filter(p => p.vencimento && parseFloat(p.valor) > 0);
    if (validas.length === 0) { toast.error("Preencha ao menos uma parcela com data e valor"); return; }
    const qtdExistentes = parcelas?.length || 0;
    createParcelas.mutate({
      vendaId,
      parcelas: validas.map((p, i) => ({
        valor: parseFloat(p.valor),
        vencimento: p.vencimento,
        numeroParcela: qtdExistentes + i + 1,
      })),
    });
  }

  const totalParcelas = parcelas?.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0) || 0;
  const parcelasPagas = parcelas?.filter(p => p.status === "pago").length || 0;
  const totalPago = parcelas?.filter(p => p.status === "pago").reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0) || 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Parcelas — {clienteNome}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Faturado</p>
            <p className="text-sm font-bold text-blue-700">{formatCurrency(valorFaturado)}</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
            <p className="text-xs text-emerald-600 font-medium">Coletado (à vista)</p>
            <p className="text-sm font-bold text-emerald-700">{formatCurrency(valorColetado)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
            <p className="text-xs text-amber-600 font-medium">Em Parcelas</p>
            <p className="text-sm font-bold text-amber-700">{formatCurrency(totalParcelas)}</p>
            <p className="text-[10px] text-amber-500">{parcelasPagas}/{parcelas?.length || 0} pagas ({formatCurrency(totalPago)})</p>
          </div>
        </div>

        {/* Lista de parcelas */}
        <div className="space-y-2">
          {!parcelas || parcelas.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Nenhuma parcela cadastrada</p>
              <p className="text-xs mt-1">Clique em "Adicionar Parcela" para criar</p>
            </div>
          ) : (
            parcelas.map((p, idx) => (
              <div key={p.id} className={`rounded-lg border p-3 ${p.status === "pago" ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"}`}>
                {editandoId === p.id ? (
                  // Modo edição
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Data de Vencimento</Label>
                        <Input type="date" value={editForm.vencimento} onChange={e => setEditForm({ ...editForm, vencimento: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Valor (R$)</Label>
                        <Input type="number" step="0.01" value={editForm.valor} onChange={e => setEditForm({ ...editForm, valor: e.target.value })} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Observações</Label>
                        <Input value={editForm.observacoes} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} className="h-8 text-sm" placeholder="Opcional..." />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={() => salvarEdicao(p.id)} disabled={updateVencimento.isPending}>Salvar</Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditandoId(null)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  // Modo visualização
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-gray-500 font-medium w-6 shrink-0">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-800">{formatCurrency(parseFloat(String(p.valor || 0)))}</span>
                          <span className="text-xs text-gray-500">Venc: {new Date(p.vencimento).toLocaleDateString("pt-BR")}</span>
                          <Badge className={`text-[10px] border ${statusColor(p.status, p.vencimento)}`}>
                            {statusLabel(p.status, p.vencimento)}
                          </Badge>
                          {p.okConsultor && <span className="text-[10px] text-emerald-600">✓ Confirmado consultora</span>}
                        </div>
                        {(p as any).observacoes && <p className="text-xs text-gray-400 mt-0.5">{(p as any).observacoes}</p>}
                        {p.dataPagamento && <p className="text-xs text-emerald-600 mt-0.5">Pago em: {new Date(p.dataPagamento).toLocaleDateString("pt-BR")}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {p.status !== "pago" && (
                        <>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-blue-600 border-blue-200 hover:bg-blue-50"
                            title="Editar parcela"
                            onClick={() => iniciarEdicao(p)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                          <Button size="sm" className="h-7 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => { if (confirm("Marcar parcela como paga?")) markPaid.mutate({ id: p.id }); }}
                            disabled={markPaid.isPending}>
                            <CheckCircle className="w-3 h-3 mr-1" />Pagar
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-red-600 border-red-200 hover:bg-red-50"
                            title="Remover parcela"
                            onClick={() => { if (confirm("Remover esta parcela?")) deleteParcela.mutate({ id: p.id }); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      {p.status === "pago" && (
                        <span className="text-xs text-emerald-600 flex items-center gap-1 px-2">
                          <CheckCircle className="w-3.5 h-3.5" /> Pago
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Adicionar novas parcelas */}
        {adicionando && (
          <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-2 mt-2">
            <p className="text-xs font-semibold text-blue-700">Nova(s) Parcela(s)</p>
            {novasParcelas.map((np, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                <div>
                  <Label className="text-xs">Data Vencimento</Label>
                  <Input type="date" value={np.vencimento}
                    onChange={e => setNovasParcelas(prev => prev.map((p, idx) => idx === i ? { ...p, vencimento: e.target.value } : p))}
                    className="h-8 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input type="number" step="0.01" value={np.valor}
                    onChange={e => setNovasParcelas(prev => prev.map((p, idx) => idx === i ? { ...p, valor: e.target.value } : p))}
                    className="h-8 text-sm" />
                </div>
                <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-red-500 border-red-200"
                  onClick={() => setNovasParcelas(prev => prev.filter((_, idx) => idx !== i))}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={adicionarLinhaNovaParcela}>
                <Plus className="w-3 h-3" /> Mais uma linha
              </Button>
              <Button size="sm" className="text-xs h-7 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={salvarNovasParcelas} disabled={createParcelas.isPending}>
                {createParcelas.isPending ? "Salvando..." : "Salvar Parcelas"}
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-7 ml-auto"
                onClick={() => { setAdicionando(false); setNovasParcelas([]); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <Button size="sm" variant="outline" className="text-xs h-8 gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
            onClick={() => { setAdicionando(true); if (novasParcelas.length === 0) adicionarLinhaNovaParcela(); }}>
            <Plus className="w-3.5 h-3.5" /> Adicionar Parcela
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
