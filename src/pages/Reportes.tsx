import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CalendarIcon, DollarSign, Clock, Users, Ticket, TrendingUp, TrendingDown, Package, Download, FileText, FileSpreadsheet, ChevronDown, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DateRange } from 'react-day-picker';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

interface PeriodStats {
  ticketsActivos: number;
  totalTickets: number;
  ticketsCerrados: number;
  ticketsCancelados: number;
  ventasTotales: number;
  ingresosTiempo: number;
  ingresosServicios: number;
  totalHorasCobradas: number;
  totalPersonas: number;
  datosGraficoDiario: { fecha: string; clientes: number; ingresos: number; horas: number }[];
  topServicios: { nombre: string; cantidad: number; ingresos: number }[];
}

const fetchPeriodStats = async (from: Date, to: Date): Promise<PeriodStats> => {
  const fromDate = startOfDay(from).toISOString();
  const toDate = endOfDay(to).toISOString();

  const { data: tickets, error: ticketsError } = await supabase
    .from('tickets')
    .select('id, monto_total, monto_tiempo, monto_servicios, total_tiempo_cobrado_minutos, estado, created_at, personas')
    .gte('created_at', fromDate)
    .lte('created_at', toDate);
  
  if (ticketsError) throw ticketsError;

  const { data: serviciosVendidos, error: serviciosError } = await supabase
    .from('ticket_servicios')
    .select(`
      cantidad,
      monto_total,
      servicio_id,
      servicios:servicio_id (nombre)
    `)
    .gte('created_at', fromDate)
    .lte('created_at', toDate);

  if (serviciosError) throw serviciosError;

  const { data: ticketsActivos, error: activosError } = await supabase
    .from('tickets')
    .select('id')
    .eq('estado', 'activo');
  
  if (activosError) throw activosError;

  const ticketsCerrados = tickets?.filter(t => t.estado === 'cerrado') || [];
  const ventasTotales = ticketsCerrados.reduce((sum, t) => sum + (t.monto_total || 0), 0);
  const ingresosTiempo = ticketsCerrados.reduce((sum, t) => sum + (t.monto_tiempo || 0), 0);
  const ingresosServicios = ticketsCerrados.reduce((sum, t) => sum + (t.monto_servicios || 0), 0);
  const totalMinutosCobrados = ticketsCerrados.reduce((sum, t) => sum + (t.total_tiempo_cobrado_minutos || 0), 0);
  const totalHorasCobradas = totalMinutosCobrados / 60;
  const totalPersonas = tickets?.reduce((sum, t) => sum + (t.personas || 1), 0) || 0;

  const ticketsPorDia: Record<string, { fecha: string; clientes: number; ingresos: number; horas: number }> = {};
  
  tickets?.forEach(ticket => {
    const fecha = format(new Date(ticket.created_at), 'yyyy-MM-dd');
    const fechaLabel = format(new Date(ticket.created_at), 'dd MMM', { locale: es });
    
    if (!ticketsPorDia[fecha]) {
      ticketsPorDia[fecha] = { fecha: fechaLabel, clientes: 0, ingresos: 0, horas: 0 };
    }
    
    ticketsPorDia[fecha].clientes += ticket.personas || 1;
    
    if (ticket.estado === 'cerrado') {
      ticketsPorDia[fecha].ingresos += ticket.monto_total || 0;
      ticketsPorDia[fecha].horas += (ticket.total_tiempo_cobrado_minutos || 0) / 60;
    }
  });

  const datosGraficoDiario = Object.values(ticketsPorDia).map(d => ({
    ...d,
    ingresos: Math.round(d.ingresos * 100) / 100,
    horas: Math.round(d.horas * 10) / 10,
  }));

  const serviciosAgrupados: Record<string, { nombre: string; cantidad: number; ingresos: number }> = {};
  
  serviciosVendidos?.forEach((sv: any) => {
    const nombre = sv.servicios?.nombre || 'Servicio desconocido';
    if (!serviciosAgrupados[sv.servicio_id]) {
      serviciosAgrupados[sv.servicio_id] = { nombre, cantidad: 0, ingresos: 0 };
    }
    serviciosAgrupados[sv.servicio_id].cantidad += sv.cantidad;
    serviciosAgrupados[sv.servicio_id].ingresos += sv.monto_total || 0;
  });

  const topServicios = Object.values(serviciosAgrupados)
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5);

  return {
    ticketsActivos: ticketsActivos?.length || 0,
    totalTickets: tickets?.length || 0,
    ticketsCerrados: ticketsCerrados.length,
    ticketsCancelados: tickets?.filter(t => t.estado === 'cancelado').length || 0,
    ventasTotales,
    ingresosTiempo,
    ingresosServicios,
    totalHorasCobradas: Math.round(totalHorasCobradas * 10) / 10,
    totalPersonas,
    datosGraficoDiario,
    topServicios,
  };
};

