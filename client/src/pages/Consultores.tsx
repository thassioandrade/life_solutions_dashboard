import { useState } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Key, Users, Link as LinkIcon, Mail, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Consultores() {
  const { data: consultores, refetch } = trpc.consultores.list.useQuery();
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState<number | null>(null);
  const [openSenha, setOpenSenha] = useState<number | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", linkAgenda: "" });
  const [senhaForm, setSenhaForm] = useState({ senha: "", confirmar: "" });

  const createMutation = trpc.consultores.create.useMutation({
    onSuccess: () => { toast.success("Consultor criado!"); setOpenCreate(false); setForm({ nome: "", email: "", linkAgenda: "" }); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.consultores.update.useMutation({
    onSuccess: () => { toast.success("Atualizado!"); setOpenEdit(null); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const deleteMutation = trpc.consultores.delete.useMutation({
    onSuccess: () => { toast.success("Removido!"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const senhaMutation = trpc.consultores.setSenha.useMutation({
    onSuccess: () => { toast.success("Senha definida!"); setOpenSenha(null); setSenhaForm({ senha: "", confirmar: "" }); },
    onError: (e) => toast.error(e.message),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome) { toast.error("Nome obrigatório"); return; }
    createMutation.mutate(form);
  };

  const handleSenha = (id: number) => {
    if (senhaForm.senha !== senhaForm.confirmar) { toast.error("Senhas não conferem"); return; }
    if (senhaForm.senha.length < 4) { toast.error("Senha muito curta"); return; }
    senhaMutation.mutate({ id, senha: senhaForm.senha });
  };

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <LifeDashboardLayout title="Consultores">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Consultores</h2>
            <p className="text-sm text-gray-500">{consultores?.length || 0} consultor(es) cadastrado(s)</p>
          </div>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                <Plus className="w-4 h-4 mr-1" /> Novo Consultor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Consultor</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <Label>Nome *</Label>
                  <Input placeholder="Nome completo" value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                  <Label>Link da Agenda</Label>
                  <Input placeholder="https://calendly.com/..." value={form.linkAgenda} onChange={e => setForm({ ...form, linkAgenda: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpenCreate(false)} className="flex-1">Cancelar</Button>
                  <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={createMutation.isPending}>Criar</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {!consultores || consultores.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum consultor cadastrado</p>
            <p className="text-sm mt-1">Clique em "Novo Consultor" para começar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {consultores.map((c) => (
              <Card key={c.id} className="border-gray-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={c.fotoUrl || undefined} />
                      <AvatarFallback className="bg-green-100 text-green-700 font-semibold">{getInitials(c.nome)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-gray-800 truncate">{c.nome}</p>
                        <Badge variant={c.ativo ? "default" : "secondary"} className={c.ativo ? "bg-green-100 text-green-700 text-[10px]" : "text-[10px]"}>
                          {c.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Mail className="w-3 h-3 text-gray-400" />
                          <p className="text-xs text-gray-500 truncate">{c.email}</p>
                        </div>
                      )}
                      {c.linkAgenda && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <LinkIcon className="w-3 h-3 text-blue-400" />
                          <a href={c.linkAgenda} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline truncate">Agenda</a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100">
                    {/* Edit */}
                    <Dialog open={openEdit === c.id} onOpenChange={(o) => setOpenEdit(o ? c.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 text-xs h-7">
                          <Edit2 className="w-3 h-3 mr-1" /> Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Editar Consultor</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Nome</Label>
                            <Input defaultValue={c.nome} id={`nome-${c.id}`} />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input type="email" defaultValue={c.email || ""} id={`email-${c.id}`} />
                          </div>
                          <div>
                            <Label>Link Agenda</Label>
                            <Input defaultValue={c.linkAgenda || ""} id={`link-${c.id}`} />
                          </div>
                          <div className="flex items-center gap-2">
                            <Label>Status</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateMutation.mutate({ id: c.id, ativo: !c.ativo })}
                              className={c.ativo ? "text-red-600 border-red-200" : "text-green-600 border-green-200"}
                            >
                              {c.ativo ? <><XCircle className="w-3 h-3 mr-1" />Desativar</> : <><CheckCircle className="w-3 h-3 mr-1" />Ativar</>}
                            </Button>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setOpenEdit(null)} className="flex-1">Cancelar</Button>
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                const nome = (document.getElementById(`nome-${c.id}`) as HTMLInputElement)?.value;
                                const email = (document.getElementById(`email-${c.id}`) as HTMLInputElement)?.value;
                                const linkAgenda = (document.getElementById(`link-${c.id}`) as HTMLInputElement)?.value;
                                updateMutation.mutate({ id: c.id, nome, email, linkAgenda });
                              }}
                            >Salvar</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Senha */}
                    <Dialog open={openSenha === c.id} onOpenChange={(o) => setOpenSenha(o ? c.id : null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-xs h-7 px-2">
                          <Key className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>Definir Senha — {c.nome}</DialogTitle></DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Nova Senha</Label>
                            <Input type="password" value={senhaForm.senha} onChange={e => setSenhaForm({ ...senhaForm, senha: e.target.value })} />
                          </div>
                          <div>
                            <Label>Confirmar Senha</Label>
                            <Input type="password" value={senhaForm.confirmar} onChange={e => setSenhaForm({ ...senhaForm, confirmar: e.target.value })} />
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setOpenSenha(null)} className="flex-1">Cancelar</Button>
                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSenha(c.id)} disabled={senhaMutation.isPending}>Salvar</Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Delete */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 border-red-200 hover:bg-red-50 text-xs h-7 px-2"
                      onClick={() => {
                        if (confirm(`Remover ${c.nome}?`)) deleteMutation.mutate({ id: c.id });
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </LifeDashboardLayout>
  );
}
