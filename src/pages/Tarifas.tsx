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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Clock, Search, Trash2 } from 'lucide-react';
import { CardSkeletonGrid } from '@/components/ui/card-skeleton';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import type { TarifaHora, TipoRedondeo } from '@/types/database';

export default function Tarifas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState<TarifaHora | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tarifaToDelete, setTarifaToDelete] = useState<TarifaHora | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: tarifas, isLoading } = useQuery({
    queryKey: ['tarifas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tarifas_hora')
        .select('*')
        .order('nombre');
      if (error) throw error;
      return data as TarifaHora[];
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: Partial<TarifaHora>) => {
      if (editingTarifa) {
        const { error } = await supabase
          .from('tarifas_hora')
          .update(data)
          .eq('id', editingTarifa.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tarifas_hora')
          .insert([data as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifas'] });
      setIsDialogOpen(false);
      setEditingTarifa(null);
      toast({
        title: editingTarifa ? 'Tarifa actualizada' : 'Tarifa creada',
        description: 'Los cambios han sido guardados.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo guardar la tarifa.',
        variant: 'destructive',
      });
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tarifas_hora')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarifas'] });
      setDeleteDialogOpen(false);
      setTarifaToDelete(null);
      toast({
        title: 'Tarifa eliminada',
        description: 'La tarifa ha sido eliminada.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar la tarifa. Puede tener tickets asociados.',
        variant: 'destructive',
      });
    },
  });

  // Filter logic
  const filteredTarifas = tarifas?.filter(tarifa => {
    const matchesSearch = tarifa.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado = filterEstado === 'todos' || 
      (filterEstado === 'activo' && tarifa.activo) ||
      (filterEstado === 'inactivo' && !tarifa.activo);
    
    return matchesSearch && matchesEstado;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      nombre: formData.get('nombre') as string,
      precio_por_hora: parseFloat(formData.get('precio_por_hora') as string),
      minutos_minimos: parseInt(formData.get('minutos_minimos') as string),
      tipo_redondeo: formData.get('tipo_redondeo') as TipoRedondeo,
      activo: formData.get('activo') === 'on',
    });
  };

  const openEdit = (tarifa: TarifaHora) => {
    setEditingTarifa(tarifa);
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingTarifa(null);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (tarifa: TarifaHora) => {
    setTarifaToDelete(tarifa);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!tarifaToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(tarifaToDelete.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tarifas por Hora</h1>
            <p className="text-muted-foreground">Administra las tarifas de tiempo de pista</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="touch-button">
                <Plus className="h-5 w-5 mr-2" />
                Nueva Tarifa
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingTarifa ? 'Editar Tarifa' : 'Nueva Tarifa'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input 
                    id="nombre" 
                    name="nombre" 
                    defaultValue={editingTarifa?.nombre}
                    required 
                    className="touch-target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="precio_por_hora">Precio por Hora *</Label>
                  <Input 
                    id="precio_por_hora" 
                    name="precio_por_hora" 
                    type="number" 
                    step="0.01"
                    defaultValue={editingTarifa?.precio_por_hora}
                    required 
                    className="touch-target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="minutos_minimos">Minutos Mínimos *</Label>
                  <Input 
                    id="minutos_minimos" 
                    name="minutos_minimos" 
                    type="number"
                    defaultValue={editingTarifa?.minutos_minimos || 10}
                    required 
                    className="touch-target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tipo_redondeo">Tipo de Redondeo</Label>
                  <Select name="tipo_redondeo" defaultValue={editingTarifa?.tipo_redondeo || 'arriba'}>
                    <SelectTrigger className="touch-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="arriba">Hacia Arriba</SelectItem>
                      <SelectItem value="abajo">Hacia Abajo</SelectItem>
                      <SelectItem value="estandar">Estándar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="activo">Activo</Label>
                  <Switch 
                    id="activo" 
                    name="activo"
                    defaultChecked={editingTarifa?.activo ?? true}
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={mutation.isPending} className="flex-1">
                    {mutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-[130px] touch-target">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="activo">Activas</SelectItem>
              <SelectItem value="inactivo">Inactivas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        {!isLoading && filteredTarifas && (
          <p className="text-sm text-muted-foreground">
            {filteredTarifas.length} {filteredTarifas.length === 1 ? 'tarifa encontrada' : 'tarifas encontradas'}
          </p>
        )}

        {isLoading ? (
          <CardSkeletonGrid count={3} />
        ) : filteredTarifas?.length === 0 ? (
          tarifas?.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No hay tarifas configuradas"
              description="Configura tu primera tarifa para comenzar a cobrar tiempo de pista a los clientes."
              actionLabel="Agregar Tarifa"
              onAction={openNew}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No se encontraron tarifas con los filtros seleccionados."
            />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTarifas?.map((tarifa) => (
              <Card key={tarifa.id} className={!tarifa.activo ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{tarifa.nombre}</CardTitle>
                    </div>
                    <div className="flex gap-1">
                      <ActionTooltip label="Editar tarifa">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(tarifa)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </ActionTooltip>
                      <ActionTooltip label="Eliminar tarifa">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openDeleteDialog(tarifa)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ActionTooltip>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">${tarifa.precio_por_hora.toFixed(2)}/hr</span>
                    <Badge variant={tarifa.activo ? 'default' : 'secondary'}>
                      {tarifa.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Mínimo: {tarifa.minutos_minimos} minutos</p>
                    <p>Redondeo: {tarifa.tipo_redondeo}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar tarifa?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará la tarifa "{tarifaToDelete?.nombre}" permanentemente. 
                No se puede deshacer. Si la tarifa tiene tickets asociados, no podrá ser eliminada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
