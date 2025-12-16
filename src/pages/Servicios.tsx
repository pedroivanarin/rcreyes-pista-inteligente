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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Plus, Pencil, Package, BatteryCharging, Car, CupSoda, Cookie, 
  Cpu, Wrench, ShoppingCart, Gamepad2, Timer, Zap, RotateCcw, Search, Trash2
} from 'lucide-react';
import { CardSkeletonGrid } from '@/components/ui/card-skeleton';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import { ActionTooltip } from '@/components/ui/action-tooltip';
import type { TipoCosto } from '@/types/database';

// Mapa de íconos disponibles
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'package': Package,
  'battery-charging': BatteryCharging,
  'car': Car,
  'cup-soda': CupSoda,
  'cookie': Cookie,
  'cpu': Cpu,
  'wrench': Wrench,
  'shopping-cart': ShoppingCart,
  'gamepad-2': Gamepad2,
  'timer': Timer,
  'zap': Zap,
};

const iconOptions = [
  { value: 'package', label: 'Paquete' },
  { value: 'battery-charging', label: 'Batería' },
  { value: 'car', label: 'Auto' },
  { value: 'cup-soda', label: 'Bebida' },
  { value: 'cookie', label: 'Snack' },
  { value: 'cpu', label: 'Máquina' },
  { value: 'wrench', label: 'Herramienta' },
  { value: 'shopping-cart', label: 'Carrito' },
  { value: 'gamepad-2', label: 'Control' },
  { value: 'timer', label: 'Tiempo' },
  { value: 'zap', label: 'Energía' },
];

interface Servicio {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  tipo_costo: TipoCosto;
  requiere_inventario: boolean;
  stock_actual: number | null;
  maximo_por_ticket: number | null;
  activo: boolean;
  icono: string | null;
}

