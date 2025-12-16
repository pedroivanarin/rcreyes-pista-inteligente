import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pencil, User, Shield, Plus, Loader2, Trash2, Key, Search, Users } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { EmptyState } from '@/components/ui/empty-state';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import type { AppRole } from '@/types/database';
import { z } from 'zod';
import { Separator } from '@/components/ui/separator';
import { passwordSchema, validatePassword, PASSWORD_REQUIREMENTS } from '@/lib/passwordValidation';

const newUserSchema = z.object({
  nombre: z.string().trim().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }).max(100),
  email: z.string().trim().email({ message: 'Correo electrónico inválido' }),
  password: passwordSchema,
});

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('operador');
  const [isActive, setIsActive] = useState(true);
  
  // New user form state
  const [newNombre, setNewNombre] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('operador');
  const [isCreating, setIsCreating] = useState(false);
  
  // Delete user state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  
  // Password change state
  const [newPasswordForEdit, setNewPasswordForEdit] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

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

  // Filter logic
  const filteredUsuarios = usuarios?.filter(usuario => {
    const matchesSearch = 
      usuario.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'todos' || usuario.role === filterRole;
    const matchesEstado = filterEstado === 'todos' || 
      (filterEstado === 'activo' && usuario.activo) ||
      (filterEstado === 'inactivo' && !usuario.activo);
    
    return matchesSearch && matchesRole && matchesEstado;
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
    setNewPasswordForEdit('');
    setIsDialogOpen(true);
  };

  const handleChangePassword = async () => {
    if (!editingUser || !newPasswordForEdit) return;

    const passwordError = validatePassword(newPasswordForEdit);
    if (passwordError) {
      toast({
        title: 'Error',
        description: passwordError,
        variant: 'destructive',
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-password', {
        body: {
          userId: editingUser.id,
          newPassword: newPasswordForEdit,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setNewPasswordForEdit('');
      toast({
        title: 'Contraseña actualizada',
        description: `Se ha cambiado la contraseña de ${editingUser.nombre}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cambiar la contraseña.',
        variant: 'destructive',
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const openCreateDialog = () => {
    setNewNombre('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('operador');
    setIsCreateDialogOpen(true);
  };

  const handleCreateUser = async () => {
    const validation = newUserSchema.safeParse({
      nombre: newNombre,
      email: newEmail,
      password: newPassword,
    });

    if (!validation.success) {
      toast({
        title: 'Error de validación',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newEmail,
          password: newPassword,
          nombre: newNombre,
          role: newRole,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setIsCreateDialogOpen(false);
      
      toast({
        title: 'Usuario creado',
        description: `Se ha creado el usuario ${newNombre} exitosamente.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el usuario.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
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

  const openDeleteDialog = (usuario: UserWithRole) => {
    setUserToDelete(usuario);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: userToDelete.id },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      
      toast({
        title: 'Usuario eliminado',
        description: `Se ha eliminado el usuario ${userToDelete.nombre}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el usuario.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Usuarios</h1>
            <p className="text-muted-foreground">Administra los usuarios y sus permisos</p>
          </div>
          <Button onClick={openCreateDialog} className="touch-button">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Usuario
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[140px] touch-target">
                <SelectValue placeholder="Rol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los roles</SelectItem>
                <SelectItem value="operador">Operador</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[120px] touch-target">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="activo">Activos</SelectItem>
                <SelectItem value="inactivo">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : filteredUsuarios?.length === 0 ? (
          usuarios?.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No hay usuarios registrados"
              description="Crea el primer usuario para comenzar."
              actionLabel="Crear Usuario"
              onAction={openCreateDialog}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No se encontraron usuarios con los filtros seleccionados."
            />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredUsuarios?.map((usuario) => (
              <Card key={usuario.id} className={!usuario.activo ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{usuario.nombre}</CardTitle>
                    </div>
                    {usuario.id !== user?.id && (
                      <div className="flex gap-1">
                        <ActionTooltip label="Editar usuario">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(usuario)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </ActionTooltip>
                        <ActionTooltip label="Eliminar usuario">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDeleteDialog(usuario)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ActionTooltip>
                      </div>
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

                <Separator className="my-4" />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-muted-foreground" />
                    <label className="text-sm font-medium">Cambiar Contraseña</label>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="Nueva contraseña"
                      value={newPasswordForEdit}
                      onChange={(e) => setNewPasswordForEdit(e.target.value)}
                      className="flex-1 touch-target"
                    />
                    <Button 
                      onClick={handleChangePassword}
                      disabled={isChangingPassword || !newPasswordForEdit}
                      variant="secondary"
                    >
                      {isChangingPassword ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Cambiar'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create User Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Usuario</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-nombre">Nombre completo</Label>
                <Input
                  id="new-nombre"
                  type="text"
                  placeholder="Nombre del usuario"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  className="touch-target"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-email">Correo electrónico</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="touch-target"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-password">Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mín. 8 caracteres, mayúscula, minúscula, número"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="touch-target"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Rol</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
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
              
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)} 
                  className="flex-1"
                  disabled={isCreating}
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateUser} 
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Crear Usuario'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente al usuario <strong>{userToDelete?.nombre}</strong> ({userToDelete?.email}). 
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
