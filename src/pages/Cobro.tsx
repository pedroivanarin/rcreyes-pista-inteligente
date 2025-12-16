import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft, Clock, Printer, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Ticket, MetodoPago, EstadoTicket, TicketServicio } from '@/types/database';

const metodosPago: { value: MetodoPago; label: string }[] = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'otro', label: 'Otro' },
];

function formatTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}m`;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

interface CalculoTiempo {
  tiempo_real_minutos: number;
  tiempo_cobrado_minutos: number;
  costo_tiempo: number;
}

export default function Cobro() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [servicios, setServicios] = useState<TicketServicio[]>([]);
  const [calculo, setCalculo] = useState<CalculoTiempo | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [cobrado, setCobrado] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!id) return;

      try {
        // Fetch ticket
        const { data: ticketData, error: ticketError } = await supabase
          .from('tickets')
          .select(`
            *,
            cliente:clientes(*),
            tarifa_hora:tarifas_hora(*)
          `)
          .eq('id', id)
          .maybeSingle();

        if (!isMounted) return;

        if (ticketError) throw ticketError;
        if (!ticketData) {
          toast.error('Ticket no encontrado');
          navigate('/dashboard');
          return;
        }

        // If ticket is already closed, set cobrado state and show the data
        if (ticketData.estado === 'cerrado') {
          setCobrado(true);
        }

        // If ticket is cancelled, redirect
        if (ticketData.estado === 'cancelado') {
          toast.error('Este ticket fue cancelado');
          navigate('/dashboard');
          return;
        }

        setTicket(ticketData as unknown as Ticket);

        // Fetch services
        const { data: serviciosData } = await supabase
          .from('ticket_servicios')
          .select(`
            *,
            servicio:servicios(*)
          `)
          .eq('ticket_id', id);

        if (!isMounted) return;
        setServicios((serviciosData || []) as TicketServicio[]);

        // Calculate time - use stored values if ticket is closed
        if (ticketData.estado === 'cerrado' && ticketData.monto_tiempo !== null) {
          setCalculo({
            tiempo_real_minutos: ticketData.total_tiempo_cobrado_minutos || 0,
            tiempo_cobrado_minutos: ticketData.total_tiempo_cobrado_minutos || 0,
            costo_tiempo: ticketData.monto_tiempo || 0,
          });
        } else {
          const { data: calculoData } = await supabase
            .rpc('calcular_tiempo_cobrable', { p_ticket_id: id });

          if (!isMounted) return;
          if (calculoData && calculoData.length > 0) {
            setCalculo(calculoData[0]);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        if (isMounted) {
          toast.error('Error al cargar el cobro');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  const subtotalServicios = servicios.reduce((sum, s) => sum + s.monto_total, 0);
  const montoTiempo = calculo?.costo_tiempo || 0;
  const total = montoTiempo + subtotalServicios;

  const handleCobrar = async () => {
    if (!ticket || !user || !calculo) return;

    setProcessing(true);
    try {
      const horaSalida = new Date().toISOString();

      // Update ticket
      const { error: updateError } = await supabase
        .from('tickets')
        .update({
          estado: 'cerrado' as EstadoTicket,
          hora_salida: horaSalida,
          operador_salida_id: user.id,
          total_tiempo_cobrado_minutos: calculo.tiempo_cobrado_minutos,
          monto_tiempo: montoTiempo,
          monto_servicios: subtotalServicios,
          monto_total: total,
          metodo_pago: metodoPago,
        })
        .eq('id', ticket.id);

      if (updateError) throw updateError;

      // Create audit record
      await supabase.from('auditorias').insert({
        user_id: user.id,
        accion: 'cerrar_ticket',
        entidad: 'tickets',
        entidad_id: ticket.id,
        detalle: {
          codigo: ticket.codigo,
          monto_total: total,
          metodo_pago: metodoPago,
          tiempo_cobrado: calculo.tiempo_cobrado_minutos,
        },
      });

      setCobrado(true);
      toast.success('¡Ticket cobrado exitosamente!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al procesar el cobro');
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  if (!ticket || !calculo) {
    return null;
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 no-print">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="touch-target"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {cobrado ? 'Ticket Cobrado' : 'Cobro de Ticket'}
            </h1>
            <p className="text-muted-foreground">{ticket.codigo}</p>
          </div>
        </div>

        {cobrado && (
          <Card className="border-success bg-success/10">
            <CardContent className="flex items-center gap-4 py-6">
              <CheckCircle className="h-12 w-12 text-success" />
              <div>
                <p className="text-xl font-bold text-success">¡Cobro completado!</p>
                <p className="text-muted-foreground">
                  El ticket ha sido cerrado exitosamente.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Print Header (only visible on print) */}
        <div className="hidden print:block text-center mb-6">
          <div className="text-2xl font-bold">RCReyes</div>
          <div className="text-sm text-muted-foreground">Control de Pistas de Radio Control</div>
          <div className="text-sm mt-2">Ticket de Salida</div>
        </div>

        {/* Client Info */}
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{ticket.cliente?.nombre}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Código</p>
                <p className="font-bold">{ticket.codigo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Breakdown */}
        <Card className="print:border-0 print:shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Tiempo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Entrada</span>
              <span>{formatDateTime(ticket.hora_entrada)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Salida</span>
              <span>{cobrado && ticket.hora_salida ? formatDateTime(ticket.hora_salida) : formatDateTime(new Date().toISOString())}</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span>Tiempo real</span>
              <span>{formatTime(calculo.tiempo_real_minutos)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tiempo cobrado</span>
              <span className="font-medium">{formatTime(calculo.tiempo_cobrado_minutos)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tarifa: {ticket.tarifa_hora?.nombre}</span>
              <span>${ticket.tarifa_hora?.precio_por_hora.toFixed(2)}/hora</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Subtotal tiempo</span>
              <span>${montoTiempo.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        {servicios.length > 0 && (
          <Card className="print:border-0 print:shadow-none">
            <CardHeader>
              <CardTitle>Servicios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {servicios.map((ts) => (
                <div key={ts.id} className="flex justify-between">
                  <span>
                    {ts.servicio?.nombre} x{ts.cantidad}
                  </span>
                  <span>${ts.monto_total.toFixed(2)}</span>
                </div>
              ))}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Subtotal servicios</span>
                <span>${subtotalServicios.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Total */}
        <Card className="border-primary print:border-0 print:shadow-none">
          <CardContent className="py-6">
            <div className="flex items-center justify-between text-2xl font-bold">
              <span>TOTAL A PAGAR</span>
              <span className="text-primary">${total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method (only before charging) */}
        {!cobrado && (
          <Card className="no-print">
            <CardHeader>
              <CardTitle>Método de Pago</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={metodoPago}
                onValueChange={(v) => setMetodoPago(v as MetodoPago)}
                className="grid grid-cols-2 gap-4"
              >
                {metodosPago.map((mp) => (
                  <div key={mp.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={mp.value} id={mp.value} />
                    <Label htmlFor={mp.value} className="cursor-pointer">
                      {mp.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Payment info (after charging) */}
        {cobrado && (
          <Card className="print:border-0 print:shadow-none">
            <CardContent className="py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de pago</span>
                <span className="font-medium capitalize">{metodoPago}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* QR for print */}
        <div className="hidden print:flex print:justify-center print:py-4">
          <QRCodeSVG
            value={`RCREYES:${ticket.codigo}`}
            size={100}
            level="M"
          />
        </div>

        {/* Print footer */}
        <div className="hidden print:block text-center text-sm text-muted-foreground">
          <p>¡Gracias por su visita!</p>
          <p>RCReyes - Control de Pistas de Radio Control</p>
        </div>

        {/* Actions */}
        <div className="no-print space-y-3">
          {!cobrado ? (
            <Button
              onClick={handleCobrar}
              disabled={processing}
              className="w-full touch-button text-lg"
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Confirmar Cobro - ${total.toFixed(2)}
                </>
              )}
            </Button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                variant="outline"
                onClick={handlePrint}
                className="touch-button"
              >
                <Printer className="mr-2 h-5 w-5" />
                Imprimir Ticket
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                className="touch-button"
              >
                Volver al Tablero
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
