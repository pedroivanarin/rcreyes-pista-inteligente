import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertCircle, QrCode, Car, Timer, Flag, Gauge, Users, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { TicketCard } from '@/components/tickets/TicketCard';
import { QRScanner } from '@/components/qr/QRScanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Ticket, EstadoTicket } from '@/types/database';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const fetchTickets = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          cliente:clientes(*),
          tarifa_hora:tarifas_hora(*)
        `)
        .in('estado', ['activo', 'pausado'])
        .order('hora_entrada', { ascending: false });

      if (error) throw error;
      
      setTickets((data || []) as unknown as Ticket[]);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Error al cargar los tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePause = async (ticketId: string) => {
    try {
      const { error: pauseError } = await supabase
        .from('pausas_ticket')
        .insert({ ticket_id: ticketId });

      if (pauseError) throw pauseError;

      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ estado: 'pausado' as EstadoTicket })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      toast.success('Ticket pausado');
      fetchTickets();
    } catch (error) {
      console.error('Error pausing ticket:', error);
      toast.error('Error al pausar el ticket');
    }
  };

  const handleResume = async (ticketId: string) => {
    try {
      const { error: pauseError } = await supabase
        .from('pausas_ticket')
        .update({ fin_pausa: new Date().toISOString() })
        .eq('ticket_id', ticketId)
        .is('fin_pausa', null);

      if (pauseError) throw pauseError;

      const { error: ticketError } = await supabase
        .from('tickets')
        .update({ estado: 'activo' as EstadoTicket })
        .eq('id', ticketId);

      if (ticketError) throw ticketError;

      toast.success('Ticket reanudado');
      fetchTickets();
    } catch (error) {
      console.error('Error resuming ticket:', error);
      toast.error('Error al reanudar el ticket');
    }
  };

  const handleQRScan = async (scannedCode: string) => {
    setShowScanner(false);
    
    // Parse QR format: RCREYES:{codigo} or just the codigo
    let ticketCode = scannedCode;
    if (scannedCode.startsWith('RCREYES:')) {
      ticketCode = scannedCode.replace('RCREYES:', '');
    }
    
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('id, estado')
      .eq('codigo', ticketCode)
      .maybeSingle();

    if (error || !ticket) {
      toast.error('Ticket no encontrado');
      return;
    }

    if (ticket.estado === 'cerrado' || ticket.estado === 'cancelado') {
      toast.error('Este ticket ya está cerrado');
      return;
    }

    navigate(`/cobro/${ticket.id}`);
  };

  const activeTickets = tickets.filter(t => t.estado === 'activo');
  const pausedTickets = tickets.filter(t => t.estado === 'pausado');
  const totalPersonas = tickets.reduce((sum, t) => sum + (t.personas || 1), 0);

  return (
    <AppLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Hero Header - Responsive */}
        <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-secondary via-secondary to-secondary/80 p-4 sm:p-6 text-secondary-foreground">
          {/* Racing stripes decoration */}
          <div className="absolute top-0 right-0 w-24 sm:w-32 h-full opacity-10">
            <div className="absolute top-0 right-0 w-3 sm:w-4 h-full bg-primary transform skew-x-12" />
            <div className="absolute top-0 right-6 sm:right-8 w-3 sm:w-4 h-full bg-primary transform skew-x-12" />
            <div className="absolute top-0 right-12 sm:right-16 w-3 sm:w-4 h-full bg-primary transform skew-x-12" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 mb-2">
              <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary">
                <Flag className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold tracking-wide">
                  RCReyes
                </h1>
                <p className="text-secondary-foreground/70 text-xs sm:text-sm">
                  ¡Hola, {profile?.nombre?.split(' ')[0] || 'Operador'}! Bienvenido.
                </p>
              </div>
            </div>
            
            {/* Quick stats - Responsive grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-4 sm:mt-6">
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="p-1.5 sm:p-2 rounded-lg bg-success/20">
                  <Car className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-display font-bold">{activeTickets.length}</p>
                  <p className="text-[10px] sm:text-xs text-secondary-foreground/70">En pista</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="p-1.5 sm:p-2 rounded-lg bg-warning/20">
                  <Timer className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-display font-bold">{pausedTickets.length}</p>
                  <p className="text-[10px] sm:text-xs text-secondary-foreground/70">Pausados</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-center sm:items-center gap-1 sm:gap-3 p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="p-1.5 sm:p-2 rounded-lg bg-primary/20">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div className="text-center sm:text-left">
                  <p className="text-xl sm:text-2xl font-display font-bold">{totalPersonas}</p>
                  <p className="text-[10px] sm:text-xs text-secondary-foreground/70">Personas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons - Responsive */}
        <div className="flex gap-2 sm:gap-3">
          <Button
            onClick={() => navigate('/nuevo-ticket')}
            className="touch-button gap-1.5 sm:gap-2 flex-1 sm:flex-none bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-display tracking-wide text-sm sm:text-base">Nuevo Ticket</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowScanner(true)}
            className="touch-button gap-1.5 sm:gap-2 flex-1 sm:flex-none border-2"
          >
            <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-display tracking-wide text-sm sm:text-base">Escanear QR</span>
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="touch-target shrink-0"
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* QR Scanner Dialog */}
        <Dialog open={showScanner} onOpenChange={setShowScanner}>
          <DialogContent className="sm:max-w-md p-0 border-0 bg-transparent shadow-none max-h-[90vh]">
            <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
          </DialogContent>
        </Dialog>

        {loading ? (
          <div className="flex h-48 sm:h-64 items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-muted-foreground font-display text-sm sm:text-base">Cargando pista...</p>
            </div>
          </div>
        ) : tickets.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-10 sm:py-16 px-4">
              <div className="p-3 sm:p-4 rounded-full bg-muted mb-3 sm:mb-4">
                <Gauge className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground" />
              </div>
              <h2 className="mb-2 text-lg sm:text-xl font-display font-bold">Pista Vacía</h2>
              <p className="mb-4 sm:mb-6 text-center text-muted-foreground text-sm sm:text-base max-w-sm">
                No hay carreras activas en este momento. ¡Registra un nuevo cliente!
              </p>
              <Button 
                onClick={() => navigate('/nuevo-ticket')} 
                className="touch-button gap-2 shadow-lg shadow-primary/25"
              >
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="font-display tracking-wide">¡Arrancar Carrera!</span>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Active tickets */}
            {activeTickets.length > 0 && (
              <div className="animate-slide-in">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-success/10 border border-success/20">
                    <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-success" />
                    </span>
                    <span className="font-display font-semibold text-success text-sm sm:text-base">
                      En Pista ({activeTickets.length})
                    </span>
                  </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {activeTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onPause={handlePause}
                      onResume={handleResume}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Paused tickets */}
            {pausedTickets.length > 0 && (
              <div className="animate-slide-in">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-warning/10 border border-warning/20">
                    <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
                    <span className="font-display font-semibold text-warning text-sm sm:text-base">
                      Pit Stop ({pausedTickets.length})
                    </span>
                  </div>
                </div>
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {pausedTickets.map((ticket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onPause={handlePause}
                      onResume={handleResume}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
