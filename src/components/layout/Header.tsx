import { LogOut, User, Menu, Flag, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

const roleConfig: Record<string, { label: string; color: string }> = {
  operador: { label: 'Operador', color: 'bg-muted text-muted-foreground' },
  supervisor: { label: 'Supervisor', color: 'bg-warning/20 text-warning' },
  admin: { label: 'Admin', color: 'bg-primary/20 text-primary' },
  root: { label: 'Root', color: 'bg-destructive/20 text-destructive' },
};

export function Header({ onMenuClick }: HeaderProps) {
  const { profile, role, signOut } = useAuth();

  const roleInfo = roleConfig[role || ''] || roleConfig.operador;

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-inset-top">
      <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-4">
          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden touch-target"
              onClick={onMenuClick}
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          )}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-display font-bold text-base sm:text-lg shadow-lg shadow-primary/25">
              RC
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-success border-2 border-card" />
            </div>
            <div className="hidden xs:block">
              <h1 className="text-base sm:text-lg font-display font-bold tracking-wide leading-none">RCReyes</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Control de Pistas RC</p>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="touch-target gap-2 sm:gap-3 px-2 sm:pr-2">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium leading-none truncate max-w-[100px] lg:max-w-[150px]">{profile?.nombre || 'Usuario'}</p>
                <Badge variant="secondary" className={cn("mt-1 text-[10px] px-1.5 py-0", roleInfo.color)}>
                  <Shield className="h-2.5 w-2.5 mr-0.5" />
                  {roleInfo.label}
                </Badge>
              </div>
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-secondary border-2 border-border">
                <User className="h-4 w-4" />
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover z-50">
            <DropdownMenuLabel className="font-display">Mi cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground text-sm sm:hidden">
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{profile?.nombre}</span>
                <span>{profile?.email}</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground text-sm hidden sm:flex">
              {profile?.email}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive font-medium">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
