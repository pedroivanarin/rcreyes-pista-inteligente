import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, Plus, Minus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { TipoCliente, Servicio, TarifaHora } from '@/types/database';

const ticketSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  personas: z.number().min(1, 'Debe haber al menos 1 persona'),
  tipo_cliente: z.enum(['regular', 'miembro', 'invitado']),
  notas: z.string().max(500).optional(),
});

interface SelectedService {
  servicio_id: string;
  cantidad: number;
}

export default function NuevoTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [nombre, setNombre] = useState('');
  const [personas, setPersonas] = useState(1);
  const [tipoCliente, setTipoCliente] = useState<TipoCliente>('regular');
  const [notas, setNotas] = useState('');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tarifaActiva, setTarifaActiva] = useState<TarifaHora | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch active services
        const { data: serviciosData } = await supabase
          .from('servicios')
          .select('*')
          .eq('activo', true)
          .order('nombre');
        
        setServicios((serviciosData || []) as Servicio[]);

        // Fetch active tarifa
        const { data: tarifaData } = await supabase
          .from('tarifas_hora')
          .select('*')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        setTarifaActiva(tarifaData as TarifaHora | null);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleService = (servicioId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices([...selectedServices, { servicio_id: servicioId, cantidad: 1 }]);
    } else {
      setSelectedServices(selectedServices.filter(s => s.servicio_id !== servicioId));
    }
  };

  const updateServiceQuantity = (servicioId: string, delta: number) => {
    setSelectedServices(selectedServices.map(s => {
      if (s.servicio_id === servicioId) {
        const servicio = servicios.find(srv => srv.id === servicioId);
        const maxQuantity = servicio?.maximo_por_ticket || 99;
        const newQuantity = Math.max(1, Math.min(s.cantidad + delta, maxQuantity));
        return { ...s, cantidad: newQuantity };
      }
      return s;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = ticketSchema.safeParse({
      nombre,
      personas,
      tipo_cliente: tipoCliente,
      notas,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!tarifaActiva) {
      toast.error('No hay una tarifa activa configurada. Contacta al administrador.');
      return;
    }

    if (!user) {
      toast.error('Debes iniciar sesión');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create or find cliente
      let clienteId: string;
      
      const { data: existingCliente } = await supabase
        .from('clientes')
        .select('id')
        .eq('nombre', nombre.trim())
        .maybeSingle();
      
      if (existingCliente) {
        clienteId = existingCliente.id;
      } else {
        const { data: newCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            nombre: nombre.trim(),
            tipo_cliente: tipoCliente,
          })
          .select('id')
          .single();
        
        if (clienteError) throw clienteError;
        clienteId = newCliente.id;
      }

      // 2. Create ticket
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          cliente_id: clienteId,
          personas,
          tarifa_hora_id: tarifaActiva.id,
          operador_entrada_id: user.id,
          notas: notas.trim() || null,
        })
        .select('id, codigo')
        .single();

      if (ticketError) throw ticketError;

      // 3. Add services if any
      if (selectedServices.length > 0) {
        const serviciosToInsert = selectedServices.map(ss => {
          const servicio = servicios.find(s => s.id === ss.servicio_id)!;
          return {
            ticket_id: ticketData.id,
            servicio_id: ss.servicio_id,
            cantidad: ss.cantidad,
            precio_unitario: servicio.precio,
            monto_total: servicio.precio * ss.cantidad,
          };
        });

        const { error: serviciosError } = await supabase
          .from('ticket_servicios')
          .insert(serviciosToInsert);

        if (serviciosError) throw serviciosError;

        // Update inventory for services that require it
        for (const ss of selectedServices) {
          const servicio = servicios.find(s => s.id === ss.servicio_id);
          if (servicio?.requiere_inventario && servicio.stock_actual !== null) {
            await supabase
              .from('servicios')
              .update({ stock_actual: servicio.stock_actual - ss.cantidad })
              .eq('id', ss.servicio_id);
          }
        }
      }

      // 4. Create audit record
      await supabase.from('auditorias').insert({
        user_id: user.id,
        accion: 'crear_ticket',
        entidad: 'tickets',
        entidad_id: ticketData.id,
        detalle: { codigo: ticketData.codigo, cliente: nombre, personas },
      });

      toast.success(`Ticket ${ticketData.codigo} creado exitosamente`);
      navigate(`/ticket/${ticketData.id}`);
    } catch (error) {
      console.error('Error creating ticket:', error);
      toast.error('Error al crear el ticket');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nuevo Ticket</h1>
            <p className="text-muted-foreground">Registrar entrada de cliente</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client info */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre del cliente *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="touch-target"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="personas">Número de personas *</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPersonas(Math.max(1, personas - 1))}
                      className="touch-target"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      id="personas"
                      type="number"
                      value={personas}
                      onChange={(e) => setPersonas(Math.max(1, parseInt(e.target.value) || 1))}
                      className="touch-target text-center"
                      min={1}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setPersonas(personas + 1)}
                      className="touch-target"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo de cliente</Label>
                  <Select
                    value={tipoCliente}
                    onValueChange={(v) => setTipoCliente(v as TipoCliente)}
                  >
                    <SelectTrigger className="touch-target">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="miembro">Miembro</SelectItem>
                      <SelectItem value="invitado">Invitado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notas">Observaciones</Label>
                <Textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas adicionales (opcional)"
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Services */}
          {servicios.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Servicios Adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {servicios.map((servicio) => {
                  const selected = selectedServices.find(s => s.servicio_id === servicio.id);
                  const isDisabled = servicio.requiere_inventario && 
                    (servicio.stock_actual === null || servicio.stock_actual <= 0);

                  return (
                    <div
                      key={servicio.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={servicio.id}
                          checked={!!selected}
                          onCheckedChange={(checked) => toggleService(servicio.id, !!checked)}
                          disabled={isDisabled}
                          className="touch-target"
                        />
                        <div>
                          <label
                            htmlFor={servicio.id}
                            className="font-medium cursor-pointer"
                          >
                            {servicio.nombre}
                          </label>
                          <p className="text-sm text-muted-foreground">
                            ${servicio.precio.toFixed(2)}
                            {servicio.requiere_inventario && servicio.stock_actual !== null && (
                              <span className="ml-2">
                                (Stock: {servicio.stock_actual})
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {selected && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => updateServiceQuantity(servicio.id, -1)}
                            className="h-8 w-8"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">
                            {selected.cantidad}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => updateServiceQuantity(servicio.id, 1)}
                            className="h-8 w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Tarifa info */}
          {tarifaActiva && (
            <Card>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Tarifa aplicada</p>
                  <p className="text-sm text-muted-foreground">{tarifaActiva.nombre}</p>
                </div>
                <p className="text-lg font-bold">
                  ${tarifaActiva.precio_por_hora.toFixed(2)}/hora
                </p>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full touch-button"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creando ticket...
              </>
            ) : (
              'Crear Ticket y Generar QR'
            )}
          </Button>
        </form>
      </div>
    </AppLayout>
  );
}
