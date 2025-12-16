import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  HelpCircle, LayoutDashboard, Plus, CalendarClock, UserCheck, 
  Package, DollarSign, Users, BarChart3, QrCode, Printer, Clock,
  Play, Pause, CheckCircle, XCircle, Crown, Shield
} from 'lucide-react';

interface GuideSection {
  id: string;
  title: string;
  icon: React.ElementType;
  adminOnly?: boolean;
  content: {
    description: string;
    steps?: string[];
    tips?: string[];
  };
}

const guideSections: GuideSection[] = [
  {
    id: 'dashboard',
    title: 'Tablero Principal',
    icon: LayoutDashboard,
    content: {
      description: 'El tablero muestra todos los tickets activos y pausados en tiempo real. Es tu centro de control para monitorear la actividad de la pista.',
      steps: [
        'Los tickets activos (En Pista) se muestran con borde verde y tiempo corriendo',
        'Los tickets pausados (Pit Stop) se muestran con borde amarillo',
        'Haz clic en cualquier ticket para ver sus detalles',
        'Usa el botón de pausa/reanudar para controlar el tiempo del ticket',
        'Escanea códigos QR con el botón de escáner para buscar tickets rápidamente',
      ],
      tips: [
        'El tiempo se actualiza automáticamente cada segundo',
        'Los tickets pausados no acumulan tiempo de cobro',
        'Puedes filtrar tickets por estado usando los botones superiores',
      ],
    },
  },
  {
    id: 'nuevo-ticket',
    title: 'Crear Nuevo Ticket',
    icon: Plus,
    content: {
      description: 'Registra la entrada de un nuevo cliente creando un ticket. El sistema generará automáticamente un código QR único.',
      steps: [
        'Selecciona o busca un cliente existente (debe estar registrado previamente)',
        'Elige la tarifa por hora que aplicará',
        'Indica el número de personas que ingresan',
        'Opcionalmente agrega servicios adicionales (rentas, snacks, etc.)',
        'Haz clic en "Crear Ticket" para confirmar',
        'Imprime el ticket con QR para entregarlo al cliente',
      ],
      tips: [
        'Si el cliente no existe, primero regístralo en el módulo de Clientes',
        'Los servicios de renta se descuentan del inventario automáticamente',
        'El código QR permite escanear el ticket para cobrar al salir',
      ],
    },
  },
  {
    id: 'cobro',
    title: 'Proceso de Cobro',
    icon: DollarSign,
    content: {
      description: 'Cuando el cliente termina, escanea su ticket QR o búscalo en el tablero para procesar el pago.',
      steps: [
        'Escanea el código QR del ticket o haz clic en el ticket desde el tablero',
        'Revisa el desglose de tiempo y servicios',
        'El sistema calcula automáticamente el total con descuentos de membresía',
        'Selecciona el método de pago (efectivo, tarjeta, transferencia)',
        'Confirma el cobro para cerrar el ticket',
        'Imprime el comprobante de salida si es necesario',
      ],
      tips: [
        'El tiempo mínimo de cobro es 1 hora',
        'Después de la primera hora, se cobra en bloques de 15 minutos',
        'Los primeros 5 minutos de cada bloque son de tolerancia',
        'Los descuentos de membresía se aplican automáticamente',
      ],
    },
  },
  {
    id: 'cierre-dia',
    title: 'Cierre de Día',
    icon: CalendarClock,
    content: {
      description: 'Al finalizar la jornada, realiza el cierre de día para generar un resumen de operaciones.',
      steps: [
        'Verifica que todos los tickets estén cerrados o justificados',
        'Revisa el resumen de tickets cerrados, cancelados y abiertos',
        'Agrega notas opcionales sobre la jornada',
        'Confirma el cierre para registrar el corte',
      ],
      tips: [
        'No puedes cerrar el día si hay tickets activos sin procesar',
        'El historial de cierres queda registrado para auditoría',
        'Puedes ver cierres anteriores en la lista del módulo',
      ],
    },
  },
  {
    id: 'clientes',
    title: 'Gestión de Clientes',
    icon: UserCheck,
    adminOnly: true,
    content: {
      description: 'Administra el registro de clientes y sus membresías. Los clientes deben estar registrados antes de crear tickets.',
      steps: [
        'Haz clic en "Nuevo Cliente" para registrar uno nuevo',
        'Ingresa nombre y teléfono (opcional)',
        'Asigna un nivel de membresía si corresponde',
        'El sistema genera automáticamente un código único',
        'Para editar, haz clic en el ícono de lápiz en la tarjeta del cliente',
      ],
      tips: [
        'Membresía Básica: 5% de descuento',
        'Membresía Premium: 10% de descuento',
        'Membresía VIP: 15% de descuento',
        'Usa los filtros para buscar clientes rápidamente',
      ],
    },
  },
  {
    id: 'servicios',
    title: 'Catálogo de Servicios',
    icon: Package,
    adminOnly: true,
    content: {
      description: 'Configura los servicios y productos que se pueden agregar a los tickets (rentas, snacks, accesorios, etc.).',
      steps: [
        'Haz clic en "Nuevo Servicio" para crear uno',
        'Define nombre, precio y tipo de costo',
        'Para servicios de renta, activa "Requiere Inventario" y define el stock',
        'Establece el máximo por ticket si es necesario',
        'Activa/desactiva servicios según disponibilidad',
      ],
      tips: [
        'Los servicios con inventario descuentan stock al agregarlos a tickets',
        'El stock se devuelve automáticamente al cerrar el ticket',
        'Puedes filtrar por tipo de costo y estado activo/inactivo',
      ],
    },
  },
  {
    id: 'tarifas',
    title: 'Tarifas por Hora',
    icon: Clock,
    adminOnly: true,
    content: {
      description: 'Define las tarifas de tiempo de pista que se aplicarán al calcular el cobro.',
      steps: [
        'Haz clic en "Nueva Tarifa" para crear una',
        'Define el nombre descriptivo (ej. "Tarifa Normal", "Tarifa Fin de Semana")',
        'Establece el precio por hora',
        'Configura los minutos mínimos y tipo de redondeo',
        'Activa/desactiva según necesidad',
      ],
      tips: [
        'Puedes tener múltiples tarifas para diferentes horarios o días',
        'El redondeo determina cómo se calculan los bloques de tiempo',
        'Solo las tarifas activas aparecen al crear tickets',
      ],
    },
  },
  {
    id: 'usuarios',
    title: 'Administración de Usuarios',
    icon: Users,
    adminOnly: true,
    content: {
      description: 'Gestiona los usuarios del sistema y sus permisos de acceso.',
      steps: [
        'Haz clic en "Nuevo Usuario" para crear una cuenta',
        'Ingresa nombre, correo y contraseña segura',
        'Asigna el rol correspondiente',
        'Para editar permisos, haz clic en el ícono de lápiz',
        'Puedes desactivar usuarios sin eliminarlos',
      ],
      tips: [
        'Operador: acceso básico (tablero, tickets, cierre)',
        'Supervisor: operador + puede modificar tickets de otros',
        'Admin: acceso completo a configuración y reportes',
        'Las contraseñas deben tener mínimo 8 caracteres, mayúscula, minúscula y número',
      ],
    },
  },
  {
    id: 'reportes',
    title: 'Reportes y Análisis',
    icon: BarChart3,
    adminOnly: true,
    content: {
      description: 'Visualiza estadísticas de operación y genera reportes exportables.',
      steps: [
        'Selecciona el rango de fechas a analizar',
        'Revisa las métricas principales (clientes, horas, ingresos)',
        'Analiza los gráficos de tendencias',
        'Exporta los datos en PDF, Excel o CSV según necesites',
      ],
      tips: [
        'Usa los atajos "Hoy", "7 días" o "30 días" para selección rápida',
        'El PDF incluye tablas formateadas listas para imprimir',
        'Excel genera múltiples hojas con diferentes vistas de datos',
        'Los reportes incluyen desglose por tiempo y servicios',
      ],
    },
  },
];

