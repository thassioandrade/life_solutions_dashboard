import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, CheckCircle, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR");
}

export default function Parcelas() {
  const { data: parcelas, refetch } = trpc.parcelas.listPendentes.useQuery();

  const markPaidMutation = trpc.parcelas.markPaid.useMutation({
    onSuccess: () => { toast.success("Parcela marcada como paga!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const hoje = new Date();
  const pendentes = parcelas?.filter(p => p.status === "pendente") || [];
  const atrasadas = parcelas?.filter(p => p.status === "atrasado") || [];
  const totalPendente = pendentes.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);
  const totalAtrasado = atrasadas.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);

  const isAtrasada = (p: any) => new Date(p.vencimento) < hoje && p.status === "pendente";

  return (
    <LifeDashboardLayout title="Parcelas Pendentes">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Parcelas Pendentes</h2>
          <p className="text-sm text-gray-500">{parcelas?.length || 0} parcela(s) a receber</p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">A Receber</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalPendente)}</p>
            <p className="text-xs text-amber-500 mt-0.5">{pendentes.length} parcela(s)</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Atrasadas</p>
            <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(totalAtrasado)}</p>
            <p className="text-xs text-red-500 mt-0.5">{atrasadas.length} parcela(s)</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Total</p>
            <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(totalPendente + totalAtrasado)}</p>
            <p className="text-xs text-blue-500 mt-0.5">{(parcelas?.length || 0)} parcela(s)</p>
          </div>
        </div>

        {!parcelas || parcelas.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma parcela pendente</p>
            <p className="text-sm mt-1">Todas as parcelas foram pagas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {parcelas.map((p) => {
              const atrasada = isAtrasada(p);
              const vencimento = new Date(p.vencimento);
              const diasAtraso = atrasada ? Math.floor((hoje.getTime() - vencimento.getTime()) / (1000 * 60 * 60 * 24)) : 0;
              return (
                <Card key={p.id} className={`border-gray-200 hover:shadow-sm transition-shadow ${atrasada ? "border-red-200 bg-red-50/30" : ""}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800">{(p as any).clienteNome || `Parcela #${p.id}`}</p>
                          <Badge className={atrasada ? "bg-red-100 text-red-700 text-xs" : "bg-amber-100 text-amber-700 text-xs"}>
                            {atrasada ? `Atrasada ${diasAtraso}d` : "Pendente"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            {atrasada ? <AlertCircle className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3" />}
                            Vencimento: {formatDate(p.vencimento)}
                          </div>
                          {(p as any).numeroParcela && (
                            <span>Parcela {(p as any).numeroParcela}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-lg font-bold ${atrasada ? "text-red-600" : "text-amber-600"}`}>
                          {formatCurrency(parseFloat(String(p.valor || 0)))}
                        </span>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8"
                          onClick={() => markPaidMutation.mutate({ id: p.id })}
                          disabled={markPaidMutation.isPending}
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Pagar
                        </Button>
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
