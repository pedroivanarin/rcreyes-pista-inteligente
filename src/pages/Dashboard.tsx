import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { TicketCard } from '@/components/tickets/TicketCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Ticket, EstadoTicket } from '@/types/database';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      // Create pause record
      const { error: pauseError } = await supabase
        .from('pausas_ticket')
        .insert({
          ticket_id: ticketId,
        });

      if (pauseError) throw pauseError;

      // Update ticket status
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
      // Close the active pause
      const { error: pauseError } = await supabase
        .from('pausas_ticket')
        .update({ fin_pausa: new Date().toISOString() })
        .eq('ticket_id', ticketId)
        .is('fin_pausa', null);

      if (pauseError) throw pauseError;

      // Update ticket status
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

  const activeTickets = tickets.filter(t => t.estado === 'activo');
  const pausedTickets = tickets.filter(t => t.estado === 'pausado');

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tablero de Tickets</h1>
            <p className="text-muted-foreground">
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} activo{tickets.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
              className="touch-target"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={() => navigate('/nuevo-ticket')}
              className="touch-button gap-2"
            >
              <Plus className="h-5 w-5" />
              Nuevo Ticket
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="mb-2 text-lg font-medium">No hay tickets activos</h2>
              <p className="mb-4 text-center text-muted-foreground">
                Crea un nuevo ticket para registrar la entrada de un cliente.
              </p>
              <Button onClick={() => navigate('/nuevo-ticket')} className="touch-button">
                <Plus className="mr-2 h-5 w-5" />
                Crear Nuevo Ticket
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Active tickets */}
            {activeTickets.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <span className="h-3 w-3 rounded-full bg-success" />
                  Activos ({activeTickets.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                  <span className="h-3 w-3 rounded-full bg-warning" />
                  Pausados ({pausedTickets.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