export default function Servicios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Servicio | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');
  
  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Servicio | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: servicios, isLoading } = useQuery({
    queryKey: ['servicios'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .order('nombre');
      if (error) throw error;
      return data as Servicio[];
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: Partial<Servicio>) => {
      if (editingService) {
        const { error } = await supabase
          .from('servicios')
          .update(data)
          .eq('id', editingService.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('servicios')
          .insert([data as any]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      setIsDialogOpen(false);
      setEditingService(null);
      toast({
        title: editingService ? 'Servicio actualizado' : 'Servicio creado',
        description: 'Los cambios han sido guardados.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'No se pudo guardar el servicio.',
        variant: 'destructive',
      });
      console.error(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['servicios'] });
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
      toast({
        title: 'Servicio eliminado',
        description: 'El servicio ha sido eliminado.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el servicio. Puede tener tickets asociados.',
        variant: 'destructive',
      });
    },
  });

  // Filter logic
  const filteredServicios = servicios?.filter(servicio => {
    const matchesSearch = 
      servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      servicio.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = filterTipo === 'todos' || servicio.tipo_costo === filterTipo;
    const matchesEstado = filterEstado === 'todos' || 
      (filterEstado === 'activo' && servicio.activo) ||
      (filterEstado === 'inactivo' && !servicio.activo);
    
    return matchesSearch && matchesTipo && matchesEstado;
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      nombre: formData.get('nombre') as string,
      descripcion: formData.get('descripcion') as string || null,
      precio: parseFloat(formData.get('precio') as string),
      tipo_costo: formData.get('tipo_costo') as TipoCosto,
      icono: formData.get('icono') as string || 'package',
      requiere_inventario: formData.get('requiere_inventario') === 'on',
      stock_actual: parseInt(formData.get('stock_actual') as string) || null,
      maximo_por_ticket: parseInt(formData.get('maximo_por_ticket') as string) || null,
      activo: formData.get('activo') === 'on',
    });
  };

  const openEdit = (servicio: Servicio) => {
    setEditingService(servicio);
    setIsDialogOpen(true);
  };

  const openNew = () => {
    setEditingService(null);
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (servicio: Servicio) => {
    setServiceToDelete(servicio);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!serviceToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(serviceToDelete.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Servicios</h1>
            <p className="text-muted-foreground">Administra los servicios y productos disponibles</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="touch-button">
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingService ? 'Editar Servicio' : 'Nuevo Servicio'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input 
                    id="nombre" 
                    name="nombre" 
                    defaultValue={editingService?.nombre}
                    required 
                    className="touch-target"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción</Label>
                  <Textarea 
                    id="descripcion" 
                    name="descripcion" 
                    defaultValue={editingService?.descripcion || ''}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="precio">Precio *</Label>
                    <Input 
                      id="precio" 
                      name="precio" 
                      type="number" 
                      step="0.01"
                      defaultValue={editingService?.precio}
                      required 
                      className="touch-target"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tipo_costo">Tipo de Costo</Label>
                    <Select name="tipo_costo" defaultValue={editingService?.tipo_costo || 'fijo'}>
                      <SelectTrigger className="touch-target">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fijo">Fijo</SelectItem>
                        <SelectItem value="por_tiempo">Por Tiempo</SelectItem>
                        <SelectItem value="paquete">Paquete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icono">Ícono</Label>
                  <Select name="icono" defaultValue={editingService?.icono || 'package'}>
                    <SelectTrigger className="touch-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map((opt) => {
                        const IconComponent = iconMap[opt.value];
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              <span>{opt.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="requiere_inventario">Requiere Inventario (Renta)</Label>
                  <Switch 
                    id="requiere_inventario" 
                    name="requiere_inventario"
                    defaultChecked={editingService?.requiere_inventario}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="stock_actual">Stock Actual</Label>
                    <Input 
                      id="stock_actual" 
                      name="stock_actual" 
                      type="number"
                      defaultValue={editingService?.stock_actual || ''}
                      className="touch-target"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maximo_por_ticket">Máximo por Ticket</Label>
                    <Input 
                      id="maximo_por_ticket" 
                      name="maximo_por_ticket" 
                      type="number"
                      defaultValue={editingService?.maximo_por_ticket || ''}
                      className="touch-target"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="activo">Activo</Label>
                  <Switch 
                    id="activo" 
                    name="activo"
                    defaultChecked={editingService?.activo ?? true}
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
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 touch-target"
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[140px] touch-target">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="fijo">Fijo</SelectItem>
                <SelectItem value="por_tiempo">Por tiempo</SelectItem>
                <SelectItem value="paquete">Paquete</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[130px] touch-target">
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

        {/* Results count */}
        {!isLoading && filteredServicios && (
          <p className="text-sm text-muted-foreground">
            {filteredServicios.length} {filteredServicios.length === 1 ? 'servicio encontrado' : 'servicios encontrados'}
          </p>
        )}

        {isLoading ? (
          <CardSkeletonGrid count={6} />
        ) : filteredServicios?.length === 0 ? (
          servicios?.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No hay servicios configurados"
              description="Comienza agregando tu primer servicio o producto para ofrecerlo a los clientes."
              actionLabel="Agregar Servicio"
              onAction={openNew}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Sin resultados"
              description="No se encontraron servicios con los filtros seleccionados. Intenta ajustar tu búsqueda."
            />
          )
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredServicios?.map((servicio) => {
              const IconComponent = iconMap[servicio.icono || 'package'] || Package;
              return (
                <Card key={servicio.id} className={!servicio.activo ? 'opacity-60' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <IconComponent className="h-5 w-5 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{servicio.nombre}</CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <ActionTooltip label="Editar servicio">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(servicio)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </ActionTooltip>
                        <ActionTooltip label="Eliminar servicio">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openDeleteDialog(servicio)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </ActionTooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {servicio.descripcion && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{servicio.descripcion}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">${servicio.precio.toFixed(2)}</span>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={servicio.activo ? 'default' : 'secondary'}>
                          {servicio.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                        <Badge variant="outline">{servicio.tipo_costo}</Badge>
                        {servicio.requiere_inventario && (
                          <Badge variant="secondary" className="gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                            <RotateCcw className="h-3 w-3" />
                            Renta
                          </Badge>
                        )}
                      </div>
                    </div>
                    {servicio.requiere_inventario && (
                      <p className="text-sm text-muted-foreground">
                        Stock disponible: {servicio.stock_actual ?? 0}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar servicio?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el servicio "{serviceToDelete?.nombre}" permanentemente. 
                No se puede deshacer. Si el servicio tiene tickets asociados, no podrá ser eliminado.
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
