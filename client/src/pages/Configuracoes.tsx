import { useState, useRef } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  User, Users, Shield, Camera, Save, Settings, Bell, Target, Trophy,
  Eye, EyeOff, RefreshCw, Plus, Pencil, Trash2, Lock, Link, Mail,
  ChevronDown, ChevronUp, Check, X, History, DollarSign, TrendingUp, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function gerarSenhaAleatoria() {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function getInitials(name?: string | null) {
  if (!name) return "LS";
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function Configuracoes() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [ano, setAno] = useState(now.getFullYear());

  // ── Consultores ──
  const { data: consultores, refetch: refetchConsultores } = trpc.consultores.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const [showAddConsultor, setShowAddConsultor] = useState(false);
  const [novoConsultor, setNovoConsultor] = useState({ nome: "", email: "", linkAgenda: "" });
  const [editConsultorId, setEditConsultorId] = useState<number | null>(null);
  const [editConsultorData, setEditConsultorData] = useState({ nome: "", email: "", linkAgenda: "", salario: 0, receberSalario: false });
  const [senhaConsultorId, setSenhaConsultorId] = useState<number | null>(null);
  const [novaSenha, setNovaSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const fotoRef = useRef<HTMLInputElement>(null);
  const [fotoConsultorId, setFotoConsultorId] = useState<number | null>(null);

  const createConsultorMut = trpc.consultores.create.useMutation({
    onSuccess: () => { toast.success("Consultora adicionada!"); refetchConsultores(); setShowAddConsultor(false); setNovoConsultor({ nome: "", email: "", linkAgenda: "" }); },
    onError: (e) => toast.error(e.message),
  });
  const updateConsultorMut = trpc.consultores.update.useMutation({
    onSuccess: () => { toast.success("Consultora atualizada!"); refetchConsultores(); setEditConsultorId(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteConsultorMut = trpc.consultores.delete.useMutation({
    onSuccess: () => { toast.success("Consultora removida!"); refetchConsultores(); },
    onError: (e) => toast.error(e.message),
  });
  const setSenhaMut = trpc.consultores.setSenha.useMutation({
    onSuccess: () => { toast.success("Senha definida!"); setSenhaConsultorId(null); setNovaSenha(""); },
    onError: (e) => toast.error(e.message),
  });
  const uploadFotoMut = trpc.consultores.uploadFoto.useMutation({
    onSuccess: () => { toast.success("Foto atualizada!"); refetchConsultores(); },
    onError: () => toast.error("Erro ao enviar foto"),
  });

  const handleFotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !fotoConsultorId) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Foto muito grande. Máx 2MB"); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const base64 = (ev.target?.result as string).split(",")[1];
      await uploadFotoMut.mutateAsync({ id: fotoConsultorId, fotoBase64: base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  // ── Usuários do Sistema ──
  const { data: usuarios, refetch: refetchUsers } = trpc.usuarios.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const updateRoleMut = trpc.usuarios.updateRole.useMutation({
    onSuccess: () => { toast.success("Permissão atualizada!"); refetchUsers(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteUserMut = trpc.usuarios.delete.useMutation({
    onSuccess: () => { toast.success("Usuário excluído!"); refetchUsers(); },
    onError: (e) => toast.error(e.message),
  });

  // ── Perfil do usuário logado ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const updateAvatarMut = trpc.usuarios.updateAvatar.useMutation({
    onSuccess: () => toast.success("Foto atualizada!"),
    onError: (e) => toast.error(e.message),
  });
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Arquivo muito grande (máx 2MB)"); return; }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(",")[1];
        await updateAvatarMut.mutateAsync({ avatarBase64: base64, mimeType: file.type });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch { setUploading(false); }
  };

  // ── Meta Mensal ──
  const { data: metaData, refetch: refetchMeta } = trpc.metaColetado.buscar.useQuery({ mes, ano }, { enabled: user?.role === "admin" });
  const [metaInput, setMetaInput] = useState("");
  const salvarMetaMut = trpc.metaColetado.salvar.useMutation({
    onSuccess: () => { refetchMeta(); toast.success("Meta mensal salva!"); setMetaInput(""); },
    onError: () => toast.error("Erro ao salvar meta"),
  });
  const metaAtual = metaData?.meta || 0;

  // ── Custos de Serviços ──
  const { data: custosServicos, refetch: refetchCustos } = trpc.custosServicos.get.useQuery(undefined, { enabled: user?.role === "admin" });
  const [custoLimpaInput, setCustoLimpaInput] = useState("");
  const [custoRatingInput, setCustoRatingInput] = useState("");
  const [custoSalarioInput, setCustoSalarioInput] = useState("");
  const setCustoMut = trpc.custosServicos.set.useMutation({
    onSuccess: () => { refetchCustos(); toast.success("Custo atualizado!"); },
    onError: (e) => toast.error("Erro: " + e.message),
  });
  // ── Dashboard Financeiro ──
  const { data: dashFinanceiro } = trpc.dashboardFinanceiro.get.useQuery({ mes, ano }, { enabled: user?.role === "admin" });
  // ── Histórico de Rankings ──
  const salvarSnapshotMut = trpc.rankingHistorico.salvarSnapshot.useMutation({
    onSuccess: (r) => toast.success(`Ranking do mês salvo! ${r.total} consultoras registradas.`),
    onError: () => toast.error("Erro ao salvar snapshot do ranking"),
  });

  // ── Notificações ──
  const notifyMut = trpc.system.notifyOwner.useMutation({
    onSuccess: () => toast.success("Notificação enviada!"),
    onError: () => toast.error("Erro ao enviar notificação"),
  });

  if (!user) return null;

  return (
    <LifeDashboardLayout title="Configurações">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h2 className="text-lg font-bold text-foreground">Configurações do Sistema</h2>
          <p className="text-sm text-muted-foreground">Gerencie consultoras, usuários, metas e notificações</p>
        </div>

        {user.role === "admin" ? (
          <>
            {/* ── Seletor de Mês/Ano ── */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Mês:</Label>
                <select
                  value={mes}
                  onChange={e => setMes(Number(e.target.value))}
                  className="h-8 text-xs rounded-md border border-border bg-background text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {MESES.map((m, i) => (
                    <option key={i + 1} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Ano:</Label>
                <select
                  value={ano}
                  onChange={e => setAno(Number(e.target.value))}
                  className="h-8 text-xs rounded-md border border-border bg-background text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {[2023, 2024, 2025, 2026, 2027].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Consultoras ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Consultoras
                </h3>
                <Button size="sm" className="gap-2 h-8 text-xs" onClick={() => setShowAddConsultor(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar Consultora
                </Button>
              </div>

              {/* Formulário de adição */}
              {showAddConsultor && (
                <div className="mb-4 p-4 rounded-lg border border-border bg-muted/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Nome *</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        value={novoConsultor.nome}
                        onChange={e => setNovoConsultor(p => ({ ...p, nome: e.target.value }))}
                        placeholder="Nome da consultora"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        type="email"
                        value={novoConsultor.email}
                        onChange={e => setNovoConsultor(p => ({ ...p, email: e.target.value }))}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Link da Agenda</Label>
                      <Input
                        className="h-8 text-sm mt-1"
                        value={novoConsultor.linkAgenda}
                        onChange={e => setNovoConsultor(p => ({ ...p, linkAgenda: e.target.value }))}
                        placeholder="https://calendly.com/..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddConsultor(false)}>
                      <X className="w-3 h-3 mr-1" /> Cancelar
                    </Button>
                    <Button size="sm" className="h-7 text-xs" disabled={!novoConsultor.nome || createConsultorMut.isPending}
                      onClick={() => createConsultorMut.mutate(novoConsultor)}>
                      <Save className="w-3 h-3 mr-1" /> {createConsultorMut.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de consultoras */}
              {!consultores || consultores.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma consultora cadastrada</div>
              ) : (
                <div className="space-y-2">
                  {consultores.map((c) => (
                    <div key={c.id} className="rounded-lg border border-border bg-background p-3">
                      {editConsultorId === c.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs text-muted-foreground">Nome</Label>
                              <Input className="h-8 text-sm mt-1" value={editConsultorData.nome}
                                onChange={e => setEditConsultorData(p => ({ ...p, nome: e.target.value }))} />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Email</Label>
                              <Input className="h-8 text-sm mt-1" type="email" value={editConsultorData.email}
                                onChange={e => setEditConsultorData(p => ({ ...p, email: e.target.value }))} />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Link Agenda</Label>
                              <Input className="h-8 text-sm mt-1" value={editConsultorData.linkAgenda}
                                onChange={e => setEditConsultorData(p => ({ ...p, linkAgenda: e.target.value }))} />
                            </div>
                          </div>
                          {/* Salário */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                            <div>
                              <Label className="text-xs text-amber-700 font-semibold">Salário (R$)</Label>
                              <Input className="h-8 text-sm mt-1" type="number" min="0" step="100"
                                value={editConsultorData.salario || ""}
                                placeholder="0,00"
                                onChange={e => setEditConsultorData(p => ({ ...p, salario: parseFloat(e.target.value) || 0 }))} />
                              <p className="text-xs text-amber-600 mt-1">Valor do salário mensal desta consultora</p>
                            </div>
                            <div className="flex flex-col justify-center">
                              <Label className="text-xs text-amber-700 font-semibold mb-2">Receber Salário?</Label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                    editConsultorData.receberSalario ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                  onClick={() => setEditConsultorData(p => ({ ...p, receberSalario: !p.receberSalario }))}
                                >
                                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                    editConsultorData.receberSalario ? 'translate-x-6' : 'translate-x-1'
                                  }`} />
                                </button>
                                <span className={`text-xs font-medium ${
                                  editConsultorData.receberSalario ? 'text-green-700' : 'text-gray-500'
                                }`}>
                                  {editConsultorData.receberSalario ? 'Sim — será descontado do lucro' : 'Não — não afeta o lucro'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setEditConsultorId(null)}>
                              <X className="w-3 h-3 mr-1" /> Cancelar
                            </Button>
                            <Button size="sm" className="h-7 text-xs" disabled={updateConsultorMut.isPending}
                              onClick={() => updateConsultorMut.mutate({ id: c.id, ...editConsultorData })}>
                              <Save className="w-3 h-3 mr-1" /> {updateConsultorMut.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Foto */}
                          <div className="relative flex-shrink-0">
                            <Avatar className="w-10 h-10 cursor-pointer" onClick={() => { setFotoConsultorId(c.id); fotoRef.current?.click(); }}>
                              <AvatarImage src={c.fotoUrl || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{getInitials(c.nome)}</AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center cursor-pointer"
                              onClick={() => { setFotoConsultorId(c.id); fotoRef.current?.click(); }}>
                              <Camera className="w-2.5 h-2.5 text-white" />
                            </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{c.nome}</p>
                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                              {c.email ? (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Mail className="w-3 h-3" /> {c.email}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">sem email</span>
                              )}
                              {c.linkAgenda && (
                                <a href={c.linkAgenda} target="_blank" rel="noopener noreferrer"
                                  className="text-xs text-primary flex items-center gap-1 hover:underline">
                                  <Link className="w-3 h-3" /> Link Agenda
                                </a>
                              )}
                              <Badge className={`text-xs ${c.ativo ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                {c.ativo ? "Pode acessar" : "Bloqueada"}
                              </Badge>
                              {c.receberSalario && parseFloat(String(c.salario || 0)) > 0 && (
                                <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                                  Salário: R$ {parseFloat(String(c.salario || 0)).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </Badge>
                              )}
                              {!c.receberSalario && (
                                <Badge className="text-xs bg-gray-100 text-gray-500 border-gray-200">
                                  Sem salário
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => { setEditConsultorId(c.id); setEditConsultorData({ nome: c.nome, email: c.email || "", linkAgenda: c.linkAgenda || "", salario: parseFloat(String(c.salario || 0)), receberSalario: c.receberSalario ?? false }); }}>
                              <Pencil className="w-3 h-3" /> Editar
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => { setSenhaConsultorId(c.id); setNovaSenha(""); }}>
                              <Lock className="w-3 h-3" /> Senha
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => updateConsultorMut.mutate({ id: c.id, ativo: !c.ativo })}>
                              {c.ativo ? <X className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                              {c.ativo ? "Bloquear" : "Ativar"}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 hover:border-red-300"
                              onClick={() => { if (confirm(`Remover ${c.nome}?`)) deleteConsultorMut.mutate({ id: c.id }); }}>
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Modal de senha inline */}
                      {senhaConsultorId === c.id && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <Label className="text-xs text-muted-foreground">Nova Senha</Label>
                          <div className="flex gap-2 items-center flex-wrap">
                            <div className="relative flex-1 min-w-[200px]">
                              <Input
                                type={showSenha ? "text" : "password"}
                                placeholder="Digite ou gere uma senha"
                                value={novaSenha}
                                onChange={e => setNovaSenha(e.target.value)}
                                className="h-8 text-sm pr-9"
                              />
                              <button type="button" onClick={() => setShowSenha(p => !p)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                {showSenha ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1"
                              onClick={() => setNovaSenha(gerarSenhaAleatoria())}>
                              <RefreshCw className="w-3 h-3" /> Gerar senha aleatória
                            </Button>
                            <Button size="sm" className="h-8 text-xs gap-1" disabled={novaSenha.length < 4 || setSenhaMut.isPending}
                              onClick={() => setSenhaMut.mutate({ id: c.id, senha: novaSenha })}>
                              <Save className="w-3 h-3" /> {setSenhaMut.isPending ? "Salvando..." : "Definir Senha"}
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 text-xs"
                              onClick={() => setSenhaConsultorId(null)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                          {novaSenha && (
                            <p className="text-xs text-muted-foreground">
                              Após definir a senha, compartilhe com a consultora:{" "}
                              <span className="font-mono font-semibold text-foreground">{novaSenha}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
            </div>

            {/* ── Usuários do Sistema ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Usuários do Sistema
              </h3>
              {!usuarios || usuarios.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">Nenhum usuário cadastrado</div>
              ) : (
                <div className="space-y-2">
                  {usuarios.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatarUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{u.name || "Sem nome"}</p>
                          <p className="text-xs text-muted-foreground">{u.email || u.openId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={u.role === "admin" ? "bg-primary/10 text-primary text-xs" : "bg-muted text-muted-foreground text-xs"}>
                          {u.role === "admin" ? "Admin" : "Usuário"}
                        </Badge>
                        <span className="text-xs text-muted-foreground hidden sm:block">
                          {u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR") : "—"}
                        </span>
                        {u.id !== user.id && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={updateRoleMut.isPending}
                              onClick={() => updateRoleMut.mutate({ userId: u.id, role: u.role === "admin" ? "user" : "admin" })}
                            >
                              {u.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                              disabled={deleteUserMut.isPending}
                              onClick={() => {
                                if (window.confirm(`Excluir o usuário "${u.name || u.email}"? Esta ação não pode ser desfeita.`)) {
                                  deleteUserMut.mutate({ userId: u.id });
                                }
                              }}
                            >
                              Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Meta Mensal de Coletado ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Meta Mensal de Coletado
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Defina a meta de coletado para o mês {mes}/{ano}. Ela aparecerá como barra de progresso no ranking das consultoras.
                {metaAtual > 0 && (
                  <span className="ml-1 font-semibold text-foreground">
                    Meta atual: R$ {metaAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </p>
              <div className="flex gap-2 items-center flex-wrap">
                <Input
                  type="number"
                  min="0"
                  step="100"
                  placeholder={metaAtual > 0 ? metaAtual.toFixed(2) : "Ex: 50000.00"}
                  value={metaInput}
                  onChange={e => setMetaInput(e.target.value)}
                  className="max-w-[200px] h-9 text-sm"
                />
                <Button
                  size="sm"
                  className="gap-2 h-9"
                  disabled={!metaInput || salvarMetaMut.isPending}
                  onClick={() => {
                    const val = parseFloat(metaInput);
                    if (isNaN(val) || val < 0) { toast.error("Valor inválido"); return; }
                    salvarMetaMut.mutate({ ano, mes, meta: val });
                  }}
                >
                  <Save className="w-4 h-4" />
                  {salvarMetaMut.isPending ? "Salvando..." : "Salvar Meta"}
                </Button>
              </div>
            </div>

            {/* ── Histórico de Rankings ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                Histórico de Rankings
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Salve um snapshot do ranking do mês selecionado. Isso congela os dados atuais para consulta histórica e envia uma notificação com o resultado. O sistema também faz isso automaticamente no último dia de cada mês.
              </p>
              <Button
                size="sm"
                className="gap-2"
                disabled={salvarSnapshotMut.isPending}
                onClick={() => salvarSnapshotMut.mutate({ ano, mes })}
              >
                <Trophy className="w-4 h-4" />
                {salvarSnapshotMut.isPending ? "Salvando..." : `Salvar Ranking de ${mes}/${ano}`}
              </Button>
            </div>

            {/* ── Dashboard Financeiro do Mês ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Dashboard Financeiro — {MESES[mes-1]} {ano}
              </h3>
              {dashFinanceiro ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border bg-blue-50 border-blue-200">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Coletado</p>
                      <p className="text-lg font-bold text-blue-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dashFinanceiro.totalColetado || 0)}</p>
                      <p className="text-xs text-blue-500">{dashFinanceiro.totalVendas || 0} vendas</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-indigo-50 border-indigo-200">
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Faturado</p>
                      <p className="text-lg font-bold text-indigo-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dashFinanceiro.totalFaturado || 0)}</p>
                      <p className="text-xs text-indigo-500">Total contratado</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-orange-50 border-orange-200">
                      <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-1">Custos Operação</p>
                      <p className="text-lg font-bold text-orange-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((dashFinanceiro.totalCustosServicos || 0) + (dashFinanceiro.salarioFixo || 0) + (dashFinanceiro.totalComissoes || 0))}</p>
                      <p className="text-xs text-orange-500">Serviços + Salário</p>
                    </div>
                    <div className={`p-3 rounded-lg border ${(dashFinanceiro.liquido || 0) >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${(dashFinanceiro.liquido || 0) >= 0 ? "text-emerald-600" : "text-red-600"}`}>Líquido</p>
                      <p className={`text-lg font-bold ${(dashFinanceiro.liquido || 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dashFinanceiro.liquido || 0)}</p>
                      <p className="text-xs text-gray-400">Coletado - Custos</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg border bg-indigo-50 border-indigo-200 text-center">
                      <p className="text-xs font-semibold text-indigo-600 mb-1">Limpa Nome</p>
                      <p className="text-2xl font-bold text-indigo-700">{dashFinanceiro.qtdLimpaName || 0}</p>
                      <p className="text-xs text-indigo-500">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((dashFinanceiro.qtdLimpaName || 0) * (custosServicos?.custo_limpa_nome || 70))}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-violet-50 border-violet-200 text-center">
                      <p className="text-xs font-semibold text-violet-600 mb-1">Rating Bancário</p>
                      <p className="text-2xl font-bold text-violet-700">{dashFinanceiro.qtdRating || 0}</p>
                      <p className="text-xs text-violet-500">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format((dashFinanceiro.qtdRating || 0) * (custosServicos?.custo_rating || 110))}</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 text-center">
                      <p className="text-xs font-semibold text-amber-600 mb-1">Comissões Pagas</p>
                      <p className="text-lg font-bold text-amber-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(dashFinanceiro.totalComissoes || 0)}</p>
                      <p className="text-xs text-amber-500">10% do coletado</p>
                    </div>
                    <div className="p-3 rounded-lg border bg-rose-50 border-rose-200 text-center">
                      <p className="text-xs font-semibold text-rose-600 mb-1">Salário Fixo</p>
                      <p className="text-lg font-bold text-rose-700">{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(custosServicos?.salario_fixo || 1600)}</p>
                      <p className="text-xs text-rose-500">Custo fixo mensal</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Carregando dados financeiros...</p>
              )}
            </div>

            {/* ── Custos de Serviços ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Custos de Serviços
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Defina os custos por serviço e o salário fixo. Esses valores são descontados do coletado para calcular o líquido da operação.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Custo Limpa Nome (R$)</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" step="1" placeholder={String(custosServicos?.custo_limpa_nome ?? 70)} value={custoLimpaInput} onChange={e => setCustoLimpaInput(e.target.value)} className="h-8 text-sm" />
                    <Button size="sm" className="h-8 px-3" disabled={!custoLimpaInput || setCustoMut.isPending} onClick={() => { const v = parseFloat(custoLimpaInput); if (!isNaN(v)) { setCustoMut.mutate({ chave: "custo_limpa_nome", valor: v }); setCustoLimpaInput(""); } }}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Atual: R$ {custosServicos?.custo_limpa_nome ?? 70}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Custo Rating Bancário (R$)</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" step="1" placeholder={String(custosServicos?.custo_rating ?? 110)} value={custoRatingInput} onChange={e => setCustoRatingInput(e.target.value)} className="h-8 text-sm" />
                    <Button size="sm" className="h-8 px-3" disabled={!custoRatingInput || setCustoMut.isPending} onClick={() => { const v = parseFloat(custoRatingInput); if (!isNaN(v)) { setCustoMut.mutate({ chave: "custo_rating", valor: v }); setCustoRatingInput(""); } }}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Atual: R$ {custosServicos?.custo_rating ?? 110}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Salário Fixo (R$)</Label>
                  <div className="flex gap-2">
                    <Input type="number" min="0" step="100" placeholder={String(custosServicos?.salario_fixo ?? 1600)} value={custoSalarioInput} onChange={e => setCustoSalarioInput(e.target.value)} className="h-8 text-sm" />
                    <Button size="sm" className="h-8 px-3" disabled={!custoSalarioInput || setCustoMut.isPending} onClick={() => { const v = parseFloat(custoSalarioInput); if (!isNaN(v)) { setCustoMut.mutate({ chave: "salario_fixo", valor: v }); setCustoSalarioInput(""); } }}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Atual: R$ {custosServicos?.salario_fixo ?? 1600}</p>
                </div>
              </div>
            </div>

            {/* ── Notificações ao Proprietário ── */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                Notificações ao Proprietário
              </h3>
              <div className="flex gap-3 flex-wrap">
                <Button
                  size="sm"
                  className="gap-2"
                  disabled={notifyMut.isPending}
                  onClick={() => notifyMut.mutate({
                    title: "Relatório Mensal",
                    content: `Relatório do mês ${mes}/${ano} disponível no sistema.`,
                  })}
                >
                  <Bell className="w-4 h-4" />
                  {notifyMut.isPending ? "Enviando..." : "Enviar Relatório Mensal"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={notifyMut.isPending}
                  onClick={() => notifyMut.mutate({
                    title: "Teste de Notificação",
                    content: "Notificação de teste enviada com sucesso.",
                  })}
                >
                  Testar Notificação
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Acesso restrito a administradores</p>
            </div>
          </div>
        )}

        {/* ── Meu Perfil (para todos) ── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Meu Perfil
          </h3>
          <div className="flex items-start gap-6 flex-wrap">
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={user?.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary/90 transition-colors shadow-lg"
                  disabled={uploading}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
              </div>
              <p className="text-xs text-muted-foreground">Clique para alterar</p>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Nome</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">{user?.name || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="text-sm text-foreground mt-0.5">{user?.email || "—"}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Função</Label>
                <div className="mt-0.5">
                  <Badge className={user?.role === "admin" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}>
                    {user?.role === "admin" ? "Administrador" : "Usuário"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Informações do Sistema ── */}
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Informações do Sistema
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Sistema</span>
              <span className="font-medium text-foreground">Life Solutions Dashboard</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-border/50">
              <span className="text-muted-foreground">Versão</span>
              <span className="font-medium text-foreground">1.0.0</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-muted-foreground">Ambiente</span>
              <Badge className="bg-primary/10 text-primary text-xs">Produção</Badge>
            </div>
          </div>
        </div>
      </div>
    </LifeDashboardLayout>
  );
}
