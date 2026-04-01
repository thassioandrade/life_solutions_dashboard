import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const SERVICOS_OPCOES = [
  { value: "Limpa Nome", label: "Limpa Nome" },
  { value: "Rating Bancário", label: "Rating Bancário" },
  { value: "Planejamento Financeiro", label: "Planejamento Financeiro" },
  { value: "Consultoria", label: "Consultoria" },
  { value: "Outro", label: "Outro" },
];

const FORMAS_PAGAMENTO = [
  { value: "pix", label: "PIX" },
  { value: "boleto", label: "Boleto" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
];

export interface VendaEditData {
  id: number;
  clienteNome: string;
  clienteCpfCnpj?: string;
  clienteTelefone?: string;
  tipo: string;
  valorFaturado: string;
  valorColetado: string;
  comissaoPercent?: string;
  custoServico?: string;
  dataVenda: string;
  servicos: string[];
  formaPagamento?: string;
  observacoes?: string;
  consultorId?: string;
  // parcelas
  parcelasQtd?: number;
  datesVencimento?: string[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  venda: VendaEditData | null;
  consultores?: { id: number; nome: string }[];
  showConsultor?: boolean;
  onSave: (data: VendaEditData) => void;
  isSaving?: boolean;
  title?: string;
}

export default function ModalEditarVenda({ open, onClose, venda, consultores, showConsultor, onSave, isSaving, title }: Props) {
  const [form, setForm] = useState<VendaEditData>({
    id: 0,
    clienteNome: "",
    clienteCpfCnpj: "",
    clienteTelefone: "",
    tipo: "PF",
    valorFaturado: "",
    valorColetado: "",
    comissaoPercent: "10",
    custoServico: "",
    dataVenda: new Date().toISOString().split("T")[0],
    servicos: [],
    formaPagamento: "",
    observacoes: "",
    consultorId: "",
    parcelasQtd: 0,
    datesVencimento: [],
  });

  useEffect(() => {
    if (venda) {
      setForm({
        ...venda,
        parcelasQtd: venda.parcelasQtd ?? 0,
        datesVencimento: venda.datesVencimento ?? [],
      });
    }
  }, [venda]);

  // Quando muda qtd de parcelas, ajusta o array de datas
  function handleQtdParcelas(qtd: number) {
    const coletado = parseFloat(form.valorColetado) || 0;
    const faturado = parseFloat(form.valorFaturado) || 0;
    const restante = faturado - coletado;
    const valorParcela = qtd > 0 ? (restante / qtd).toFixed(2) : "0";

    // Gerar datas: 1ª parcela = 30 dias após hoje, demais +30 dias cada
    const hoje = new Date();
    const datas = Array.from({ length: qtd }, (_, i) => {
      const d = new Date(hoje);
      d.setDate(d.getDate() + 30 * (i + 1));
      return d.toISOString().split("T")[0];
    });

    setForm(f => ({ ...f, parcelasQtd: qtd, datesVencimento: datas, _valorParcela: valorParcela } as any));
  }

  function handleDateChange(idx: number, val: string) {
    const datas = [...(form.datesVencimento || [])];
    datas[idx] = val;
    setForm(f => ({ ...f, datesVencimento: datas }));
  }

  function toggleServico(s: string) {
    const servicos = form.servicos || [];
    if (servicos.includes(s)) {
      setForm(f => ({ ...f, servicos: servicos.filter(x => x !== s) }));
    } else {
      setForm(f => ({ ...f, servicos: [...servicos, s] }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clienteNome || !form.valorFaturado) {
      return;
    }
    onSave(form);
  }

  const coletado = parseFloat(form.valorColetado) || 0;
  const faturado = parseFloat(form.valorFaturado) || 0;
  const restante = Math.max(0, faturado - coletado);
  const qtdParcelas = form.parcelasQtd || 0;
  const valorParcela = qtdParcelas > 0 ? (restante / qtdParcelas).toFixed(2) : "0";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-gray-800">
            {title || "Editar Venda"}
          </DialogTitle>
          {venda && (
            <p className="text-xs text-gray-500 mt-0.5">
              {venda.dataVenda ? new Date(venda.dataVenda).toLocaleDateString("pt-BR") : ""}
              {venda.clienteTelefone ? ` · ${venda.clienteTelefone}` : ""}
              {venda.clienteCpfCnpj ? ` · ${venda.clienteCpfCnpj}` : ""}
            </p>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          {/* Nome do cliente */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Nome do Cliente *</Label>
            <Input
              value={form.clienteNome}
              onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))}
              placeholder="Nome completo"
              className="mt-1"
            />
          </div>

          {/* Telefone + CPF/CNPJ */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Telefone do Cliente</Label>
              <Input
                value={form.clienteTelefone || ""}
                onChange={e => setForm(f => ({ ...f, clienteTelefone: e.target.value }))}
                placeholder="(00) 00000-0000"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">CPF/CNPJ</Label>
              <Input
                value={form.clienteCpfCnpj || ""}
                onChange={e => setForm(f => ({ ...f, clienteCpfCnpj: e.target.value }))}
                placeholder="000.000.000-00"
                className="mt-1"
              />
            </div>
          </div>

          {/* Coletado à Vista + Faturado Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Coletado à Vista (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valorColetado}
                onChange={e => setForm(f => ({ ...f, valorColetado: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Valor recebido agora</p>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Faturado Total (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.valorFaturado}
                onChange={e => setForm(f => ({ ...f, valorFaturado: e.target.value }))}
                placeholder="0.00"
                className="mt-1"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Total do contrato</p>
            </div>
          </div>

          {/* Parcelas do Restante */}
          <div className="border border-gray-200 rounded-lg p-3 space-y-3 bg-gray-50/50">
            <Label className="text-xs font-semibold text-gray-700">Parcelas do Restante</Label>
            {restante > 0 && (
              <p className="text-xs text-blue-600">Restante a parcelar: <span className="font-semibold">R$ {restante.toFixed(2)}</span></p>
            )}
            <div className="flex items-center gap-3">
              <Select
                value={String(qtdParcelas)}
                onValueChange={v => handleQtdParcelas(parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="0x" />
                </SelectTrigger>
                <SelectContent>
                  {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(n => (
                    <SelectItem key={n} value={String(n)}>{n === 0 ? "Sem parcelas" : `${n}x`}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {qtdParcelas > 0 && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-gray-500">Data 1ª parcela:</Label>
                  <Input
                    type="date"
                    value={form.datesVencimento?.[0] || ""}
                    onChange={e => handleDateChange(0, e.target.value)}
                    className="w-36 text-xs"
                  />
                </div>
              )}
            </div>

            {qtdParcelas > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Datas de vencimento: <span className="font-medium text-gray-700">R$ {valorParcela} por parcela</span>
                </p>
                {Array.from({ length: qtdParcelas }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-14">Parcela {i + 1}</span>
                    <Input
                      type="date"
                      value={form.datesVencimento?.[i] || ""}
                      onChange={e => handleDateChange(i, e.target.value)}
                      className="flex-1 text-xs"
                    />
                    <span className="text-xs text-gray-400 w-20 text-right">R$ {valorParcela}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Serviços Contratados */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Serviços Contratados</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SERVICOS_OPCOES.map(s => {
                const checked = (form.servicos || []).includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleServico(s.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      checked
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Forma de Pagamento</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {FORMAS_PAGAMENTO.map(f => {
                const checked = form.formaPagamento === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, formaPagamento: checked ? "" : f.value }))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      checked
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tipo PF/PJ + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-gray-700">Tipo</Label>
              <Select value={form.tipo || "PF"} onValueChange={v => setForm(f => ({ ...f, tipo: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PF">PF</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-700">Data da Venda</Label>
              <Input
                type="date"
                value={form.dataVenda || ""}
                onChange={e => setForm(f => ({ ...f, dataVenda: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>

          {/* Consultor (opcional) */}
          {showConsultor && consultores && (
            <div>
              <Label className="text-xs font-semibold text-gray-700">Consultor</Label>
              <Select value={form.consultorId || ""} onValueChange={v => setForm(f => ({ ...f, consultorId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {consultores.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Comissão % */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Comissão (%)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={form.comissaoPercent || "10"}
              onChange={e => setForm(f => ({ ...f, comissaoPercent: e.target.value }))}
              className="mt-1 w-28"
            />
          </div>

          {/* Observações */}
          <div>
            <Label className="text-xs font-semibold text-gray-700">Observações</Label>
            <Textarea
              value={form.observacoes || ""}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2}
              className="mt-1 resize-none"
              placeholder="Informações adicionais..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={isSaving}
            >
              {isSaving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
