import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Plus, 
  Package, 
  DollarSign, 
  Users, 
  UserCheck,
  BarChart3,
  Settings,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  requiresAdmin?: boolean;
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Tablero' },
  { to: '/nuevo-ticket', icon: Plus, label: 'Nuevo Ticket' },
  { to: '/clientes', icon: UserCheck, label: 'Clientes', requiresAdmin: true },
  { to: '/servicios', icon: Package, label: 'Servicios', requiresAdmin: true },
  { to: '/tarifas', icon: DollarSign, label: 'Tarifas', requiresAdmin: true },
  { to: '/usuarios', icon: Users, label: 'Usuarios', requiresAdmin: true },
  { to: '/reportes', icon: BarChart3, label: 'Reportes', requiresAdmin: true },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { isAdmin } = useAuth();

  const filteredItems = navItems.filter(item => !item.requiresAdmin || isAdmin);

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-foreground/20 md:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-full w-64 transform border-r bg-sidebar transition-transform duration-200 md:relative md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b px-4 md:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
              RC
            </div>
            <span className="font-bold">RCReyes</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <nav className="flex flex-col gap-1 p-4">
          {filteredItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors touch-target",
                isActive 
                  ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
