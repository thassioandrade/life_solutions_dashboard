import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface DrillDownItem {
  tipo: string;
  clienteNome: string;
  consultorNome: string;
  valor: number;
  data: Date | string;
  descricao: string;
  vendaId?: number;
  parcelaId?: number;
}

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  total: number;
  items: DrillDownItem[];
  isLoading?: boolean;
  color?: "teal" | "amber" | "blue" | "green" | "purple" | "rose";
  onDeleted?: () => void;
}

const colorMap = {
  teal: "text-teal-400 border-teal-500/30 bg-teal-500/10",
  amber: "text-amber-400 border-amber-500/30 bg-amber-500/10",
  blue: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  green: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
  purple: "text-purple-400 border-purple-500/30 bg-purple-500/10",
  rose: "text-rose-400 border-rose-500/30 bg-rose-500/10",
};

const tipoBadgeMap: Record<string, { label: string; className: string }> = {
  venda_avista: { label: "À Vista", className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
  parcela_mesmo_mes: { label: "Parcela (mesmo mês)", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  venda: { label: "Venda", className: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  parcela_pendente: { label: "Pendente", className: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  comissao_venda: { label: "Comissão", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  comissao_parcela_mesmo_mes: { label: "Comissão Parcela", className: "bg-orange-500/20 text-orange-300 border-orange-500/30" },
  parcela_mes_anterior: { label: "Parcela (mês ant.)", className: "bg-teal-500/20 text-teal-300 border-teal-500/30" },
  comissao_parcela_mes_anterior: { label: "Comissão Parcela", className: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
  aguardando_baixa: { label: "Aguardando Baixa", className: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(date: Date | string) {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function DrillDownModal({
  open,
  onClose,
  title,
  total,
  items,
  isLoading = false,
  color = "green",
  onDeleted,
}: DrillDownModalProps) {
  const colorClass = colorMap[color];
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const deleteVendaMutation = trpc.vendas.delete.useMutation({
    onSuccess: () => {
      toast.success("Venda excluída com sucesso!");
      utils.dashboard.stats.invalidate();
      utils.dashboardDetalhe.coletado.invalidate();
      utils.dashboardDetalhe.faturado.invalidate();
      utils.dashboardDetalhe.aReceber.invalidate();
      utils.dashboardDetalhe.comissoes.invalidate();
      utils.dashboardDetalhe.coletadoParcelas.invalidate();
      utils.dashboardDetalhe.comissaoParcelas.invalidate();
      utils.dashboardDetalhe.aguardandoBaixa.invalidate();
      utils.parcelas.listAll.invalidate();
      utils.parcelas.coletadoAdmin.invalidate();
      setDeletingId(null);
      onDeleted?.();
    },
    onError: (e) => { toast.error("Erro ao excluir: " + e.message); setDeletingId(null); },
  });

  const deleteParcelaMutation = trpc.parcelas.delete.useMutation({
    onSuccess: () => {
      toast.success("Parcela excluída com sucesso!");
      utils.dashboard.stats.invalidate();
      utils.dashboardDetalhe.coletado.invalidate();
      utils.dashboardDetalhe.faturado.invalidate();
      utils.dashboardDetalhe.aReceber.invalidate();
      utils.dashboardDetalhe.comissoes.invalidate();
      utils.dashboardDetalhe.coletadoParcelas.invalidate();
      utils.dashboardDetalhe.comissaoParcelas.invalidate();
      utils.dashboardDetalhe.aguardandoBaixa.invalidate();
      utils.parcelas.listAll.invalidate();
      utils.parcelas.coletadoAdmin.invalidate();
      setDeletingId(null);
      onDeleted?.();
    },
    onError: (e) => { toast.error("Erro ao excluir: " + e.message); setDeletingId(null); },
  });

  function handleDelete(item: DrillDownItem, idx: number) {
    const key = `${idx}`;
    if (!confirm(`Excluir permanentemente "${item.clienteNome}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(key);
    // Se tem parcelaId e é tipo parcela, exclui a parcela; senão exclui a venda
    if (item.parcelaId && (item.tipo === "parcela_pendente" || item.tipo === "parcela_mes_anterior" || item.tipo === "aguardando_baixa")) {
      deleteParcelaMutation.mutate({ id: item.parcelaId });
    } else if (item.vendaId) {
      deleteVendaMutation.mutate({ id: item.vendaId });
    } else {
      toast.error("Não foi possível identificar o registro para excluir.");
      setDeletingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl bg-[#1a1f2e] border-white/10 text-white p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/10">
          <DialogTitle className="text-lg font-semibold text-white flex items-center justify-between">
            <span>{title}</span>
            <span className={`text-xl font-bold px-3 py-1 rounded-lg border ${colorClass}`}>
              {formatBRL(total)}
            </span>
          </DialogTitle>
          <p className="text-sm text-white/50 mt-1">
            {isLoading ? "Carregando..." : `${items.length} registro${items.length !== 1 ? "s" : ""}`}
          </p>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-white/40">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Carregando detalhes...</p>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-white/40">
              <div className="text-center">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-sm">Nenhum registro encontrado</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {items.map((item, idx) => {
                const badge = tipoBadgeMap[item.tipo] || { label: item.tipo, className: "bg-white/10 text-white/60 border-white/20" };
                const isDeleting = deletingId === `${idx}`;
                const canDelete = !!(item.vendaId || item.parcelaId);
                return (
                  <div key={idx} className="px-6 py-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-white truncate">{item.clienteNome}</span>
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0 h-5 border ${badge.className} shrink-0`}
                          >
                            {badge.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-white/50 mb-1">{item.descricao}</p>
                        <div className="flex items-center gap-3 text-xs text-white/40">
                          <span>👤 {item.consultorNome}</span>
                          <span>📅 {formatDate(item.data)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-base font-semibold text-emerald-400">
                          {formatBRL(item.valor)}
                        </span>
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(item, idx)}
                            disabled={isDeleting}
                            title="Excluir permanentemente"
                          >
                            {isDeleting ? (
                              <div className="w-3.5 h-3.5 border border-red-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {!isLoading && items.length > 0 && (
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-sm text-white/50">{items.length} item{items.length !== 1 ? "s" : ""}</span>
            <span className={`text-base font-bold ${colorClass.split(" ")[0]}`}>
              Total: {formatBRL(total)}
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
