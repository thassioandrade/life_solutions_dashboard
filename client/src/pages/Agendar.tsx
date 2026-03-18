import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle2 } from "lucide-react";

import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032202102/5GsibdpZJXu4DWbuGMNC4c/life-solutions-logo_20f8e656.jpg";

export default function Agendar() {
  const [form, setForm] = useState({ clienteNome: "", clienteEmail: "", clienteTelefone: "", consultorId: "", dataHora: "", observacoes: "" });
  const [success, setSuccess] = useState(false);

  const { data: consultores } = trpc.consultores.list.useQuery();
  const createMutation = trpc.agendamentos.createPublico.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.clienteNome || !form.dataHora || !form.consultorId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate({
      ...form,
      consultorId: parseInt(form.consultorId),
    });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl border-0">
          <CardContent className="pt-10 pb-10">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Agendado com Sucesso!</h2>
            <p className="text-gray-500 mb-6">Seu diagnóstico foi agendado. Em breve você receberá uma confirmação.</p>
            <Button onClick={() => setSuccess(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Fazer Outro Agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-gray-900 rounded-2xl px-5 py-3 shadow-xl">
              <img src={LOGO_URL} alt="Life Solutions" className="h-10 object-contain" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Life Solutions</h1>
          <p className="text-gray-500 mt-1">Agende seu Diagnóstico Gratuito</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-gray-700 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              Dados do Agendamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Seu Nome *</Label>
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
                <Label>Consultor *</Label>
                <Select value={form.consultorId} onValueChange={v => setForm({ ...form, consultorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar consultor..." /></SelectTrigger>
                  <SelectContent>
                    {consultores?.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data e Hora *</Label>
                <Input type="datetime-local" value={form.dataHora} onChange={e => setForm({ ...form, dataHora: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Input placeholder="Alguma informação adicional..." value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 text-base font-semibold" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Agendando..." : "Confirmar Agendamento"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} Life Solutions. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
