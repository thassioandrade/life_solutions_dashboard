import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ChevronLeft, ChevronRight, TrendingUp, DollarSign, Users, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

export default function Trafego() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    investimento: "", qtdDiagnosticos: "", valorUnitarioDiagnostico: "",
    qtdUpsell: "", valorUnitarioUpsell: "", qtdDownsell: "", valorUnitarioDownsell: "",
  });

  const { data: metricas, refetch } = trpc.metricas.listByPeriod.useQuery({ mes, ano });
  const createMutation = trpc.metricas.create.useMutation({
    onSuccess: () => { toast.success("Métricas salvas!"); setOpen(false); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.metricas.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const metrica = metricas?.[0];
  const inv = parseFloat(metrica?.investimento as string || "0");
  const qtdDiag = metrica?.qtdDiagnosticos || 0;
  const valDiag = parseFloat(metrica?.valorUnitarioDiagnostico as string || "0");
  const qtdUp = metrica?.qtdUpsell || 0;
  const valUp = parseFloat(metrica?.valorUnitarioUpsell as string || "0");
  const qtdDown = metrica?.qtdDownsell || 0;
  const valDown = parseFloat(metrica?.valorUnitarioDownsell as string || "0");
  const receitaDiag = qtdDiag * valDiag;
  const receitaUp = qtdUp * valUp;
  const receitaDown = qtdDown * valDown;
  const receitaTotal = receitaDiag + receitaUp + receitaDown;
  const custoAgendamento = qtdDiag > 0 ? inv / qtdDiag : 0;
  const roi = inv > 0 ? ((receitaTotal - inv) / inv) * 100 : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      mes, ano,
      investimento: parseFloat(form.investimento) || 0,
      qtdDiagnosticos: parseInt(form.qtdDiagnosticos) || 0,
      valorUnitarioDiagnostico: parseFloat(form.valorUnitarioDiagnostico) || 0,
      qtdUpsell: parseInt(form.qtdUpsell) || 0,
      valorUnitarioUpsell: parseFloat(form.valorUnitarioUpsell) || 0,
      qtdDownsell: parseInt(form.qtdDownsell) || 0,
      valorUnitarioDownsell: parseFloat(form.valorUnitarioDownsell) || 0,
    });
  };

  return (
    <LifeDashboardLayout title="Tráfego & Front-end">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Tráfego & Front-end</h2>
            <p className="text-sm text-gray-500">Métricas de investimento em tráfego e retorno</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => { if (mes===1){setMes(12);setAno(ano-1);}else setMes(mes-1); }} className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[130px] text-center">
              {MESES[mes-1]} {ano}
            </div>
            <Button variant="outline" size="icon" onClick={() => { if (mes===12){setMes(1);setAno(ano+1);}else setMes(mes+1); }} className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
            {user?.role === "admin" && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white ml-2">
                    <Plus className="w-4 h-4 mr-1" /> {metrica ? "Editar" : "Lançar"} Métricas
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Métricas de Tráfego — {MESES[mes-1]} {ano}</DialogTitle></DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Label>Investimento em Tráfego (R$)</Label>
                        <Input type="number" step="0.01" placeholder="0,00" value={form.investimento} onChange={e=>setForm({...form,investimento:e.target.value})} />
                      </div>
                      <div>
                        <Label>Qtd. Diagnósticos</Label>
                        <Input type="number" placeholder="0" value={form.qtdDiagnosticos} onChange={e=>setForm({...form,qtdDiagnosticos:e.target.value})} />
                      </div>
                      <div>
                        <Label>Valor Unit. Diagnóstico (R$)</Label>
                        <Input type="number" step="0.01" placeholder="0,00" value={form.valorUnitarioDiagnostico} onChange={e=>setForm({...form,valorUnitarioDiagnostico:e.target.value})} />
                      </div>
                      <div>
                        <Label>Qtd. Upsell</Label>
                        <Input type="number" placeholder="0" value={form.qtdUpsell} onChange={e=>setForm({...form,qtdUpsell:e.target.value})} />
                      </div>
                      <div>
                        <Label>Valor Unit. Upsell (R$)</Label>
                        <Input type="number" step="0.01" placeholder="0,00" value={form.valorUnitarioUpsell} onChange={e=>setForm({...form,valorUnitarioUpsell:e.target.value})} />
                      </div>
                      <div>
                        <Label>Qtd. Downsell</Label>
                        <Input type="number" placeholder="0" value={form.qtdDownsell} onChange={e=>setForm({...form,qtdDownsell:e.target.value})} />
                      </div>
                      <div>
                        <Label>Valor Unit. Downsell (R$)</Label>
                        <Input type="number" step="0.01" placeholder="0,00" value={form.valorUnitarioDownsell} onChange={e=>setForm({...form,valorUnitarioDownsell:e.target.value})} />
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
                      <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={createMutation.isPending}>Salvar</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {metrica ? (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Investimento</p>
                <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(inv)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">Receita Total</p>
                <p className="text-xl font-bold text-blue-700 mt-1">{formatCurrency(receitaTotal)}</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 uppercase tracking-wide font-medium">ROI</p>
                <p className={`text-xl font-bold mt-1 ${roi >= 0 ? "text-blue-700" : "text-red-600"}`}>{roi.toFixed(1)}%</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">Custo/Agendamento</p>
                <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(custoAgendamento)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                { label: "Diagnósticos", qtd: qtdDiag, val: valDiag, receita: receitaDiag, color: "green" },
                { label: "Upsell", qtd: qtdUp, val: valUp, receita: receitaUp, color: "blue" },
                { label: "Downsell", qtd: qtdDown, val: valDown, receita: receitaDown, color: "amber" },
              ].map((item) => (
                <Card key={item.label} className="border-gray-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold text-gray-700">{item.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Quantidade</span>
                        <span className="font-medium">{item.qtd}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Valor Unitário</span>
                        <span className="font-medium">{formatCurrency(item.val)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-semibold border-t pt-2">
                        <span className="text-gray-700">Receita</span>
                        <span className="text-blue-600">{formatCurrency(item.receita)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {user?.role === "admin" && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => deleteMutation.mutate({ id: metrica.id })}>
                  <Trash2 className="w-4 h-4 mr-1" /> Remover Métricas
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma métrica lançada para {MESES[mes-1]} {ano}</p>
            <p className="text-sm mt-1">Clique em "Lançar Métricas" para começar</p>
          </div>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
