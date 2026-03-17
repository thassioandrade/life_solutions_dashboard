import { useState, useRef } from "react";
import LifeDashboardLayout from "@/components/LifeDashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Users, Shield, Camera, Save, Settings } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Configuracoes() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: usuarios, refetch: refetchUsers } = trpc.usuarios.list.useQuery(undefined, { enabled: user?.role === "admin" });

  const updateRoleMutation = trpc.usuarios.updateRole.useMutation({
    onSuccess: () => { toast.success("Role atualizado!"); refetchUsers(); },
    onError: (e) => toast.error(e.message),
  });
  const updateAvatarMutation = trpc.usuarios.updateAvatar.useMutation({
    onSuccess: () => { toast.success("Foto atualizada!"); },
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
        await updateAvatarMutation.mutateAsync({ avatarBase64: base64, mimeType: file.type });
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  const getInitials = (name?: string | null) => {
    if (!name) return "LS";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <LifeDashboardLayout title="Configurações">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Configurações</h2>
          <p className="text-sm text-gray-500">Gerencie seu perfil e configurações do sistema</p>
        </div>

        {/* Profile card */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="w-4 h-4 text-green-600" />
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6 flex-wrap">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-green-100 text-green-700 text-xl font-bold">{getInitials(user?.name)}</AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="absolute bottom-0 right-0 w-7 h-7 bg-green-600 rounded-full flex items-center justify-center text-white hover:bg-green-700 transition-colors shadow-lg"
                    disabled={uploading}
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </div>
                <p className="text-xs text-gray-400">Clique para alterar</p>
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <Label className="text-xs text-gray-500">Nome</Label>
                  <p className="text-sm font-medium text-gray-800 mt-0.5">{user?.name || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Email</Label>
                  <p className="text-sm text-gray-700 mt-0.5">{user?.email || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Função</Label>
                  <div className="mt-0.5">
                    <Badge className={user?.role === "admin" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {user?.role === "admin" ? "Administrador" : "Usuário"}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users management (admin only) */}
        {user?.role === "admin" && (
          <Card className="border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-600" />
                Gerenciamento de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!usuarios || usuarios.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhum usuário cadastrado</div>
              ) : (
                <div className="space-y-2">
                  {usuarios.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={u.avatarUrl || undefined} />
                          <AvatarFallback className="bg-green-100 text-green-700 text-xs">{getInitials(u.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{u.name || "Sem nome"}</p>
                          <p className="text-xs text-gray-400">{u.email || u.openId}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={u.role === "admin" ? "bg-green-100 text-green-700 text-xs" : "bg-gray-100 text-gray-600 text-xs"}>
                          {u.role === "admin" ? "Admin" : "User"}
                        </Badge>
                        {u.id !== user.id && (
                          <Select
                            value={u.role}
                            onValueChange={(v) => updateRoleMutation.mutate({ userId: u.id, role: v as "user" | "admin" })}
                          >
                            <SelectTrigger className="h-7 text-xs w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Usuário</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System info */}
        <Card className="border-gray-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Settings className="w-4 h-4 text-green-600" />
              Informações do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Sistema</span>
                <span className="font-medium text-gray-700">Life Solutions Dashboard</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-50">
                <span className="text-gray-500">Versão</span>
                <span className="font-medium text-gray-700">1.0.0</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-500">Ambiente</span>
                <Badge className="bg-green-100 text-green-700 text-xs">Produção</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </LifeDashboardLayout>
  );
}
