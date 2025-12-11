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
import { Plus, Pencil, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Servicio, TipoCosto } from '@/types/database';

export default function Servicios() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Servicio | null>(null);

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

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    mutation.mutate({
      nombre: formData.get('nombre') as string,
      descripcion: formData.get('descripcion') as string || null,
      precio: parseFloat(formData.get('precio') as string),
      tipo_costo: formData.get('tipo_costo') as TipoCosto,
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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Servicios</h1>
            <p className="text-muted-foreground">Administra los servicios y productos disponibles</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="touch-target">
                <Plus className="h-5 w-5 mr-2" />
                Nuevo Servicio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tipo_costo">Tipo de Costo</Label>
                    <Select name="tipo_costo" defaultValue={editingService?.tipo_costo || 'fijo'}>
                      <SelectTrigger>
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
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="requiere_inventario">Requiere Inventario</Label>
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
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maximo_por_ticket">Máximo por Ticket</Label>
                    <Input 
                      id="maximo_por_ticket" 
                      name="maximo_por_ticket" 
                      type="number"
                      defaultValue={editingService?.maximo_por_ticket || ''}
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

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {servicios?.map((servicio) => (
              <Card key={servicio.id} className={!servicio.activo ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{servicio.nombre}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(servicio)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {servicio.descripcion && (
                    <p className="text-sm text-muted-foreground">{servicio.descripcion}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">${servicio.precio.toFixed(2)}</span>
                    <div className="flex gap-2">
                      <Badge variant={servicio.activo ? 'default' : 'secondary'}>
                        {servicio.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                      <Badge variant="outline">{servicio.tipo_costo}</Badge>
                    </div>
                  </div>
                  {servicio.requiere_inventario && (
                    <p className="text-sm text-muted-foreground">
                      Stock: {servicio.stock_actual ?? 0}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