export default function Ayuda() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <HelpCircle className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Guía de Usuario</h1>
            <p className="text-muted-foreground">Aprende a usar cada módulo del sistema RCReyes</p>
          </div>
        </div>

        {/* Quick Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Referencia Rápida - Estados de Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20">
                <Play className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">En Pista</p>
                  <p className="text-sm text-muted-foreground">Tiempo corriendo</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Pause className="h-5 w-5 text-warning" />
                <div>
                  <p className="font-medium">Pit Stop</p>
                  <p className="text-sm text-muted-foreground">Tiempo pausado</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
                <CheckCircle className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Cerrado</p>
                  <p className="text-sm text-muted-foreground">Cobro completado</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <XCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Cancelado</p>
                  <p className="text-sm text-muted-foreground">Sin cobro</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles y Permisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 rounded-lg border">
                <Badge variant="outline" className="mb-2">Operador</Badge>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Ver tablero de tickets</li>
                  <li>• Crear y cerrar tickets</li>
                  <li>• Pausar/reanudar tickets propios</li>
                  <li>• Realizar cierre de día</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border">
                <Badge variant="secondary" className="mb-2">Supervisor</Badge>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Todo lo de Operador</li>
                  <li>• Modificar tickets de otros</li>
                  <li>• Cancelar tickets</li>
                  <li>• Ver historial extendido</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border">
                <Badge className="mb-2">Administrador</Badge>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Acceso completo al sistema</li>
                  <li>• Gestionar clientes y servicios</li>
                  <li>• Configurar tarifas</li>
                  <li>• Administrar usuarios</li>
                  <li>• Ver reportes y estadísticas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Membership Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Niveles de Membresía
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="p-4 rounded-lg border text-center">
                <Badge variant="outline" className="mb-2">Sin membresía</Badge>
                <p className="text-2xl font-bold">0%</p>
                <p className="text-sm text-muted-foreground">Sin descuento</p>
              </div>
              <div className="p-4 rounded-lg border text-center bg-blue-50 dark:bg-blue-950/20">
                <Badge className="mb-2 bg-blue-500">Básica</Badge>
                <p className="text-2xl font-bold text-blue-600">5%</p>
                <p className="text-sm text-muted-foreground">Descuento</p>
              </div>
              <div className="p-4 rounded-lg border text-center bg-purple-50 dark:bg-purple-950/20">
                <Badge className="mb-2 bg-purple-500">Premium</Badge>
                <p className="text-2xl font-bold text-purple-600">10%</p>
                <p className="text-sm text-muted-foreground">Descuento</p>
              </div>
              <div className="p-4 rounded-lg border text-center bg-amber-50 dark:bg-amber-950/20">
                <Badge className="mb-2 bg-amber-500">VIP</Badge>
                <p className="text-2xl font-bold text-amber-600">15%</p>
                <p className="text-sm text-muted-foreground">Descuento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Guides */}
        <Card>
          <CardHeader>
            <CardTitle>Guías Detalladas por Módulo</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {guideSections.map((section) => (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <section.icon className="h-5 w-5 text-primary" />
                      <span>{section.title}</span>
                      {section.adminOnly && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2 pl-8">
                      <p className="text-muted-foreground">{section.content.description}</p>
                      
                      {section.content.steps && (
                        <div>
                          <h4 className="font-medium mb-2">Pasos:</h4>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                            {section.content.steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      
                      {section.content.tips && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <h4 className="font-medium mb-2 text-primary">💡 Consejos:</h4>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {section.content.tips.map((tip, idx) => (
                              <li key={idx}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Printing Guide */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Impresión de Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              El sistema está optimizado para impresoras térmicas de 58mm y 80mm.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Ticket de Entrada</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Código QR único del ticket</li>
                  <li>• Nombre del cliente</li>
                  <li>• Hora de entrada</li>
                  <li>• Tarifa aplicada</li>
                  <li>• Servicios contratados</li>
                </ul>
              </div>
              <div className="p-4 rounded-lg border">
                <h4 className="font-medium mb-2">Comprobante de Salida</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Desglose de tiempo cobrado</li>
                  <li>• Servicios utilizados</li>
                  <li>• Subtotal y descuentos</li>
                  <li>• Total a pagar</li>
                  <li>• Método de pago</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
