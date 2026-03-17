import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogIn, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

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
        // Store consultor session in localStorage
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
      style={{ background: "linear-gradient(135deg, #052e16 0%, #14532d 40%, #166534 70%, #15803d 100%)" }}
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #22c55e, transparent)" }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #16a34a, transparent)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5" style={{ background: "radial-gradient(circle, #4ade80, transparent)" }} />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex flex-col items-center mb-8">
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 shadow-2xl"
          style={{ background: "linear-gradient(135deg, #15803d, #22c55e)", boxShadow: "0 0 40px #16a34a66" }}
        >
          <span className="text-white font-black text-2xl tracking-tight">LS</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Life Solutions</h1>
        <p className="text-green-300 text-sm uppercase tracking-[0.2em] mt-1">Plataforma de Gestão</p>
      </div>

      {/* Login Card */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.12)" }}
      >
        {/* Tabs */}
        <div className="flex border-b border-white/10">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
              tab === "consultor"
                ? "bg-green-600/30 text-white border-b-2 border-green-400"
                : "text-green-300 hover:text-white hover:bg-white/5"
            }`}
            onClick={() => setTab("consultor")}
          >
            <LogIn className="w-4 h-4" />
            Consultor(a)
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-all ${
              tab === "admin"
                ? "bg-green-600/30 text-white border-b-2 border-green-400"
                : "text-green-300 hover:text-white hover:bg-white/5"
            }`}
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
              <p className="text-green-300 text-xs mb-5">Entre com seu email e senha cadastrados pelo administrador.</p>
              <form onSubmit={handleConsultorLogin} className="space-y-4">
                <div>
                  <Label className="text-green-200 text-sm mb-1.5 block">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-green-400/60 focus:border-green-400 focus:ring-green-400/30"
                  />
                </div>
                <div>
                  <Label className="text-green-200 text-sm mb-1.5 block">Senha</Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showSenha ? "text" : "password"}
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-green-400/60 focus:border-green-400 focus:ring-green-400/30 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 hover:text-white transition-colors"
                    >
                      {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 shadow-lg"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Entrando...</span>
                  ) : (
                    <span className="flex items-center gap-2"><LogIn className="w-4 h-4" />Entrar</span>
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-white mb-1">Acesso Administrativo</h2>
              <p className="text-green-300 text-xs mb-5">Acesso exclusivo para administradores. Autentique-se com sua conta autorizada.</p>
              <Button
                onClick={handleAdminLogin}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 shadow-lg"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Continuar como Administrador
              </Button>
            </>
          )}
        </div>

        <div className="px-6 pb-4 text-center">
          <p className="text-green-500 text-xs">Acesso restrito a membros autorizados</p>
        </div>
      </div>

      {/* Footer */}
      <p className="relative z-10 mt-8 text-green-600 text-xs">© 2026 Life Solutions</p>
    </div>
  );
}
