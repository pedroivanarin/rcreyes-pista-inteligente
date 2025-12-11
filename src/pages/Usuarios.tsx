import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, User, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import type { AppRole } from '@/types/database';

interface UserWithRole {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  role: AppRole;
}

export default function Usuarios() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('operador');
  const [isActive, setIsActive] = useState(true);

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('nombre');
      
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');
      
      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = profiles.map(profile => {
        const userRole = roles.find(r => r.user_id === profile.id);
        return {
          id: profile.id,
          nombre: profile.nombre,
          email: profile.email,
          activo: profile.activo,
          role: userRole?.role || 'operador',
        };
      });

      return usersWithRoles;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ userId, activo }: { userId: string; activo: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ activo })
        .eq('id', userId);
      if (error) throw error;
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', userId);
      if (error) throw error;
    },
  });

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      await Promise.all([
        updateProfileMutation.mutateAsync({ userId: editingUser.id, activo: isActive }),
        updateRoleMutation.mutateAsync({ userId: editingUser.id, role: selectedRole }),
      ]);

      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setIsDialogOpen(false);
      setEditingUser(null);
      
      toast({
        title: 'Usuario actualizado',
        description: 'Los cambios han sido guardados.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el usuario.',
        variant: 'destructive',
      });
      console.error(error);
    }
  };

  const openEdit = (usuario: UserWithRole) => {
    setEditingUser(usuario);
    setSelectedRole(usuario.role);
    setIsActive(usuario.activo);
    setIsDialogOpen(true);
  };

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'root': return 'destructive';
      case 'admin': return 'default';
      case 'supervisor': return 'secondary';
      default: return 'outline';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    switch (role) {
      case 'root': return 'Root';
      case 'admin': return 'Administrador';
      case 'supervisor': return 'Supervisor';
      default: return 'Operador';
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Usuarios</h1>
          <p className="text-muted-foreground">Administra los usuarios y sus permisos</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {usuarios?.map((usuario) => (
              <Card key={usuario.id} className={!usuario.activo ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{usuario.nombre}</CardTitle>
                    </div>
                    {usuario.id !== user?.id && (
                      <Button variant="ghost" size="icon" onClick={() => openEdit(usuario)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">{usuario.email}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(usuario.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleLabel(usuario.role)}
                    </Badge>
                    {!usuario.activo && (
                      <Badge variant="secondary">Inactivo</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Usuario</DialogTitle>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{editingUser.nombre}</p>
                  <p className="text-sm text-muted-foreground">{editingUser.email}</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol</label>
                  <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="operador">Operador</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Usuario Activo</label>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={updateProfileMutation.isPending || updateRoleMutation.isPending}
                    className="flex-1"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
