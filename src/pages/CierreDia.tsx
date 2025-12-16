import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock, AlertTriangle, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface DaySummary {
  ticketsActivos: number;
  ticketsPausados: number;
  ticketsCerrados: number;
  ticketsCancelados: number;
  totalCobrado: number;
}

interface CierreDia {
  id: string;
  fecha: string;
  tickets_abiertos: number;
  tickets_cerrados: number;
  tickets_cancelados: number;
  total_cobrado: number;
  notas: string | null;
  created_at: string;
}

export default function CierreDia() {
  const { user, isSupervisor } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [notas, setNotas] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Check if today was already closed
  const { data: todayCierre, isLoading: loadingTodayCierre } = useQuery({
    queryKey: ['cierre-hoy', todayStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cierres_dia')
        .select('*')
        .eq('fecha', todayStr)
        .maybeSingle();
      
      if (error) throw error;
      return data as CierreDia | null;
    },
  });

  // Get today's summary
  const { data: daySummary, isLoading: loadingSummary } = useQuery({
    queryKey: ['resumen-dia', todayStr],
    queryFn: async () => {
      const startOfToday = startOfDay(today).toISOString();
      const endOfToday = endOfDay(today).toISOString();

      // Get tickets created today or still active
      const { data: tickets, error } = await supabase
        .from('tickets')
        .select('estado, monto_total, hora_entrada')
        .or(`hora_entrada.gte.${startOfToday},estado.in.(activo,pausado)`);

      if (error) throw error;

      const summary: DaySummary = {
        ticketsActivos: 0,
        ticketsPausados: 0,
        ticketsCerrados: 0,
        ticketsCancelados: 0,
        totalCobrado: 0,
      };

      tickets?.forEach((t) => {
        const isToday = new Date(t.hora_entrada) >= new Date(startOfToday);
        
        if (t.estado === 'activo') summary.ticketsActivos++;
        else if (t.estado === 'pausado') summary.ticketsPausados++;
        else if (t.estado === 'cerrado' && isToday) {
          summary.ticketsCerrados++;
          summary.totalCobrado += Number(t.monto_total) || 0;
        } else if (t.estado === 'cancelado' && isToday) {
          summary.ticketsCancelados++;
        }
      });

      return summary;
    },
  });

  // Get monthly history
  const { data: monthHistory, isLoading: loadingHistory } = useQuery({
    queryKey: ['cierres-mes', format(today, 'yyyy-MM')],
    queryFn: async () => {
      const start = format(startOfMonth(today), 'yyyy-MM-dd');
      const end = format(endOfMonth(today), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('cierres_dia')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data as CierreDia[];
    },
  });

  const handleCloseDia = async () => {
    if (!user || !daySummary) return;

    setIsClosing(true);
    try {
      const ticketsAbiertos = daySummary.ticketsActivos + daySummary.ticketsPausados;

      const { error } = await supabase
        .from('cierres_dia')
        .insert({
          fecha: todayStr,
          user_id: user.id,
          tickets_abiertos: ticketsAbiertos,
          tickets_cerrados: daySummary.ticketsCerrados,
          tickets_cancelados: daySummary.ticketsCancelados,
          total_cobrado: daySummary.totalCobrado,
          notas: notas.trim() || null,
        });

      if (error) throw error;

      // Create audit record
      await supabase.from('auditorias').insert({
        user_id: user.id,
        accion: 'cierre_dia',
        entidad: 'cierres_dia',
        detalle: {
          fecha: todayStr,
          tickets_abiertos: ticketsAbiertos,
          tickets_cerrados: daySummary.ticketsCerrados,
          total_cobrado: daySummary.totalCobrado,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['cierre-hoy'] });
      queryClient.invalidateQueries({ queryKey: ['cierres-mes'] });
      
      setConfirmDialogOpen(false);
      setNotas('');
      toast.success('Día cerrado correctamente');
    } catch (error: any) {
      console.error('Error closing day:', error);
      toast.error(error.message || 'Error al cerrar el día');
    } finally {
      setIsClosing(false);
    }
  };

  const ticketsAbiertos = (daySummary?.ticketsActivos || 0) + (daySummary?.ticketsPausados || 0);
  const totalTicketsAbiertosMes = monthHistory?.reduce((sum, c) => sum + c.tickets_abiertos, 0) || 0;

  const isLoading = loadingSummary || loadingTodayCierre || loadingHistory;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarClock className="h-6 w-6" />
            Cierre de Día
          </h1>
          <p className="text-muted-foreground">
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Alert if there are open tickets */}
            {ticketsAbiertos > 0 && !todayCierre && (
              <Card className="border-warning bg-warning/10">
                <CardContent className="flex items-center gap-4 py-4">
                  <AlertTriangle className="h-8 w-8 text-warning" />
                  <div>
                    <p className="font-bold text-lg">
                      ¡Hay {ticketsAbiertos} ticket{ticketsAbiertos !== 1 ? 's' : ''} sin cerrar!
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {daySummary?.ticketsActivos} activo{daySummary?.ticketsActivos !== 1 ? 's' : ''}, {daySummary?.ticketsPausados} pausado{daySummary?.ticketsPausados !== 1 ? 's' : ''}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Today's Status */}
            {todayCierre ? (
              <Card className="border-success bg-success/10">
                <CardContent className="flex items-center gap-4 py-4">
                  <CheckCircle className="h-8 w-8 text-success" />
                  <div>
                    <p className="font-bold text-lg">Día cerrado</p>
                    <p className="text-sm text-muted-foreground">
                      Cerrado a las {format(new Date(todayCierre.created_at), 'HH:mm')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Today's Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tickets Activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-success" />
                    <span className="text-2xl font-bold">{daySummary?.ticketsActivos || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tickets Pausados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-warning" />
                    <span className="text-2xl font-bold">{daySummary?.ticketsPausados || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tickets Cerrados Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-muted-foreground" />
                    <span className="text-2xl font-bold">{daySummary?.ticketsCerrados || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Cobrado Hoy
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-2xl font-bold text-success">
                    ${(daySummary?.totalCobrado || 0).toFixed(2)}
                  </span>
                </CardContent>
              </Card>
            </div>

            {/* Close Day Button */}
            {!todayCierre && isSupervisor && (
              <Card>
                <CardHeader>
                  <CardTitle>Cerrar Día</CardTitle>
                  <CardDescription>
                    Registra el cierre del día actual. Los tickets abiertos quedarán registrados.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => setConfirmDialogOpen(true)}
                    className="touch-button"
                    size="lg"
                  >
                    <CalendarClock className="mr-2 h-5 w-5" />
                    Cerrar Día
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Monthly Summary */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Historial del Mes</CardTitle>
                    <CardDescription>
                      {format(today, "MMMM yyyy", { locale: es })}
                    </CardDescription>
                  </div>
                  <Badge variant={totalTicketsAbiertosMes > 0 ? "destructive" : "secondary"}>
                    {totalTicketsAbiertosMes} tickets no cobrados
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {monthHistory && monthHistory.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-center">Abiertos</TableHead>
                        <TableHead className="text-center">Cerrados</TableHead>
                        <TableHead className="text-right">Total Cobrado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthHistory.map((cierre) => (
                        <TableRow key={cierre.id}>
                          <TableCell>
                            {format(new Date(cierre.fecha + 'T12:00:00'), "EEE d", { locale: es })}
                          </TableCell>
                          <TableCell className="text-center">
                            {cierre.tickets_abiertos > 0 ? (
                              <Badge variant="destructive">{cierre.tickets_abiertos}</Badge>
                            ) : (
                              <Badge variant="secondary">0</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{cierre.tickets_cerrados}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${cierre.total_cobrado.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No hay cierres registrados este mes
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar el día?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Se registrará el cierre con los siguientes datos:</p>
                <ul className="text-sm space-y-1">
                  <li>• Tickets sin cerrar: <strong>{ticketsAbiertos}</strong></li>
                  <li>• Tickets cerrados hoy: <strong>{daySummary?.ticketsCerrados || 0}</strong></li>
                  <li>• Total cobrado: <strong>${(daySummary?.totalCobrado || 0).toFixed(2)}</strong></li>
                </ul>
                {ticketsAbiertos > 0 && (
                  <p className="text-warning font-medium">
                    ⚠️ Hay {ticketsAbiertos} ticket{ticketsAbiertos !== 1 ? 's' : ''} sin cobrar
                  </p>
                )}
                <div className="space-y-2 pt-2">
                  <Label>Notas (opcional)</Label>
                  <Textarea
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Observaciones del día..."
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClosing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseDia} disabled={isClosing}>
              {isClosing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cerrando...
                </>
              ) : (
                'Confirmar Cierre'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
