import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Eye, Pause, Play, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, EstadoTicket } from '@/types/database';
import { cn } from '@/lib/utils';

interface TicketCardProps {
  ticket: Ticket;
  onPause?: (ticketId: string) => void;
  onResume?: (ticketId: string) => void;
}

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

export function TicketCard({ ticket, onPause, onResume }: TicketCardProps) {
  const navigate = useNavigate();
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const start = new Date(ticket.hora_entrada).getTime();
      const now = Date.now();
      return Math.floor((now - start) / (1000 * 60));
    };

    setElapsedMinutes(calculateElapsed());

    // Only update time if ticket is active
    if (ticket.estado === 'activo') {
      const interval = setInterval(() => {
        setElapsedMinutes(calculateElapsed());
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [ticket.hora_entrada, ticket.estado]);

  const isActive = ticket.estado === 'activo';
  const isPaused = ticket.estado === 'pausado';

  return (
    <Card className={cn(
      "relative overflow-hidden transition-shadow hover:shadow-md",
      isActive && "ring-2 ring-success/50"
    )}>
      {/* Status indicator bar */}
      <div className={cn("absolute left-0 top-0 h-full w-1", estadoStyles[ticket.estado])} />
      
      <CardContent className="p-4 pl-5">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{ticket.codigo}</p>
            <p className="text-sm text-muted-foreground">
              {ticket.cliente?.nombre || 'Cliente'}
            </p>
          </div>
          <Badge className={cn(estadoStyles[ticket.estado])}>
            {estadoLabels[ticket.estado]}
          </Badge>
        </div>

        {/* Info */}
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{ticket.personas} persona{ticket.personas !== 1 ? 's' : ''}</span>
          </div>
          <div className={cn(
            "flex items-center gap-1",
            isActive && "text-foreground font-medium animate-pulse-slow"
          )}>
            <Clock className="h-4 w-4" />
            <span>{formatTime(elapsedMinutes)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 touch-target"
            onClick={() => navigate(`/ticket/${ticket.id}`)}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver
          </Button>
          
          {isActive && onPause && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 touch-target"
              onClick={() => onPause(ticket.id)}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pausar
            </Button>
          )}
          
          {isPaused && onResume && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 touch-target"
              onClick={() => onResume(ticket.id)}
            >
              <Play className="mr-2 h-4 w-4" />
              Reanudar
            </Button>
          )}
          
          {(isActive || isPaused) && (
            <Button
              size="sm"
              className="flex-1 touch-target"
              onClick={() => navigate(`/cobro/${ticket.id}`)}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              Cobrar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
