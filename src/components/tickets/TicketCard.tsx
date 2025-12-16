import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Eye, Pause, Play, DollarSign, Car, Flag } from 'lucide-react';
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

const estadoConfig: Record<EstadoTicket, { bg: string; text: string; label: string; icon: typeof Car }> = {
  activo: { bg: 'bg-success', text: 'text-white', label: 'En Pista', icon: Car },
  pausado: { bg: 'bg-warning', text: 'text-white', label: 'Pit Stop', icon: Pause },
  cerrado: { bg: 'bg-muted', text: 'text-muted-foreground', label: 'Finalizado', icon: Flag },
  cancelado: { bg: 'bg-destructive', text: 'text-white', label: 'Cancelado', icon: Flag },
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

    if (ticket.estado === 'activo') {
      const interval = setInterval(() => {
        setElapsedMinutes(calculateElapsed());
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [ticket.hora_entrada, ticket.estado]);

  const isActive = ticket.estado === 'activo';
  const isPaused = ticket.estado === 'pausado';
  const config = estadoConfig[ticket.estado];
  const StatusIcon = config.icon;

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg border-2",
      isActive && "border-success/50 shadow-lg shadow-success/10",
      isPaused && "border-warning/50"
    )}>
      {/* Top accent bar */}
      <div className={cn("h-1", config.bg)} />
      
      <CardContent className="p-3 sm:p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className={cn(
              "p-1.5 sm:p-2 rounded-lg",
              isActive ? "bg-success/10" : isPaused ? "bg-warning/10" : "bg-muted"
            )}>
              <StatusIcon className={cn(
                "h-4 w-4 sm:h-5 sm:w-5",
                isActive ? "text-success" : isPaused ? "text-warning" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <p className="text-base sm:text-lg font-display font-bold tracking-wide">{ticket.codigo}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-[150px]">
                {ticket.cliente?.nombre || 'Cliente'}
              </p>
            </div>
          </div>
          <Badge className={cn(config.bg, config.text, "font-display text-[10px] sm:text-xs px-1.5 sm:px-2")}>
            {config.label}
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-muted/50">
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium">{ticket.personas} pers.</span>
          </div>
          <div className={cn(
            "flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg",
            isActive ? "bg-success/10" : "bg-muted/50"
          )}>
            <Clock className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isActive ? "text-success" : "text-muted-foreground")} />
            <span className={cn(
              "text-xs sm:text-sm font-display font-bold",
              isActive && "text-success"
            )}>
              {formatTime(elapsedMinutes)}
            </span>
          </div>
        </div>

        {/* Actions - Icons only on small cards, text on larger */}
        <div className="flex gap-1.5 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 touch-target font-display h-9 sm:h-10 px-2 sm:px-3"
            onClick={() => navigate(`/ticket/${ticket.id}`)}
            title="Ver detalles"
          >
            <Eye className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline text-xs sm:text-sm">Ver</span>
          </Button>
          
          {isActive && onPause && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 touch-target font-display h-9 sm:h-10 px-2 sm:px-3 border-warning text-warning hover:bg-warning hover:text-white"
              onClick={() => onPause(ticket.id)}
              title="Pausar ticket"
            >
              <Pause className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline text-xs sm:text-sm">Pausar</span>
            </Button>
          )}
          
          {isPaused && onResume && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1 touch-target font-display h-9 sm:h-10 px-2 sm:px-3 border-success text-success hover:bg-success hover:text-white"
              onClick={() => onResume(ticket.id)}
              title="Continuar ticket"
            >
              <Play className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline text-xs sm:text-sm">Seguir</span>
            </Button>
          )}
          
          {(isActive || isPaused) && (
            <Button
              size="sm"
              className="flex-1 touch-target font-display h-9 sm:h-10 px-2 sm:px-3 bg-primary hover:bg-primary/90"
              onClick={() => navigate(`/cobro/${ticket.id}`)}
              title="Cobrar ticket"
            >
              <Flag className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline text-xs sm:text-sm">Cobrar</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
