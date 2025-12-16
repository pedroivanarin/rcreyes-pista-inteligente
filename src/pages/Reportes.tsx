import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CalendarIcon, DollarSign, Clock, Users, Ticket, TrendingUp, Package, Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { DateRange } from 'react-day-picker';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Reportes() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const { data: stats, isLoading } = useQuery({
    queryKey: ['reportes-stats', dateRange?.from, dateRange?.to],
    queryFn: async () => {
      if (!dateRange?.from || !dateRange?.to) return null;

      const fromDate = startOfDay(dateRange.from).toISOString();
      const toDate = endOfDay(dateRange.to).toISOString();

      // Tickets en el rango de fechas
      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('id, monto_total, monto_tiempo, monto_servicios, total_tiempo_cobrado_minutos, estado, created_at, personas')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);
      
      if (ticketsError) throw ticketsError;

      // Servicios vendidos en el rango
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

      // Tickets activos actuales
      const { data: ticketsActivos, error: activosError } = await supabase
        .from('tickets')
        .select('id')
        .eq('estado', 'activo');
      
      if (activosError) throw activosError;

      // Calcular totales
      const ticketsCerrados = tickets?.filter(t => t.estado === 'cerrado') || [];
      const ventasTotales = ticketsCerrados.reduce((sum, t) => sum + (t.monto_total || 0), 0);
      const ingresosTiempo = ticketsCerrados.reduce((sum, t) => sum + (t.monto_tiempo || 0), 0);
      const ingresosServicios = ticketsCerrados.reduce((sum, t) => sum + (t.monto_servicios || 0), 0);
      const totalMinutosCobrados = ticketsCerrados.reduce((sum, t) => sum + (t.total_tiempo_cobrado_minutos || 0), 0);
      const totalHorasCobradas = totalMinutosCobrados / 60;
      const totalPersonas = tickets?.reduce((sum, t) => sum + (t.personas || 1), 0) || 0;

      // Agrupar por día para el gráfico
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

      // Agrupar servicios
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
    },
    enabled: !!dateRange?.from && !!dateRange?.to,
  });

  const statCards = [
    {
      title: 'Clientes Atendidos',
      value: stats?.totalPersonas || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Horas Cobradas',
      value: `${stats?.totalHorasCobradas || 0} hrs`,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Tickets Cerrados',
      value: stats?.ticketsCerrados || 0,
      icon: Ticket,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Ventas Totales',
      value: `$${(stats?.ventasTotales || 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
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
    
    const lines = [
      ['Reporte de Operaciones RCReyes'],
      [`Período: ${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`],
      [],
      ['RESUMEN GENERAL'],
      ['Métrica', 'Valor'],
      ['Clientes Atendidos', stats.totalPersonas],
      ['Tickets Cerrados', stats.ticketsCerrados],
      ['Tickets Cancelados', stats.ticketsCancelados],
      ['Horas Cobradas', stats.totalHorasCobradas],
      ['Ingresos por Tiempo', `$${stats.ingresosTiempo.toFixed(2)}`],
      ['Ingresos por Servicios', `$${stats.ingresosServicios.toFixed(2)}`],
      ['Ventas Totales', `$${stats.ventasTotales.toFixed(2)}`],
      [],
      ['DESGLOSE DIARIO'],
      ['Fecha', 'Clientes', 'Horas', 'Ingresos'],
      ...stats.datosGraficoDiario.map(d => [d.fecha, d.clientes, d.horas, `$${d.ingresos.toFixed(2)}`]),
      [],
      ['SERVICIOS MÁS SOLICITADOS'],
      ['Servicio', 'Cantidad', 'Ingresos'],
      ...stats.topServicios.map(s => [s.nombre, s.cantidad, `$${s.ingresos.toFixed(2)}`]),
    ];

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

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Sheet 1: Resumen General
    const resumenData = [
      ['REPORTE DE OPERACIONES RCREYES'],
      [`Período: ${periodo}`],
      [],
      ['RESUMEN GENERAL'],
      ['Métrica', 'Valor'],
      ['Clientes Atendidos', stats.totalPersonas],
      ['Tickets Cerrados', stats.ticketsCerrados],
      ['Tickets Cancelados', stats.ticketsCancelados],
      ['Horas Cobradas', stats.totalHorasCobradas],
      ['Ingresos por Tiempo', stats.ingresosTiempo],
      ['Ingresos por Servicios', stats.ingresosServicios],
      ['Ventas Totales', stats.ventasTotales],
    ];
    const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
    wsResumen['!cols'] = [{ wch: 25 }, { wch: 20 }];
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

    // Download
    XLSX.writeFile(wb, `reporte-rcreyes-${fromStr}-${toStr}.xlsx`);
    
    toast({ title: 'Exportado', description: 'Reporte Excel descargado exitosamente.' });
  };

  const exportToPDF = () => {
    if (!stats || !dateRange?.from || !dateRange?.to) return;

    const fromStr = format(dateRange.from, 'yyyy-MM-dd');
    const toStr = format(dateRange.to, 'yyyy-MM-dd');
    const periodo = `${format(dateRange.from, 'dd/MM/yyyy', { locale: es })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: es })}`;

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Operaciones RCReyes', 14, 20);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodo}`, 14, 28);
    
    // Resumen General
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen General', 14, 42);
    
    autoTable(doc, {
      startY: 46,
      head: [['Métrica', 'Valor']],
      body: [
        ['Clientes Atendidos', stats.totalPersonas.toString()],
        ['Tickets Cerrados', stats.ticketsCerrados.toString()],
        ['Tickets Cancelados', stats.ticketsCancelados.toString()],
        ['Horas Cobradas', `${stats.totalHorasCobradas} hrs`],
        ['Ingresos por Tiempo', `$${stats.ingresosTiempo.toFixed(2)}`],
        ['Ingresos por Servicios', `$${stats.ingresosServicios.toFixed(2)}`],
        ['Ventas Totales', `$${stats.ventasTotales.toFixed(2)}`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38] },
      margin: { left: 14 },
    });

    // Desglose Diario
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

    // Servicios más solicitados
    const finalY2 = (doc as any).lastAutoTable.finalY || 150;
    
    // Check if we need a new page
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

    // Footer
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
                    Últimos 7 días
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                  >
                    Últimos 30 días
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
                    <p className="text-2xl font-bold">{stat.value}</p>
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
