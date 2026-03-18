import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032202102/5GsibdpZJXu4DWbuGMNC4c/life-solutions-logo_20f8e656.jpg";

type Tab = "consultor" | "admin";

export default function Login() {
  const [tab, setTab] = useState<Tab>("consultor");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [, navigate] = useLocation();

  const loginMutation = trpc.auth.loginConsultor.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        localStorage.setItem("ls_consultor", JSON.stringify(data.consultor));
        toast.success("Bem-vindo(a), " + data.consultor.nome + "!");
        navigate("/painel");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao fazer login");
    },
  });

  const handleConsultorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) {
      toast.error("Preencha todos os campos");
      return;
    }
    loginMutation.mutate({ email, senha });
  };

  const handleAdminLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #0a0a0a 0%, #111111 40%, #0d1a2e 70%, #0a0a0a 100%)" }}
    >
      {/* Background decorative elements — azul da marca */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #0055FF, transparent)" }}
        />
        <div
          className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #0033CC, transparent)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #3377FF, transparent)" }}
        />
        {/* Linha diagonal decorativa — referência ao ícone da logo */}
        <div
          className="absolute bottom-0 right-0 w-48 h-48 opacity-20"
          style={{
            background: "linear-gradient(135deg, transparent 50%, #0055FF 50%)",
          }}
        />
      </div>

      {/* Logo principal */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <div
          className="rounded-2xl p-3 mb-4 shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(0,85,255,0.3)",
            boxShadow: "0 0 40px rgba(0,85,255,0.3)",
          }}
        >
          <img
            src={LOGO_URL}
            alt="Life Solutions"
            className="h-16 w-auto object-contain"
          />
        </div>
        <p className="text-blue-400 text-xs uppercase tracking-[0.25em] mt-1 font-medium">
          Plataforma de Gestão
        </p>
      </div>

      {/* Login Card */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
              tab === "consultor"
                ? "text-white border-b-2"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            style={tab === "consultor" ? { background: "rgba(0,85,255,0.2)", borderColor: "#0055FF" } : {}}
            onClick={() => setTab("consultor")}
          >
            <LogIn className="w-4 h-4" />
            Consultor(a)
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
              tab === "admin"
                ? "text-white border-b-2"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            }`}
            style={tab === "admin" ? { background: "rgba(0,85,255,0.2)", borderColor: "#0055FF" } : {}}
            onClick={() => setTab("admin")}
          >
            <ShieldCheck className="w-4 h-4" />
            Administrador
          </button>
        </div>

        <div className="p-6">
          {tab === "consultor" ? (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Acesso de Consultor(a)</h2>
              <p className="text-gray-400 text-xs mb-5">
                Entre com seu email e senha cadastrados pelo administrador.
              </p>
              <form onSubmit={handleConsultorLogin} className="space-y-4">
                <div>
                  <Label className="text-gray-300 text-sm mb-1.5 block">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/15 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/30"
                  />
                </div>
                <div>
                  <Label className="text-gray-300 text-sm mb-1.5 block">Senha</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showSenha ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="bg-white/10 border-white/15 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/30 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                    >
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full text-white font-semibold py-2.5 shadow-lg border-0"
                  style={{ background: "var(--ls-blue)" }}
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <LogIn className="w-4 h-4" />
                      Entrar
                    </span>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Acesso Administrativo</h2>
              <p className="text-gray-400 text-xs mb-5">
                Acesso exclusivo para administradores. Autentique-se com sua conta autorizada.
              </p>
              <Button
                onClick={handleAdminLogin}
                className="w-full text-white font-semibold py-2.5 shadow-lg border-0"
                style={{ background: "var(--ls-blue)" }}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Continuar como Administrador
              </Button>
            </>
          )}
        </div>

        <div className="px-6 pb-4 text-center">
          <p className="text-gray-600 text-xs">Acesso restrito a membros autorizados</p>
        </div>
      </div>

      {/* Footer com logo */}
      <div className="relative z-10 mt-8 flex flex-col items-center gap-2">
        <img src={LOGO_URL} alt="Life Solutions" className="h-5 object-contain opacity-30" />
        <p className="text-gray-700 text-xs">© 2026 Life Solutions — Todos os direitos reservados</p>
      </div>
    </div>
  );
}
