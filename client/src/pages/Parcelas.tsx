import { useState, useMemo } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CreditCard, CheckCircle, AlertCircle, Clock, AlertTriangle, Bell, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

function formatCurrency(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString("pt-BR");
}
function calcDiasAtraso(vencimento: Date | string) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const v = new Date(vencimento);
  v.setHours(0, 0, 0, 0);
  return Math.floor((hoje.getTime() - v.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Parcelas() {
  const [filtro, setFiltro] = useState<"todas" | "pendentes" | "atrasadas" | "vencendo_hoje" | "pagas">("todas");
  const [abaAtiva, setAbaAtiva] = useState<"parcelas" | "devedores">("parcelas");
  const [filtroConsultor, setFiltroConsultor] = useState<string>("todos");

  const { data: parcelas, refetch } = trpc.parcelas.listPendentes.useQuery();
  const { data: parcelasVencendo } = trpc.parcelas.vencendoHoje.useQuery();
  const { data: parcelasVencidas } = trpc.parcelas.devedores.useQuery();
  const { data: consultores } = trpc.consultores.list.useQuery();

  const markPaidMutation = trpc.parcelas.markPaid.useMutation({
    onSuccess: () => { toast.success("Parcela marcada como paga!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const okConsultorMutation = trpc.parcelas.okConsultor.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const parcelasFiltradas = useMemo(() => {
    if (!parcelas) return [];
    let list = parcelas;
    if (filtroConsultor !== "todos") {
      const cId = parseInt(filtroConsultor);
      list = list.filter(p => (p as any).consultorId === cId);
    }
    if (filtro === "pagas") return list.filter(p => p.status === "pago");
    if (filtro === "pendentes") return list.filter(p => p.status === "pendente" && calcDiasAtraso(p.vencimento) <= 0);
    if (filtro === "atrasadas") return list.filter(p => p.status === "pendente" && calcDiasAtraso(p.vencimento) > 0);
    if (filtro === "vencendo_hoje") return list.filter(p => p.status === "pendente" && calcDiasAtraso(p.vencimento) === 0);
    return list;
  }, [parcelas, filtro, filtroConsultor]);

  const devedores = useMemo(() => {
    if (!parcelasVencidas) return [];
    const map = new Map<string, {
      nome: string; cpf: string | null; telefone: string | null;
      consultorId: number | null; consultorNome: string;
      parcelas: typeof parcelasVencidas; totalDevido: number; maxAtraso: number;
    }>();
    for (const p of parcelasVencidas) {
      const key = (p as any).clienteNome || `#${p.id}`;
      const consultor = consultores?.find(c => c.id === (p as any).consultorId);
      if (!map.has(key)) {
        map.set(key, {
          nome: (p as any).clienteNome || `Parcela #${p.id}`,
          cpf: (p as any).clienteCpfCnpj ?? null,
          telefone: (p as any).clienteTelefone ?? null,
          consultorId: (p as any).consultorId ?? null,
          consultorNome: consultor?.nome || "—",
          parcelas: [],
          totalDevido: 0,
          maxAtraso: 0,
        });
      }
      const entry = map.get(key)!;
      entry.parcelas.push(p);
      entry.totalDevido += parseFloat(String(p.valor || 0));
      entry.maxAtraso = Math.max(entry.maxAtraso, calcDiasAtraso(p.vencimento));
    }
    return Array.from(map.values()).sort((a, b) => b.maxAtraso - a.maxAtraso);
  }, [parcelasVencidas, consultores]);

  const devedoresFiltrados = useMemo(() => {
    if (filtroConsultor === "todos") return devedores;
    const cId = parseInt(filtroConsultor);
    return devedores.filter(d => d.consultorId === cId);
  }, [devedores, filtroConsultor]);

  const pendentes = parcelas?.filter(p => p.status === "pendente" && calcDiasAtraso(p.vencimento) <= 0) || [];
  const atrasadas = parcelas?.filter(p => p.status === "pendente" && calcDiasAtraso(p.vencimento) > 0) || [];
  const vencendoHoje = parcelasVencendo || [];
  const totalPendente = pendentes.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);
  const totalAtrasado = atrasadas.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);
  const totalDevedores = devedoresFiltrados.reduce((s, d) => s + d.totalDevido, 0);

  function exportarExcel() {
    const rows = parcelasFiltradas.map(p => {
      const consultor = consultores?.find(c => c.id === (p as any).consultorId);
      return {
        "Cliente": (p as any).clienteNome || "",
        "CPF/CNPJ": (p as any).clienteCpfCnpj || "",
        "Telefone": (p as any).clienteTelefone || "",
        "Valor": parseFloat(String(p.valor || 0)),
        "Vencimento": formatDate(p.vencimento),
        "Status": p.status,
        "Dias Atraso": calcDiasAtraso(p.vencimento) > 0 ? calcDiasAtraso(p.vencimento) : 0,
        "Consultora": consultor?.nome || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Parcelas");
    XLSX.writeFile(wb, `parcelas_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.xlsx`);
  }

  function exportarDevedoresExcel() {
    const rows = devedoresFiltrados.flatMap(d =>
      d.parcelas.map(p => ({
        "Cliente": d.nome,
        "CPF/CNPJ": d.cpf || "",
        "Telefone": d.telefone || "",
        "Valor": parseFloat(String(p.valor || 0)),
        "Vencimento": formatDate(p.vencimento),
        "Dias Atraso": calcDiasAtraso(p.vencimento),
        "Consultora": d.consultorNome,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Devedores");
    XLSX.writeFile(wb, `devedores_${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.xlsx`);
  }

  return (
    <LifeDashboardLayout title="Parcelas">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Parcelas</h2>
            <p className="text-sm text-gray-500">Controle de recebimentos e devedores</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {vencendoHoje.length > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border border-amber-200 gap-1 cursor-pointer" onClick={() => setFiltro("vencendo_hoje")}>
                <Bell className="w-3 h-3" />
                {vencendoHoje.length} venc. hoje
              </Badge>
            )}
            {devedores.length > 0 && (
              <Badge className="bg-red-100 text-red-700 border border-red-200 gap-1 cursor-pointer" onClick={() => setAbaAtiva("devedores")}>
                <AlertTriangle className="w-3 h-3" />
                {devedores.length} devedor{devedores.length > 1 ? "es" : ""}
              </Badge>
            )}
            <Select value={filtroConsultor} onValueChange={setFiltroConsultor}>
              <SelectTrigger className="w-44 text-sm h-8">
                <SelectValue placeholder="Todas as consultoras" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as consultoras</SelectItem>
                {consultores?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer" onClick={() => setFiltro("pendentes")}>
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium">A Receber</p>
            <p className="text-xl font-bold text-amber-700 mt-1">{formatCurrency(totalPendente)}</p>
            <p className="text-xs text-amber-500 mt-0.5">{pendentes.length} parcela(s)</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 cursor-pointer" onClick={() => setFiltro("atrasadas")}>
            <p className="text-xs text-red-600 uppercase tracking-wide font-medium">Atrasadas</p>
            <p className="text-xl font-bold text-red-700 mt-1">{formatCurrency(totalAtrasado)}</p>
            <p className="text-xs text-red-500 mt-0.5">{atrasadas.length} parcela(s)</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 cursor-pointer" onClick={() => setAbaAtiva("devedores")}>
            <p className="text-xs text-orange-600 uppercase tracking-wide font-medium">Devedores</p>
            <p className="text-xl font-bold text-orange-700 mt-1">{devedoresFiltrados.length}</p>
            <p className="text-xs text-orange-500 mt-0.5">{formatCurrency(totalDevedores)}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 cursor-pointer" onClick={() => setFiltro("vencendo_hoje")}>
            <p className="text-xs text-amber-600 uppercase tracking-wide font-medium flex items-center gap-1">
              <Bell className="w-3 h-3" /> Venc. Hoje
            </p>
            <p className="text-xl font-bold text-amber-700 mt-1">{vencendoHoje.length}</p>
            <p className="text-xs text-amber-500 mt-0.5">Cobrar hoje</p>
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-200">
          {[
            { key: "parcelas", label: "Parcelas", count: parcelas?.length || 0 },
            { key: "devedores", label: "Devedores", count: devedoresFiltrados.length, alert: devedoresFiltrados.length > 0 },
          ].map(aba => (
            <button key={aba.key} onClick={() => setAbaAtiva(aba.key as typeof abaAtiva)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-all flex items-center gap-1.5 ${abaAtiva === aba.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {aba.label}
              {aba.count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${aba.alert ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"}`}>{aba.count}</span>
              )}
            </button>
          ))}
        </div>

        {abaAtiva === "parcelas" && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold text-gray-700">Lista de Parcelas</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex gap-1">
                    {(["todas", "pendentes", "atrasadas", "vencendo_hoje", "pagas"] as const).map(f => (
                      <button key={f} onClick={() => setFiltro(f)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all ${filtro === f ? "bg-blue-600 text-white border-transparent" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                        {f === "todas" ? "Todas" : f === "pendentes" ? "Pendentes" : f === "atrasadas" ? "Atrasadas" : f === "vencendo_hoje" ? "Hoje" : "Pagas"}
                      </button>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" onClick={exportarExcel} className="text-xs h-7 gap-1">
                    <Download className="w-3 h-3" />
                    Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {parcelasFiltradas.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Nenhuma parcela encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {parcelasFiltradas.map((p) => {
                    const atraso = calcDiasAtraso(p.vencimento);
                    const isAtrasada = p.status === "pendente" && atraso > 0;
                    const isHoje = p.status === "pendente" && atraso === 0;
                    const consultor = consultores?.find(c => c.id === (p as any).consultorId);
                    return (
                      <div key={p.id} className={`flex items-center justify-between py-2.5 px-3 rounded-lg border transition-all ${isAtrasada ? "border-red-200 bg-red-50" : isHoje ? "border-amber-200 bg-amber-50" : p.status === "pago" ? "border-emerald-200 bg-emerald-50/50" : "border-gray-100 hover:bg-gray-50"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-800 truncate">{(p as any).clienteNome || `Parcela #${p.id}`}</p>
                            {isAtrasada && <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">{atraso}d atraso</Badge>}
                            {isHoje && <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Vence hoje</Badge>}
                            {p.status === "pago" && <Badge className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">Pago</Badge>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              {isAtrasada ? <AlertCircle className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3" />}
                              Venc: {formatDate(p.vencimento)}
                            </span>
                            {(p as any).clienteTelefone && <span>{(p as any).clienteTelefone}</span>}
                            {consultor && <span className="text-gray-400">{consultor.nome}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-2 flex-shrink-0">
                          <span className={`text-sm font-bold ${isAtrasada ? "text-red-600" : p.status === "pago" ? "text-emerald-600" : "text-amber-600"}`}>
                            {formatCurrency(parseFloat(String(p.valor || 0)))}
                          </span>
                          {p.status === "pendente" && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Checkbox id={`ok-${p.id}`} checked={!!(p as any).okConsultor} onCheckedChange={(checked) => okConsultorMutation.mutate({ id: p.id, ok: !!checked })} />
                                <Label htmlFor={`ok-${p.id}`} className="text-xs text-gray-500 cursor-pointer">Recebi</Label>
                              </div>
                              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-7 text-xs"
                                onClick={() => markPaidMutation.mutate({ id: p.id })} disabled={markPaidMutation.isPending}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Pago
                              </Button>
                            </>
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

        {abaAtiva === "devedores" && (
          <Card className="border-red-200">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Lista de Devedores ({devedoresFiltrados.length})
                </CardTitle>
                {devedoresFiltrados.length > 0 && (
                  <Button size="sm" onClick={exportarDevedoresExcel} className="bg-red-600 hover:bg-red-700 text-white text-xs gap-1.5 h-7">
                    <Download className="w-3 h-3" />
                    Excel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {devedoresFiltrados.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  Nenhum devedor encontrado!
                </div>
              ) : (
                <div className="space-y-3">
                  {devedoresFiltrados.map((d, i) => (
                    <div key={i} className="p-3 rounded-lg border border-red-200 bg-red-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-red-800">{d.nome}</p>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {d.cpf && <span className="text-xs text-red-600">CPF: {d.cpf}</span>}
                            {d.telefone && <span className="text-xs text-red-600">{d.telefone}</span>}
                            <span className="text-xs text-red-500">Consultora: {d.consultorNome}</span>
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
                            <span>Venc: {formatDate(p.vencimento)}</span>
                            <span className="font-medium text-red-600">{calcDiasAtraso(p.vencimento)}d atraso</span>
                            <span className="font-semibold">{formatCurrency(parseFloat(String(p.valor || 0)))}</span>
                            <Button size="sm" className="h-5 text-[10px] px-2 bg-red-600 hover:bg-red-700 text-white"
                              onClick={() => markPaidMutation.mutate({ id: p.id })} disabled={markPaidMutation.isPending}>
                              Pago
                            </Button>
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
      </div>
    </LifeDashboardLayout>
  );
}
