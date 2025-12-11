import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, DollarSign, Clock, Users, Ticket } from 'lucide-react';

export default function Reportes() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['reportes-stats'],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Tickets de hoy
      const { data: ticketsHoy, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, monto_total, estado')
        .gte('created_at', today.toISOString());
      
      if (ticketsError) throw ticketsError;

      // Tickets activos
      const { data: ticketsActivos, error: activosError } = await supabase
        .from('tickets')
        .select('id')
        .eq('estado', 'activo');
      
      if (activosError) throw activosError;

      // Calcular totales
      const ventasHoy = ticketsHoy
        ?.filter(t => t.estado === 'cerrado')
        .reduce((sum, t) => sum + (t.monto_total || 0), 0) || 0;

      const ticketsCerradosHoy = ticketsHoy?.filter(t => t.estado === 'cerrado').length || 0;

      return {
        ticketsActivos: ticketsActivos?.length || 0,
        ticketsHoy: ticketsHoy?.length || 0,
        ticketsCerradosHoy,
        ventasHoy,
      };
    },
  });

  const statCards = [
    {
      title: 'Tickets Activos',
      value: stats?.ticketsActivos || 0,
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Tickets Hoy',
      value: stats?.ticketsHoy || 0,
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Cerrados Hoy',
      value: stats?.ticketsCerradosHoy || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Ventas Hoy',
      value: `$${(stats?.ventasHoy || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Reportes</h1>
          <p className="text-muted-foreground">Resumen de operaciones del día</p>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Próximamente</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Gráficos detallados y reportes avanzados estarán disponibles en futuras versiones.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AppLayout>
  );
}
