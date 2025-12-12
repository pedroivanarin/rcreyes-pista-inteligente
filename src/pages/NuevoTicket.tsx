import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { ArrowLeft, Plus, Minus, Loader2, Search, UserCheck, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Servicio, TarifaHora, Cliente, TipoMembresia } from '@/types/database';

const ticketSchema = z.object({
  personas: z.number().min(1, 'Debe haber al menos 1 persona'),
  notas: z.string().max(500).optional(),
});

interface SelectedService {
  servicio_id: string;
  cantidad: number;
}

const MEMBRESIA_LABELS: Record<TipoMembresia, string> = {
  ninguna: 'Sin membresía',
  basica: 'Básica (5%)',
  premium: 'Premium (10%)',
  vip: 'VIP (15%)',
};

export default function NuevoTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Client search
  const [codigoCliente, setCodigoCliente] = useState('');
  const [searchingCliente, setSearchingCliente] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  
  // New client mode
  const [isNewClient, setIsNewClient] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  
  const [personas, setPersonas] = useState(1);
  const [notas, setNotas] = useState('');
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [tarifaActiva, setTarifaActiva] = useState<TarifaHora | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: serviciosData } = await supabase
          .from('servicios')
          .select('*')
          .eq('activo', true)
          .order('nombre');
        
        setServicios((serviciosData || []) as Servicio[]);

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

  const searchCliente = async () => {
    if (!codigoCliente.trim()) {
      toast.error('Ingresa un código de cliente');
      return;
    }

    setSearchingCliente(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .or(`codigo_cliente.ilike.%${codigoCliente.trim()}%,nombre.ilike.%${codigoCliente.trim()}%`)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSelectedCliente(data as Cliente);
        setIsNewClient(false);
        toast.success(`Cliente encontrado: ${data.nombre}`);
      } else {
        toast.error('Cliente no encontrado. Puedes registrar uno nuevo.');
        setSelectedCliente(null);
      }
    } catch (error) {
      console.error('Error searching cliente:', error);
      toast.error('Error al buscar el cliente');
    } finally {
      setSearchingCliente(false);
    }
  };

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
      personas,
      notas,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    if (!selectedCliente && !isNewClient) {
      toast.error('Busca un cliente existente o registra uno nuevo');
      return;
    }

    if (isNewClient && !nuevoNombre.trim()) {
      toast.error('Ingresa el nombre del nuevo cliente');
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
      let clienteId: string;
      
      if (selectedCliente) {
        clienteId = selectedCliente.id;
      } else {
        // Create new client
        const { data: newCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            nombre: nuevoNombre.trim(),
            tipo_cliente: 'regular',
            membresia: 'ninguna',
            descuento_porcentaje: 0,
          })
          .select('id, codigo_cliente')
          .single();
        
        if (clienteError) throw clienteError;
        clienteId = newCliente.id;
        toast.info(`Nuevo cliente registrado: ${newCliente.codigo_cliente}`);
      }

      // Create ticket
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

      // Add services if any
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

        // Update inventory
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

      // Create audit record
      await supabase.from('auditorias').insert({
        user_id: user.id,
        accion: 'crear_ticket',
        entidad: 'tickets',
        entidad_id: ticketData.id,
        detalle: { 
          codigo: ticketData.codigo, 
          cliente_id: clienteId,
          personas,
          descuento: selectedCliente?.descuento_porcentaje || 0,
        },
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
          {/* Client Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Buscar Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={codigoCliente}
                  onChange={(e) => setCodigoCliente(e.target.value)}
                  placeholder="Código o nombre del cliente (ej: RCM-00001)"
                  className="touch-target flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      searchCliente();
                    }
                  }}
                />
                <Button 
                  type="button" 
                  onClick={searchCliente}
                  disabled={searchingCliente}
                  className="touch-button"
                >
                  {searchingCliente ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Selected client display */}
              {selectedCliente && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-lg">{selectedCliente.nombre}</p>
                      <p className="text-sm font-mono text-muted-foreground">{selectedCliente.codigo_cliente}</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedCliente(null);
                        setCodigoCliente('');
                      }}
                    >
                      Cambiar
                    </Button>
                  </div>
                  {selectedCliente.membresia && selectedCliente.membresia !== 'ninguna' && (
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="gap-1">
                        <Crown className="h-3 w-3" />
                        {MEMBRESIA_LABELS[selectedCliente.membresia]}
                      </Badge>
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        {selectedCliente.descuento_porcentaje}% descuento
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* New client option */}
              {!selectedCliente && (
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Checkbox 
                      id="nuevo-cliente" 
                      checked={isNewClient}
                      onCheckedChange={(checked) => setIsNewClient(!!checked)}
                    />
                    <label htmlFor="nuevo-cliente" className="text-sm font-medium cursor-pointer">
                      Registrar cliente nuevo (primera visita)
                    </label>
                  </div>
                  
                  {isNewClient && (
                    <Input
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Nombre del nuevo cliente"
                      className="touch-target"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Entry details */}
          <Card>
            <CardHeader>
              <CardTitle>Detalles de Entrada</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    className="touch-target text-center w-20"
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
                <div className="text-right">
                  <p className="text-lg font-bold">
                    ${tarifaActiva.precio_por_hora.toFixed(2)}/hora
                  </p>
                  {selectedCliente?.descuento_porcentaje > 0 && (
                    <p className="text-sm text-green-600">
                      -{selectedCliente.descuento_porcentaje}% descuento de membresía
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <Button
            type="submit"
            className="w-full touch-button"
            disabled={submitting || (!selectedCliente && !isNewClient)}
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
