import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, User, Plus, Loader2, Trash2, Search, Crown, Percent, Users } from 'lucide-react';
import { CardSkeletonGrid } from '@/components/ui/card-skeleton';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import type { TipoMembresia } from '@/types/database';
import { MEMBRESIA_CONFIG } from '@/lib/constants';
import { z } from 'zod';

const clienteSchema = z.object({
  nombre: z.string().trim().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }).max(100),
  telefono: z.string().trim().max(20).optional(),
});

interface ClienteWithMembresia {
  id: string;
  codigo_cliente: string;
  nombre: string;
  telefono: string | null;
  membresia: TipoMembresia;
  descuento_porcentaje: number;
  created_at: string;
}


export default function Clientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 12;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<ClienteWithMembresia | null>(null);
  const [clienteToDelete, setClienteToDelete] = useState<ClienteWithMembresia | null>(null);
  
  // Edit form state
  const [editNombre, setEditNombre] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editMembresia, setEditMembresia] = useState<TipoMembresia>('ninguna');
  
  // Create form state
  const [newNombre, setNewNombre] = useState('');
  const [newTelefono, setNewTelefono] = useState('');
  const [newMembresia, setNewMembresia] = useState<TipoMembresia>('ninguna');
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filter state
  const [filterMembresia, setFilterMembresia] = useState<string>('todos');

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, codigo_cliente, nombre, telefono, membresia, descuento_porcentaje, created_at')
        .order('nombre');
      
      if (error) throw error;
      return (data || []) as ClienteWithMembresia[];
    },
  });

  const updateClienteMutation = useMutation({
    mutationFn: async ({ id, nombre, telefono, membresia, descuento }: { 
      id: string; 
      nombre: string; 
      telefono: string | null;
      membresia: TipoMembresia;
      descuento: number;
    }) => {
      const { error } = await supabase
        .from('clientes')
        .update({ 
          nombre, 
          telefono,
          membresia,
          descuento_porcentaje: descuento,
          tipo_cliente: membresia === 'ninguna' ? 'regular' : 'miembro',
        })
        .eq('id', id);
      if (error) throw error;
    },
  });

  const deleteClienteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
  });

  const filteredClientes = clientes?.filter(cliente => {
    const matchesSearch = 
      cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.codigo_cliente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cliente.telefono?.includes(searchTerm);
    
    const matchesMembresia = filterMembresia === 'todos' || cliente.membresia === filterMembresia;
    
    return matchesSearch && matchesMembresia;
  });
  
  // Handler para cambio de filtro
  const handleFilterChange = (value: string) => {
    setFilterMembresia(value);
    setCurrentPage(1);
  };

  // Paginación
  const totalItems = filteredClientes?.length || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedClientes = filteredClientes?.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset página cuando cambia búsqueda
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const openEdit = (cliente: ClienteWithMembresia) => {
    setEditingCliente(cliente);
    setEditNombre(cliente.nombre);
    setEditTelefono(cliente.telefono || '');
    setEditMembresia(cliente.membresia || 'ninguna');
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editingCliente) return;

    const validation = clienteSchema.safeParse({
      nombre: editNombre,
      telefono: editTelefono,
    });

    if (!validation.success) {
      toast({
        title: 'Error de validación',
        description: validation.error.errors[0].message,
        variant: 'destructive',
      });
      return;
    }

    try {
      await updateClienteMutation.mutateAsync({
        id: editingCliente.id,
        nombre: editNombre.trim(),
        telefono: editTelefono.trim() || null,
        membresia: editMembresia,
        descuento: MEMBRESIA_CONFIG[editMembresia].descuento,
      });

      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setIsDialogOpen(false);
      setEditingCliente(null);
      
      toast({
        title: 'Cliente actualizado',
        description: 'Los cambios han sido guardados.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el cliente.',
        variant: 'destructive',
      });
    }
  };

  const openCreateDialog = () => {
    setNewNombre('');
    setNewTelefono('');
    setNewMembresia('ninguna');
    setIsCreateDialogOpen(true);
  };

  const handleCreateCliente = async () => {
    const validation = clienteSchema.safeParse({
      nombre: newNombre,
      telefono: newTelefono,
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
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: newNombre.trim(),
          telefono: newTelefono.trim() || null,
          membresia: newMembresia,
          descuento_porcentaje: MEMBRESIA_CONFIG[newMembresia].descuento,
          tipo_cliente: newMembresia === 'ninguna' ? 'regular' : 'miembro',
        })
        .select('codigo_cliente')
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setIsCreateDialogOpen(false);
      
      toast({
        title: 'Cliente registrado',
        description: `Código asignado: ${data.codigo_cliente}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const openDeleteDialog = (cliente: ClienteWithMembresia) => {
    setClienteToDelete(cliente);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCliente = async () => {
    if (!clienteToDelete) return;

    setIsDeleting(true);
    try {
      await deleteClienteMutation.mutateAsync(clienteToDelete.id);
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      setDeleteDialogOpen(false);
      setClienteToDelete(null);
      
      toast({
        title: 'Cliente eliminado',
        description: `Se ha eliminado al cliente ${clienteToDelete.nombre}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el cliente. Puede tener tickets asociados.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">Administra clientes y membresías</p>
          </div>
          <Button onClick={openCreateDialog} className="touch-button">
            <Plus className="h-5 w-5 mr-2" />
            Nuevo Cliente
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o teléfono..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
          <Select value={filterMembresia} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[160px] touch-target">
              <SelectValue placeholder="Membresía" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las membresías</SelectItem>
              <SelectItem value="ninguna">Sin membresía</SelectItem>
              <SelectItem value="basica">Básica</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && filteredClientes && (
          <p className="text-sm text-muted-foreground">
            {filteredClientes.length} {filteredClientes.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
          </p>
        )}

        {isLoading ? (
          <CardSkeletonGrid count={6} />
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedClientes?.map((cliente) => (
                <Card key={cliente.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">{cliente.nombre}</CardTitle>
                          <p className="text-sm font-mono text-muted-foreground">{cliente.codigo_cliente}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <ActionTooltip label="Editar cliente">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(cliente)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </ActionTooltip>
                        <ActionTooltip label="Eliminar cliente">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDeleteDialog(cliente)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ActionTooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {cliente.telefono && (
                      <p className="text-sm text-muted-foreground">{cliente.telefono}</p>
                    )}
                    <div className="flex items-center gap-2">
                      <Badge variant={MEMBRESIA_CONFIG[cliente.membresia || 'ninguna'].variant}>
                        {cliente.membresia !== 'ninguna' && <Crown className="h-3 w-3 mr-1" />}
                        {MEMBRESIA_CONFIG[cliente.membresia || 'ninguna'].label}
                      </Badge>
                      {cliente.descuento_porcentaje > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Percent className="h-3 w-3" />
                          {cliente.descuento_porcentaje}%
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {paginatedClientes?.length === 0 && (
                clientes?.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No hay clientes registrados"
                    description="Comienza agregando tu primer cliente para gestionar sus visitas y membresías."
                    actionLabel="Agregar Cliente"
                    onAction={openCreateDialog}
                  />
                ) : (
                  <EmptyState
                    icon={Search}
                    title="Sin resultados"
                    description="No se encontraron clientes con los filtros seleccionados."
                  />
                )
              )}
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)} de {totalItems} clientes
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          className="w-9"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            {editingCliente && (
              <div className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Código de cliente</p>
                  <p className="font-mono font-bold">{editingCliente.codigo_cliente}</p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-nombre">Nombre</Label>
                  <Input
                    id="edit-nombre"
                    value={editNombre}
                    onChange={(e) => setEditNombre(e.target.value)}
                    className="touch-target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit-telefono">Teléfono</Label>
                  <Input
                    id="edit-telefono"
                    value={editTelefono}
                    onChange={(e) => setEditTelefono(e.target.value)}
                    placeholder="Opcional"
                    className="touch-target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Membresía</Label>
                  <Select value={editMembresia} onValueChange={(v) => setEditMembresia(v as TipoMembresia)}>
                    <SelectTrigger className="touch-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ninguna">Sin membresía (0%)</SelectItem>
                      <SelectItem value="basica">Básica (5% descuento)</SelectItem>
                      <SelectItem value="premium">Premium (10% descuento)</SelectItem>
                      <SelectItem value="vip">VIP (15% descuento)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={updateClienteMutation.isPending}
                    className="flex-1"
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-nombre">Nombre completo *</Label>
                <Input
                  id="new-nombre"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="touch-target"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-telefono">Teléfono</Label>
                <Input
                  id="new-telefono"
                  value={newTelefono}
                  onChange={(e) => setNewTelefono(e.target.value)}
                  placeholder="Opcional"
                  className="touch-target"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Membresía</Label>
                <Select value={newMembresia} onValueChange={(v) => setNewMembresia(v as TipoMembresia)}>
                  <SelectTrigger className="touch-target">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">Sin membresía (0%)</SelectItem>
                    <SelectItem value="basica">Básica (5% descuento)</SelectItem>
                    <SelectItem value="premium">Premium (10% descuento)</SelectItem>
                    <SelectItem value="vip">VIP (15% descuento)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <p className="text-sm text-muted-foreground">
                Se asignará automáticamente un código único al cliente.
              </p>
              
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
                  onClick={handleCreateCliente} 
                  disabled={isCreating}
                  className="flex-1"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    'Registrar Cliente'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará permanentemente al cliente <strong>{clienteToDelete?.nombre}</strong> ({clienteToDelete?.codigo_cliente}). 
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteCliente}
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
