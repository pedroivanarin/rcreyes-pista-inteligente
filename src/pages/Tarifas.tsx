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
import { Plus, Pencil, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { TarifaHora, TipoRedondeo } from '@/types/database';

export default function Tarifas() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarifa, setEditingTarifa] = useState<TarifaHora | null>(null);

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

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tarifas por Hora</h1>
            <p className="text-muted-foreground">Administra las tarifas de tiempo de pista</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew} className="touch-target">
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
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="tipo_redondeo">Tipo de Redondeo</Label>
                  <Select name="tipo_redondeo" defaultValue={editingTarifa?.tipo_redondeo || 'arriba'}>
                    <SelectTrigger>
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

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tarifas?.map((tarifa) => (
              <Card key={tarifa.id} className={!tarifa.activo ? 'opacity-60' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{tarifa.nombre}</CardTitle>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(tarifa)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">${tarifa.precio_por_hora.toFixed(2)}/hr</span>
                    <Badge variant={tarifa.activo ? 'default' : 'secondary'}>
                      {tarifa.activo ? 'Activo' : 'Inactivo'}
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
      </div>
    </AppLayout>
  );
}
