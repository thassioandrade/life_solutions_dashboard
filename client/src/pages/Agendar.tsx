import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CheckCircle2, User, Phone, Mail, Clock, MessageSquare, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032202102/5GsibdpZJXu4DWbuGMNC4c/life-solutions-logo_20f8e656.jpg";

function getUrlParam(key: string): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(key);
}

export default function Agendar() {
  const [form, setForm] = useState({
    clienteNome: "",
    clienteEmail: "",
    clienteTelefone: "",
    consultorId: "",
    dataHora: "",
    observacoes: "",
  });
  const [dataInput, setDataInput] = useState("");
  const [horaInput, setHoraInput] = useState("");
  const [success, setSuccess] = useState(false);
  const [consultorNome, setConsultorNome] = useState("");
  // Se veio parâmetro de consultora na URL, oculta o seletor
  const [consultorFixo, setConsultorFixo] = useState<string | null>(null);

  const { data: consultores } = trpc.consultores.listPublico.useQuery();

  // Ao carregar, verifica se há parâmetro ?consultora=ID ou ?consultora=NOME na URL
  useEffect(() => {
    if (!consultores) return;
    const param = getUrlParam("consultora") || getUrlParam("c");
    if (!param) return;

    // Tenta por ID numérico
    const porId = consultores.find((c: any) => String(c.id) === param && c.ativo);
    if (porId) {
      setForm(f => ({ ...f, consultorId: String(porId.id) }));
      setConsultorNome(porId.nome);
      setConsultorFixo(String(porId.id));
      return;
    }

    // Tenta por slug do nome (ex: "ana-silva" → "Ana Silva")
    const slug = param.toLowerCase().replace(/-/g, " ");
    const porNome = consultores.find((c: any) =>
      c.ativo && c.nome.toLowerCase().includes(slug)
    );
    if (porNome) {
      setForm(f => ({ ...f, consultorId: String(porNome.id) }));
      setConsultorNome(porNome.nome);
      setConsultorFixo(String(porNome.id));
    }
  }, [consultores]);

  const createMutation = trpc.agendamentos.createPublico.useMutation({
    onSuccess: () => setSuccess(true),
    onError: (e) => toast.error(e.message || "Erro ao agendar. Tente novamente."),
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!form.clienteNome.trim()) { toast.error("Informe seu nome completo"); return; }
    if (!form.consultorId) { toast.error("Selecione um consultor"); return; }
    if (!dataInput || !horaInput) { toast.error("Informe a data e horário"); return; }
    const dataHoraCombinada = `${dataInput}T${horaInput}`;
    setForm(f => ({ ...f, dataHora: dataHoraCombinada }));
    createMutation.mutate({
      ...form,
      dataHora: `${dataInput}T${horaInput}`,
      consultorId: parseInt(form.consultorId),
    });
  };

  const resetForm = () => {
    const param = getUrlParam("consultora") || getUrlParam("c");
    setSuccess(false);
    setDataInput("");
    setHoraInput("");
    setForm({
      clienteNome: "",
      clienteEmail: "",
      clienteTelefone: "",
      consultorId: consultorFixo || "",
      dataHora: "",
      observacoes: "",
    });
    if (!param) {
      setConsultorNome("");
      setConsultorFixo(null);
    }
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "linear-gradient(145deg, #0a0a0a 0%, #0d1a2e 60%, #0a0a0a 100%)" }}
      >
        <Card className="w-full max-w-md text-center shadow-2xl border-0 bg-white">
          <CardContent className="pt-10 pb-10 px-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5"
              style={{ background: "linear-gradient(135deg, #0033CC, #0055FF)" }}
            >
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <img src={LOGO_URL} alt="Life Solutions" className="h-7 object-contain mx-auto mb-4 opacity-70" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Agendado com Sucesso!</h2>
            <p className="text-gray-500 mb-2">
              Olá, <strong>{form.clienteNome}</strong>! Seu diagnóstico foi agendado com{" "}
              <strong>{consultorNome || "o consultor"}</strong>.
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Em breve você receberá uma confirmação. Fique atento ao seu telefone e email.
            </p>
            <Button
              onClick={resetForm}
              className="text-white font-semibold border-0"
              style={{ background: "#0055FF" }}
            >
              Fazer Outro Agendamento
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #0a0a0a 0%, #0d1a2e 60%, #0a0a0a 100%)" }}
    >
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #0055FF, transparent)" }} />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #0033CC, transparent)" }} />
        <div className="absolute bottom-0 right-0 w-40 h-40 opacity-15" style={{ background: "linear-gradient(135deg, transparent 50%, #0055FF 50%)" }} />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header com logo */}
        <div className="text-center mb-6">
          <div className="inline-block bg-gray-900 rounded-2xl px-6 py-3 shadow-2xl mb-4" style={{ border: "1px solid rgba(0,85,255,0.3)", boxShadow: "0 0 30px rgba(0,85,255,0.2)" }}>
            <img src={LOGO_URL} alt="Life Solutions" className="h-10 object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-white">Agende sua reunião com a gerente de crédito</h1>
          {consultorFixo && consultorNome ? (
            <p className="text-blue-400 text-sm mt-1 font-medium">
              com <span className="text-white font-semibold">{consultorNome}</span>
            </p>
          ) : (
            <p className="text-gray-400 text-sm mt-1">Agende sua consulta com um de nossos especialistas</p>
          )}
        </div>

        {/* Card do formulário */}
        <Card className="shadow-2xl border-0 bg-white">
          <CardHeader className="pb-3 pt-5 px-6">
            <CardTitle className="text-sm font-semibold text-gray-600 flex items-center gap-2 uppercase tracking-wide">
              <CalendarDays className="w-4 h-4" style={{ color: "#0055FF" }} />
              Preencha seus dados
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nome */}
              <div>
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <User className="w-3.5 h-3.5" /> Nome Completo *
                </Label>
                <Input
                  placeholder="Seu nome completo"
                  value={form.clienteNome}
                  onChange={e => setForm({ ...form, clienteNome: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              {/* Email e Telefone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </Label>
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    value={form.clienteEmail}
                    onChange={e => setForm({ ...form, clienteEmail: e.target.value })}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <Phone className="w-3.5 h-3.5" /> Telefone
                  </Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={form.clienteTelefone}
                    onChange={e => setForm({ ...form, clienteTelefone: e.target.value })}
                    className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Consultor — oculto se veio fixo pela URL */}
              {!consultorFixo && (
                <div>
                  <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5 mb-1.5">
                    <User className="w-3.5 h-3.5" /> Consultor *
                  </Label>
                  <Select
                    value={form.consultorId}
                    onValueChange={v => {
                      setForm({ ...form, consultorId: v });
                      const c = consultores?.find((c: any) => String(c.id) === v);
                      setConsultorNome(c?.nome || "");
                    }}
                  >
                    <SelectTrigger className="border-gray-200 focus:border-blue-500">
                      <SelectValue placeholder="Selecione seu consultor..." />
                    </SelectTrigger>
                    <SelectContent>
                      {consultores?.filter((c: any) => c.ativo).map((c: any) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Consultor fixo — exibe apenas o nome */}
              {consultorFixo && consultorNome && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
                  <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-blue-700 font-medium">{consultorNome}</span>
                </div>
              )}

              {/* Data e Hora */}
              <div>
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3.5 h-3.5" /> Data e Horário *
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Data</Label>
                    <Input
                      type="date"
                      value={dataInput}
                      onChange={e => setDataInput(e.target.value)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                      min={new Date().toISOString().slice(0, 10)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Horário</Label>
                    <Input
                      type="time"
                      value={horaInput}
                      onChange={e => setHoraInput(e.target.value)}
                      className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label className="text-gray-700 text-sm font-medium flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5" /> Observações
                </Label>
                <Textarea
                  placeholder="Conte um pouco sobre sua situação financeira ou dúvidas..."
                  value={form.observacoes}
                  onChange={e => setForm({ ...form, observacoes: e.target.value })}
                  className="border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 resize-none"
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white font-semibold h-11 text-base border-0 mt-2"
                style={{ background: "#0055FF" }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Agendando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CalendarDays className="w-4 h-4" />
                    Confirmar Agendamento
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-600 mt-4">
          © {new Date().getFullYear()} Life Solutions — Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
