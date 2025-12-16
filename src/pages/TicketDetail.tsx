import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Pause, 
  Play, 
  DollarSign, 
  Plus,
  Printer,
  XCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Ticket, EstadoTicket, TicketServicio } from '@/types/database';
import { cn } from '@/lib/utils';
import { PrintableTicketsContainer } from '@/components/tickets/PrintableTicket';

const estadoStyles: Record<EstadoTicket, string> = {
  activo: 'bg-success text-success-foreground',
  pausado: 'bg-warning text-warning-foreground',
  cerrado: 'bg-muted text-muted-foreground',
  cancelado: 'bg-destructive text-destructive-foreground',
};

const estadoLabels: Record<EstadoTicket, string> = {
  activo: 'Activo',
  pausado: 'Pausado',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

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

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canCancel } = useAuth();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [servicios, setServicios] = useState<TicketServicio[]>([]);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [showPrintDialog, setShowPrintDialog] = useState(false);

  const fetchTicket = async () => {
    if (!id) return;
    
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          cliente:clientes(*),
          tarifa_hora:tarifas_hora(*)
        `)
        .eq('id', id)
        .maybeSingle();

      if (ticketError) throw ticketError;
      if (!ticketData) {
        toast.error('Ticket no encontrado');
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

      setServicios((serviciosData || []) as TicketServicio[]);
    } catch (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Error al cargar el ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    if (!ticket) return;

    const calculateElapsed = () => {
      const start = new Date(ticket.hora_entrada).getTime();
      const end = ticket.hora_salida ? new Date(ticket.hora_salida).getTime() : Date.now();
      return Math.floor((end - start) / (1000 * 60));
    };

    setElapsedMinutes(calculateElapsed());

    if (ticket.estado === 'activo') {
      const interval = setInterval(() => {
        setElapsedMinutes(calculateElapsed());
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [ticket]);

  const handlePause = async () => {
    if (!ticket || !user) return;

    try {
      await supabase.from('pausas_ticket').insert({ ticket_id: ticket.id });
      await supabase.from('tickets').update({ estado: 'pausado' as EstadoTicket }).eq('id', ticket.id);
      await supabase.from('auditorias').insert({
        user_id: user.id,
        accion: 'pausar_ticket',
        entidad: 'tickets',
        entidad_id: ticket.id,
      });
      
      toast.success('Ticket pausado');
      fetchTicket();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al pausar el ticket');
    }
  };

  const handleResume = async () => {
    if (!ticket || !user) return;

    try {
      await supabase
        .from('pausas_ticket')
        .update({ fin_pausa: new Date().toISOString() })
        .eq('ticket_id', ticket.id)
        .is('fin_pausa', null);
      
      await supabase.from('tickets').update({ estado: 'activo' as EstadoTicket }).eq('id', ticket.id);
      await supabase.from('auditorias').insert({
        user_id: user.id,
        accion: 'reanudar_ticket',
        entidad: 'tickets',
        entidad_id: ticket.id,
      });
      
      toast.success('Ticket reanudado');
      fetchTicket();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al reanudar el ticket');
    }
  };

  const handleCancel = async () => {
    if (!ticket || !user || !cancelReason.trim()) return;

    setCancelling(true);
    try {
      await supabase.from('tickets').update({
        estado: 'cancelado' as EstadoTicket,
        motivo_cancelacion: cancelReason.trim(),
      }).eq('id', ticket.id);

      await supabase.from('auditorias').insert({
        user_id: user.id,
        accion: 'cancelar_ticket',
        entidad: 'tickets',
        entidad_id: ticket.id,
        detalle: { motivo: cancelReason.trim() },
      });
      
      toast.success('Ticket cancelado');
      setCancelDialogOpen(false);
      fetchTicket();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cancelar el ticket');
    } finally {
      setCancelling(false);
    }
  };

  const handlePrint = () => {
    setShowPrintDialog(true);
  };

  const calcularSubtotalServicios = () => {
    return servicios.reduce((sum, s) => sum + s.monto_total, 0);
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

  if (!ticket) {
    return null;
  }

  const isActive = ticket.estado === 'activo';
  const isPaused = ticket.estado === 'pausado';
  const isClosed = ticket.estado === 'cerrado';
  const isCancelled = ticket.estado === 'cancelado';
  const canModify = isActive || isPaused;

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
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
              <h1 className="text-2xl font-bold">{ticket.codigo}</h1>
              <p className="text-muted-foreground">Detalle del ticket</p>
            </div>
          </div>
          <Badge className={cn(estadoStyles[ticket.estado], "text-sm px-3 py-1")}>
            {estadoLabels[ticket.estado]}
          </Badge>
        </div>

        {/* QR Code */}
        <Card className="print:border-0 print:shadow-none">
          <CardContent className="flex flex-col items-center py-6">
            <QRCodeSVG
              value={`RCREYES:${ticket.codigo}`}
              size={180}
              level="M"
              includeMargin
            />
            <p className="mt-2 text-lg font-bold">{ticket.codigo}</p>
            <p className="text-sm text-muted-foreground">
              Escanea para acceder al ticket
            </p>
          </CardContent>
        </Card>

        {/* Client & Time Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{ticket.cliente?.nombre}</p>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{ticket.personas} persona{ticket.personas !== 1 ? 's' : ''}</span>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Entrada</p>
                <p className="font-medium">{formatDateTime(ticket.hora_entrada)}</p>
              </div>
              {ticket.hora_salida && (
                <div>
                  <p className="text-sm text-muted-foreground">Salida</p>
                  <p className="font-medium">{formatDateTime(ticket.hora_salida)}</p>
                </div>
              )}
            </div>

            <div className={cn(
              "flex items-center gap-3 rounded-lg p-4",
              isActive ? "bg-success/10" : isPaused ? "bg-warning/10" : "bg-muted"
            )}>
              <Clock className="h-6 w-6" />
              <div>
                <p className="text-sm text-muted-foreground">Tiempo transcurrido</p>
                <p className={cn(
                  "text-2xl font-bold",
                  isActive && "animate-pulse-slow"
                )}>
                  {formatTime(elapsedMinutes)}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Tarifa</p>
              <p className="font-medium">
                {ticket.tarifa_hora?.nombre} - ${ticket.tarifa_hora?.precio_por_hora.toFixed(2)}/hora
              </p>
            </div>

            {ticket.notas && (
              <div>
                <p className="text-sm text-muted-foreground">Notas</p>
                <p className="font-medium">{ticket.notas}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Services */}
        {servicios.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Servicios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {servicios.map((ts) => (
                <div key={ts.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{ts.servicio?.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {ts.cantidad} x ${ts.precio_unitario.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold">${ts.monto_total.toFixed(2)}</p>
                </div>
              ))}
              <Separator />
              <div className="flex items-center justify-between">
                <p className="font-medium">Subtotal servicios</p>
                <p className="font-bold">${calcularSubtotalServicios().toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cancellation reason */}
        {isCancelled && ticket.motivo_cancelacion && (
          <Card className="border-destructive">
            <CardContent className="py-4">
              <p className="text-sm font-medium text-destructive">Motivo de cancelación:</p>
              <p>{ticket.motivo_cancelacion}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="no-print space-y-3">
          {canModify && (
            <div className="grid gap-3 sm:grid-cols-2">
              {isActive ? (
                <Button
                  variant="outline"
                  onClick={handlePause}
                  className="touch-button"
                >
                  <Pause className="mr-2 h-5 w-5" />
                  Pausar
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleResume}
                  className="touch-button"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Reanudar
                </Button>
              )}
              <Button
                onClick={() => navigate(`/cobro/${ticket.id}`)}
                className="touch-button"
              >
                <DollarSign className="mr-2 h-5 w-5" />
                Ir a Cobro
              </Button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={handlePrint}
              className="touch-button"
            >
              <Printer className="mr-2 h-5 w-5" />
              Imprimir Ticket
            </Button>
            
            {canModify && canCancel && (
              <Button
                variant="destructive"
                onClick={() => setCancelDialogOpen(true)}
                className="touch-button"
              >
                <XCircle className="mr-2 h-5 w-5" />
                Cancelar Ticket
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Ticket</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El ticket quedará registrado como cancelado.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Escribe el motivo de la cancelación..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={!cancelReason.trim() || cancelling}
            >
              {cancelling ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Confirmar Cancelación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={setShowPrintDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <PrintableTicketsContainer 
            ticket={ticket} 
            onClose={() => setShowPrintDialog(false)} 
          />
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
