// Tipos TypeScript para la base de datos RCReyes

export type AppRole = 'operador' | 'supervisor' | 'admin' | 'root';
export type TipoCliente = 'regular' | 'miembro' | 'invitado';
export type TipoMembresia = 'ninguna' | 'basica' | 'premium' | 'vip';
export type EstadoTicket = 'activo' | 'pausado' | 'cerrado' | 'cancelado';
export type TipoCosto = 'fijo' | 'por_tiempo' | 'paquete';
export type TipoRedondeo = 'arriba' | 'abajo' | 'estandar';
export type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface Cliente {
  id: string;
  codigo_cliente: string;
  nombre: string;
  tipo_cliente: TipoCliente;
  membresia: TipoMembresia;
  descuento_porcentaje: number;
  telefono?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export interface TarifaHora {
  id: string;
  nombre: string;
  precio_por_hora: number;
  activo: boolean;
  aplicable_desde?: string;
  aplicable_hasta?: string;
  minutos_minimos: number;
  tipo_redondeo: TipoRedondeo;
  created_at: string;
  updated_at: string;
}

export interface Servicio {
  id: string;
  nombre: string;
  descripcion?: string;
  tipo_costo: TipoCosto;
  precio: number;
  requiere_inventario: boolean;
  stock_actual?: number;
  maximo_por_ticket?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ticket {
  id: string;
  codigo: string;
  cliente_id: string;
  personas: number;
  estado: EstadoTicket;
  hora_entrada: string;
  hora_salida?: string;
  tarifa_hora_id: string;
  operador_entrada_id: string;
  operador_salida_id?: string;
  total_tiempo_cobrado_minutos?: number;
  monto_tiempo?: number;
  monto_servicios?: number;
  monto_total?: number;
  metodo_pago?: MetodoPago;
  motivo_cancelacion?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  cliente?: Cliente;
  tarifa_hora?: TarifaHora;
  operador_entrada?: Profile;
  operador_salida?: Profile;
  servicios?: TicketServicio[];
}

export interface TicketServicio {
  id: string;
  ticket_id: string;
  servicio_id: string;
  cantidad: number;
  precio_unitario: number;
  monto_total: number;
  notas?: string;
  created_at: string;
  // Relaciones
  servicio?: Servicio;
}

export interface PausaTicket {
  id: string;
  ticket_id: string;
  inicio_pausa: string;
  fin_pausa?: string;
  created_at: string;
}

export interface Auditoria {
  id: string;
  user_id: string;
  accion: string;
  entidad?: string;
  entidad_id?: string;
  detalle?: Record<string, unknown>;
  created_at: string;
}

// Tipos para cálculos
export interface CalculoTiempo {
  tiempo_real_minutos: number;
  tiempo_cobrado_minutos: number;
  costo_tiempo: number;
}

// Ticket con todas las relaciones expandidas
export interface TicketCompleto extends Ticket {
  cliente: Cliente;
  tarifa_hora: TarifaHora;
  servicios: TicketServicio[];
}