const calculatePercentageChange = (current: number, previous: number): number | null => {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
};

const ChangeIndicator = ({ current, previous, isCurrency = false }: { current: number; previous: number; isCurrency?: boolean }) => {
  const change = calculatePercentageChange(current, previous);
  
  if (change === null) return null;
  
  const isPositive = change > 0;
  const isNeutral = change === 0;
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium",
      isPositive ? "text-green-600" : isNeutral ? "text-muted-foreground" : "text-red-600"
    )}>
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : isNeutral ? (
        <Minus className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      <span>{isPositive ? '+' : ''}{change}%</span>
      <span className="text-muted-foreground font-normal">
        vs {isCurrency ? `$${previous.toFixed(2)}` : previous}
      </span>
    </div>
  );
};

export default function Reportes() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareDateRange, setCompareDateRange] = useState<DateRange | undefined>();

  // Auto-calculate comparison period based on selected range
  const getAutoPreviousPeriod = (): DateRange | undefined => {
    if (!dateRange?.from || !dateRange?.to) return undefined;
    const days = differenceInDays(dateRange.to, dateRange.from);
    return {
      from: subDays(dateRange.from, days + 1),
      to: subDays(dateRange.from, 1),
    };
  };

  const effectiveCompareRange = compareDateRange || getAutoPreviousPeriod();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['reportes-stats', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return null;
      return fetchPeriodStats(dateRange.from, dateRange.to);
    },
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  const { data: compareStats, isLoading: isLoadingCompare } = useQuery({
    queryKey: ['reportes-compare-stats', effectiveCompareRange?.from, effectiveCompareRange?.to],
    queryFn: async () => {
      if (!effectiveCompareRange?.from || !effectiveCompareRange?.to) return null;
      return fetchPeriodStats(effectiveCompareRange.from, effectiveCompareRange.to);
    },
    enabled: compareEnabled && !!effectiveCompareRange?.from && !!effectiveCompareRange?.to,
  });

  const statCards = [
    {
      title: 'Clientes Atendidos',
      value: stats?.totalPersonas || 0,
      compareValue: compareStats?.totalPersonas || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Horas Cobradas',
      value: stats?.totalHorasCobradas || 0,
      compareValue: compareStats?.totalHorasCobradas || 0,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      suffix: ' hrs',
    },
    {
      title: 'Tickets Cerrados',
      value: stats?.ticketsCerrados || 0,
      compareValue: compareStats?.ticketsCerrados || 0,
      icon: Ticket,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Ventas Totales',
      value: stats?.ventasTotales || 0,
      compareValue: compareStats?.ventasTotales || 0,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      isCurrency: true,
    },
  ];

  const ingresosDesglose = [
    { name: 'Tiempo', value: stats?.ingresosTiempo || 0 },
    { name: 'Servicios', value: stats?.ingresosServicios || 0 },
  ].filter(d => d.value > 0);

  const exportToCSV = () => {
    if (!stats || !dateRange?.from || !dateRange?.to) return;

    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    
    const lines: (string | number)[][] = [
      ['Reporte de Operaciones RCReyes'],
      [`Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`],
      [],
      ['RESUMEN GENERAL'],
      compareEnabled && compareStats 
        ? ['Métrica', 'Valor Actual', 'Valor Anterior', 'Cambio %']
        : ['Métrica', 'Valor'],
    ];

    const metricas = [
      ['Clientes Atendidos', stats.totalPersonas, compareStats?.totalPersonas],
      ['Tickets Cerrados', stats.ticketsCerrados, compareStats?.ticketsCerrados],
      ['Tickets Cancelados', stats.ticketsCancelados, compareStats?.ticketsCancelados],
      ['Horas Cobradas', stats.totalHorasCobradas, compareStats?.totalHorasCobradas],
      ['Ingresos por Tiempo', `$${stats.ingresosTiempo.toFixed(2)}`, compareStats ? `$${compareStats.ingresosTiempo.toFixed(2)}` : ''],
      ['Ingresos por Servicios', `$${stats.ingresosServicios.toFixed(2)}`, compareStats ? `$${compareStats.ingresosServicios.toFixed(2)}` : ''],
      ['Ventas Totales', `$${stats.ventasTotales.toFixed(2)}`, compareStats ? `$${compareStats.ventasTotales.toFixed(2)}` : ''],
    ];

    metricas.forEach(m => {
      if (compareEnabled && compareStats) {
        const change = calculatePercentageChange(Number(m[1]) || 0, Number(m[2]) || 0);
        lines.push([m[0] as string, m[1], m[2] || '-', change !== null ? `${change}%` : '-']);
      } else {
        lines.push([m[0] as string, m[1]]);
      }
    });

    lines.push([]);
    lines.push(['DESGLOSE DIARIO']);
    lines.push(['Fecha', 'Clientes', 'Horas', 'Ingresos']);
    stats.datosGraficoDiario.forEach(d => lines.push([d.fecha, d.clientes, d.horas, `$${d.ingresos.toFixed(2)}`]));
    lines.push([]);
    lines.push(['SERVICIOS MÁS SOLICITADOS']);
    lines.push(['Servicio', 'Cantidad', 'Ingresos']);
    stats.topServicios.forEach(s => lines.push([s.nombre, s.cantidad, `$${s.ingresos.toFixed(2)}`]));

    const csvContent = lines.map(row => row.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reporte-rcreyes-${fromStr}-${toStr}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({ title: 'Exportado', description: 'Reporte CSV descargado exitosamente.' });
  };

  const exportToXLSX = () => {
    if (!stats || !dateRange?.from || !dateRange?.to) return;

    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const periodo = `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`;

    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen General
    const resumenData: (string | number)[][] = [
      ['REPORTE DE OPERACIONES RCREYES'],
      [`Período: ${periodo}`],
    ];
    
    if (compareEnabled && compareStats && effectiveCompareRange?.from && effectiveCompareRange?.to) {
      resumenData.push([`Comparando con: ${format(effectiveCompareRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(effectiveCompareRange.to, 'dd/MM/yyyy', { locale: es })}`]);
    }
    
    resumenData.push([]);
    resumenData.push(['RESUMEN GENERAL']);
    
    if (compareEnabled && compareStats) {
      resumenData.push(['Métrica', 'Actual', 'Anterior', 'Cambio %']);
      resumenData.push(['Clientes Atendidos', stats.totalPersonas, compareStats.totalPersonas, `${calculatePercentageChange(stats.totalPersonas, compareStats.totalPersonas) || 0}%`]);
      resumenData.push(['Tickets Cerrados', stats.ticketsCerrados, compareStats.ticketsCerrados, `${calculatePercentageChange(stats.ticketsCerrados, compareStats.ticketsCerrados) || 0}%`]);
      resumenData.push(['Tickets Cancelados', stats.ticketsCancelados, compareStats.ticketsCancelados, `${calculatePercentageChange(stats.ticketsCancelados, compareStats.ticketsCancelados) || 0}%`]);
      resumenData.push(['Horas Cobradas', stats.totalHorasCobradas, compareStats.totalHorasCobradas, `${calculatePercentageChange(stats.totalHorasCobradas, compareStats.totalHorasCobradas) || 0}%`]);
      resumenData.push(['Ingresos por Tiempo', stats.ingresosTiempo, compareStats.ingresosTiempo, `${calculatePercentageChange(stats.ingresosTiempo, compareStats.ingresosTiempo) || 0}%`]);
      resumenData.push(['Ingresos por Servicios', stats.ingresosServicios, compareStats.ingresosServicios, `${calculatePercentageChange(stats.ingresosServicios, compareStats.ingresosServicios) || 0}%`]);
      resumenData.push(['Ventas Totales', stats.ventasTotales, compareStats.ventasTotales, `${calculatePercentageChange(stats.ventasTotales, compareStats.ventasTotales) || 0}%`]);
    } else {
      resumenData.push(['Métrica', 'Valor']);
      resumenData.push(['Clientes Atendidos', stats.totalPersonas]);
      resumenData.push(['Tickets Cerrados', stats.ticketsCerrados]);
      resumenData.push(['Tickets Cancelados', stats.ticketsCancelados]);
      resumenData.push(['Horas Cobradas', stats.totalHorasCobradas]);
      resumenData.push(['Ingresos por Tiempo', stats.ingresosTiempo]);
      resumenData.push(['Ingresos por Servicios', stats.ingresosServicios]);
      resumenData.push(['Ventas Totales', stats.ventasTotales]);
    }
    
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Sheet 2: Desglose Diario
    const diarioData = [
      ['DESGLOSE DIARIO'],
      ['Fecha', 'Clientes', 'Horas', 'Ingresos'],
      ...stats.datosGraficoDiario.map(d => [d.fecha, d.clientes, d.horas, d.ingresos]),
    ];
    const wsDiario = XLSX.utils.aoa_to_sheet(diarioData);
    wsDiario['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDiario, 'Diario');

    // Sheet 3: Servicios
    const serviciosData = [
      ['SERVICIOS MÁS SOLICITADOS'],
      ['Servicio', 'Cantidad', 'Ingresos'],
      ...stats.topServicios.map(s => [s.nombre, s.cantidad, s.ingresos]),
    ];
    const wsServicios = XLSX.utils.aoa_to_sheet(serviciosData);
    wsServicios['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsServicios, 'Servicios');

    XLSX.writeFile(wb, `reporte-rcreyes-${fromStr}-${toStr}.xlsx`);
    
    toast({ title: 'Exportado', description: 'Reporte Excel descargado exitosamente.' });
  };

  const exportToPDF = () => {
    if (!stats || !dateRange?.from || !dateRange?.to) return;

    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const periodo = `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`;

    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Operaciones RCReyes', 14, 20);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodo}`, 14, 28);
    
    if (compareEnabled && compareStats && effectiveCompareRange?.from && effectiveCompareRange?.to) {
      doc.text(`Comparando con: ${format(effectiveCompareRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(effectiveCompareRange.to, 'dd/MM/yyyy', { locale: es })}`, 14, 34);
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen General', 14, compareEnabled ? 46 : 42);
    
    const tableHead = compareEnabled && compareStats 
      ? [['Métrica', 'Actual', 'Anterior', 'Cambio']]
      : [['Métrica', 'Valor']];
    
    const tableBody = compareEnabled && compareStats ? [
      ['Clientes Atendidos', stats.totalPersonas.toString(), compareStats.totalPersonas.toString(), `${calculatePercentageChange(stats.totalPersonas, compareStats.totalPersonas) || 0}%`],
      ['Tickets Cerrados', stats.ticketsCerrados.toString(), compareStats.ticketsCerrados.toString(), `${calculatePercentageChange(stats.ticketsCerrados, compareStats.ticketsCerrados) || 0}%`],
      ['Tickets Cancelados', stats.ticketsCancelados.toString(), compareStats.ticketsCancelados.toString(), `${calculatePercentageChange(stats.ticketsCancelados, compareStats.ticketsCancelados) || 0}%`],
      ['Horas Cobradas', `${stats.totalHorasCobradas} hrs`, `${compareStats.totalHorasCobradas} hrs`, `${calculatePercentageChange(stats.totalHorasCobradas, compareStats.totalHorasCobradas) || 0}%`],
      ['Ingresos por Tiempo', `$${stats.ingresosTiempo.toFixed(2)}`, `$${compareStats.ingresosTiempo.toFixed(2)}`, `${calculatePercentageChange(stats.ingresosTiempo, compareStats.ingresosTiempo) || 0}%`],
      ['Ingresos por Servicios', `$${stats.ingresosServicios.toFixed(2)}`, `$${compareStats.ingresosServicios.toFixed(2)}`, `${calculatePercentageChange(stats.ingresosServicios, compareStats.ingresosServicios) || 0}%`],
      ['Ventas Totales', `$${stats.ventasTotales.toFixed(2)}`, `$${compareStats.ventasTotales.toFixed(2)}`, `${calculatePercentageChange(stats.ventasTotales, compareStats.ventasTotales) || 0}%`],
    ] : [
      ['Clientes Atendidos', stats.totalPersonas.toString()],
      ['Tickets Cerrados', stats.ticketsCerrados.toString()],
      ['Tickets Cancelados', stats.ticketsCancelados.toString()],
      ['Horas Cobradas', `${stats.totalHorasCobradas} hrs`],
      ['Ingresos por Tiempo', `$${stats.ingresosTiempo.toFixed(2)}`],
      ['Ingresos por Servicios', `$${stats.ingresosServicios.toFixed(2)}`],
      ['Ventas Totales', `$${stats.ventasTotales.toFixed(2)}`],
    ];
    
    autoTable(doc, {
      startY: compareEnabled ? 50 : 46,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 14 },
    });

    const finalY1 = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Desglose Diario', 14, finalY1 + 12);
    
    autoTable(doc, {
      startY: finalY1 + 16,
      head: [['Fecha', 'Clientes', 'Horas', 'Ingresos']],
      body: stats.datosGraficoDiario.map(d => [
        d.fecha,
        d.clientes.toString(),
        d.horas.toString(),
        `$${d.ingresos.toFixed(2)}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 14 },
    });

    const finalY2 = (doc as any).lastAutoTable.finalY || 150;
    
    if (finalY2 > 230) {
      doc.addPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Servicios Más Solicitados', 14, 20);
      
      autoTable(doc, {
        startY: 24,
        head: [['Servicio', 'Cantidad', 'Ingresos']],
        body: stats.topServicios.map(s => [
          s.nombre,
          s.cantidad.toString(),
          `$${s.ingresos.toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] },
        margin: { left: 14 },
      });
    } else {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Servicios Más Solicitados', 14, finalY2 + 12);
      
      autoTable(doc, {
        startY: finalY2 + 16,
        head: [['Servicio', 'Cantidad', 'Ingresos']],
        body: stats.topServicios.map(s => [
          s.nombre,
          s.cantidad.toString(),
          `$${s.ingresos.toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] },
        margin: { left: 14 },
      });
    }

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es })} - Página ${i} de ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`reporte-rcreyes-${fromStr}-${toStr}.pdf`);
    
    toast({ title: 'Exportado', description: 'Reporte PDF descargado exitosamente.' });
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Reportes</h1>
              <p className="text-muted-foreground">Análisis de operaciones</p>
            </div>
            
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="touch-button justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd MMM", { locale: es })} - {format(dateRange.to, "dd MMM yyyy", { locale: es })}
                        </>
                      ) : (
                        format(dateRange.from, "dd MMM yyyy", { locale: es })
                      )
                    ) : (
                      <span>Seleccionar fechas</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    locale={es}
                    className="pointer-events-auto"
                  />
                  <div className="p-3 border-t flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setDateRange({ from: new Date(), to: new Date() })}
                    >
                      Hoy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                    >
                      7 días
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                    >
                      30 días
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    disabled={!stats || isLoading}
                    className="touch-button"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Exportar
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover">
                  <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4 text-destructive" />
                    Exportar PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToXLSX} className="cursor-pointer">
                    <FileSpreadsheet className="mr-2 h-4 w-4 text-success" />
                    Exportar Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={exportToCSV} className="cursor-pointer">
                    <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                    Exportar CSV
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Comparison controls */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch 
                  id="compare-mode" 
                  checked={compareEnabled} 
                  onCheckedChange={(checked) => {
                    setCompareEnabled(checked);
                    if (!checked) setCompareDateRange(undefined);
                  }}
                />
                <Label htmlFor="compare-mode" className="font-medium">Comparar con período anterior</Label>
              </div>
              
              {compareEnabled && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Comparando con:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {effectiveCompareRange?.from && effectiveCompareRange?.to ? (
                          <>
                            {format(effectiveCompareRange.from, "dd MMM", { locale: es })} - {format(effectiveCompareRange.to, "dd MMM", { locale: es })}
                          </>
                        ) : (
                          'Período automático'
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={effectiveCompareRange?.from}
                        selected={compareDateRange || effectiveCompareRange}
                        onSelect={setCompareDateRange}
                        numberOfMonths={1}
                        locale={es}
                        className="pointer-events-auto"
                      />
                      <div className="p-3 border-t">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={() => setCompareDateRange(undefined)}
                        >
                          Usar período automático
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  {isLoadingCompare && (
                    <span className="text-xs text-muted-foreground">Cargando comparación...</span>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando...</div>
        ) : (
          <>
            {/* Tarjetas de resumen */}
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
                    <p className="text-2xl font-bold">
                      {stat.isCurrency ? `$${stat.value.toFixed(2)}` : `${stat.value}${stat.suffix || ''}`}
                    </p>
                    {compareEnabled && compareStats && (
                      <ChangeIndicator 
                        current={stat.value} 
                        previous={stat.compareValue} 
                        isCurrency={stat.isCurrency}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Gráfico de clientes e ingresos por día */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Clientes e Ingresos por Día</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats?.datosGraficoDiario && stats.datosGraficoDiario.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.datosGraficoDiario}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="fecha" className="text-xs" />
                        <YAxis yAxisId="left" orientation="left" className="text-xs" />
                        <YAxis yAxisId="right" orientation="right" className="text-xs" />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === 'ingresos') return [`$${value.toFixed(2)}`, 'Ingresos'];
                            if (name === 'clientes') return [value, 'Clientes'];
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar yAxisId="left" dataKey="clientes" fill="hsl(var(--primary))" name="Clientes" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="right" dataKey="ingresos" fill="hsl(var(--chart-2))" name="Ingresos ($)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-12">No hay datos para mostrar</p>
                  )}
                </CardContent>
              </Card>

              {/* Desglose de ingresos */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Desglose de Ingresos</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {ingresosDesglose.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={ingresosDesglose}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => `${name}: $${value.toFixed(2)}`}
                        >
                          {ingresosDesglose.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px'
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-12">No hay ingresos en este período</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Servicios más solicitados */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  <CardTitle>Servicios Más Solicitados</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {stats?.topServicios && stats.topServicios.length > 0 ? (
                  <div className="space-y-4">
                    {stats.topServicios.map((servicio, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium">{servicio.nombre}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{servicio.cantidad} unidades</p>
                          <p className="text-sm text-muted-foreground">${servicio.ingresos.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay servicios vendidos en este período</p>
                )}
              </CardContent>
            </Card>

            {/* Info adicional */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Activos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-blue-600">{stats?.ticketsActivos || 0}</p>
                  <p className="text-xs text-muted-foreground">En este momento</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Tickets Cancelados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-red-600">{stats?.ticketsCancelados || 0}</p>
                  {compareEnabled && compareStats && (
                    <ChangeIndicator 
                      current={stats?.ticketsCancelados || 0} 
                      previous={compareStats.ticketsCancelados}
                    />
                  )}
                  <p className="text-xs text-muted-foreground">En el período seleccionado</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Promedio por Ticket</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-emerald-600">
                    ${stats?.ticketsCerrados ? ((stats.ventasTotales || 0) / stats.ticketsCerrados).toFixed(2) : '0.00'}
                  </p>
                  {compareEnabled && compareStats && compareStats.ticketsCerrados > 0 && (
                    <ChangeIndicator 
                      current={stats?.ticketsCerrados ? (stats.ventasTotales / stats.ticketsCerrados) : 0} 
                      previous={compareStats.ventasTotales / compareStats.ticketsCerrados}
                      isCurrency
                    />
                  )}
                  <p className="text-xs text-muted-foreground">Ticket promedio</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
