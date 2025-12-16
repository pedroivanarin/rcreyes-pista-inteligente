# Plan de Pruebas Q&A - Sistema RCReyes
**Última actualización:** 16 de Diciembre 2025

---

## 📋 Resumen de Cobertura

| Módulo | Casos | Estado |
|--------|-------|--------|
| Tickets | 5 | ⬜ Pendiente |
| Cobros | 3 | ⬜ Pendiente |
| Clientes | 3 | ⬜ Pendiente |
| Servicios | 2 | ⬜ Pendiente |
| Reportes | 2 | ⬜ Pendiente |

---

## 🎫 Módulo: Tickets

### TC-001: Crear ticket básico sin servicios
**Prioridad:** Alta  
**Precondiciones:** Usuario autenticado, tarifa activa existente

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a Dashboard → "Nuevo Ticket" | Formulario de nuevo ticket visible |
| 2 | Buscar cliente existente o crear nuevo | Cliente seleccionado |
| 3 | Establecer número de personas: 2 | Campo actualizado |
| 4 | Click en "Crear Ticket" | Redirección a detalle del ticket |
| 5 | Verificar en Dashboard | Ticket aparece en "En Pista" con estado activo |

**Validaciones:**
- [ ] Código de ticket generado (formato TKT-XXXXX)
- [ ] Hora de entrada registrada correctamente
- [ ] Cliente asociado visible
- [ ] QR code generado

---

### TC-002: Crear ticket con servicios de inventario
**Prioridad:** Alta  
**Precondiciones:** Servicio con `requiere_inventario = true` y stock > 0

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Crear nuevo ticket | Formulario visible |
| 2 | Seleccionar cliente | Cliente asociado |
| 3 | Agregar servicio de renta (ej: Auto RC) | Servicio añadido con cantidad 1 |
| 4 | Verificar badge de stock | Muestra "Stock: X disponibles" |
| 5 | Incrementar cantidad al máximo | Respeta límite de stock |
| 6 | Crear ticket | Ticket creado exitosamente |
| 7 | Verificar stock del servicio | Stock decrementado en cantidad seleccionada |

**Validaciones:**
- [ ] No permite seleccionar más del stock disponible
- [ ] Stock se decrementa atómicamente
- [ ] Si otro usuario tomó el último, muestra error

---

### TC-003: Pausar ticket (Pit Stop)
**Prioridad:** Alta  
**Precondiciones:** Ticket activo existente

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | En Dashboard, localizar ticket activo | Ticket visible en "En Pista" |
| 2 | Click en botón "Pausar" | Confirmación solicitada |
| 3 | Confirmar pausa | Ticket cambia a estado "pausado" |
| 4 | Verificar Dashboard | Ticket aparece en sección "Pit Stop" |

**Validaciones:**
- [ ] Registro en tabla `pausas_ticket` con `inicio_pausa`
- [ ] Estado cambia de "activo" a "pausado"
- [ ] Operadores pueden pausar (no solo supervisores)

---

### TC-004: Reanudar ticket pausado
**Prioridad:** Alta  
**Precondiciones:** Ticket en estado "pausado"

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | En Dashboard, sección "Pit Stop" | Ticket pausado visible |
| 2 | Click en botón "Reanudar" | Ticket cambia a estado "activo" |
| 3 | Verificar Dashboard | Ticket vuelve a "En Pista" |

**Validaciones:**
- [ ] Registro en `pausas_ticket` actualizado con `fin_pausa`
- [ ] Tiempo de pausa no se cobra (verificar en cobro)

---

### TC-005: Crear ticket con múltiples servicios
**Prioridad:** Media  
**Precondiciones:** Al menos 3 servicios activos

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Crear nuevo ticket | Formulario visible |
| 2 | Seleccionar cliente con membresía | Cliente VIP/Premium seleccionado |
| 3 | Agregar 3 servicios diferentes | Servicios listados con cantidades |
| 4 | Ajustar cantidades | Cantidades respetan máximos |
| 5 | Crear ticket | Ticket creado con todos los servicios |

**Validaciones:**
- [ ] Cada servicio registrado en `ticket_servicios`
- [ ] Precios unitarios correctos
- [ ] Montos totales calculados correctamente

---

## 💰 Módulo: Cobros

### TC-006: Cobro sin descuento (cliente regular)
**Prioridad:** Alta  
**Precondiciones:** Ticket activo con cliente sin membresía

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a cobro del ticket | Página de cobro visible |
| 2 | Verificar desglose | Tiempo + Servicios = Total |
| 3 | NO debe aparecer línea de descuento | Sin sección de descuento |
| 4 | Seleccionar método de pago | Método seleccionado |
| 5 | Confirmar cobro | Ticket cerrado exitosamente |

**Validaciones:**
- [ ] `monto_total` = `monto_tiempo` + `monto_servicios`
- [ ] Sin descuento aplicado
- [ ] Auditoría registrada

---

### TC-007: Cobro con descuento de membresía
**Prioridad:** Alta  
**Precondiciones:** Ticket con cliente membresía VIP (15%)

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a cobro del ticket | Página de cobro visible |
| 2 | Verificar badge de membresía | Badge "VIP" visible junto al cliente |
| 3 | Verificar línea de descuento | "Descuento VIP (15%): -$XX.XX" |
| 4 | Verificar total | Total = Subtotal - Descuento |
| 5 | Confirmar cobro | Ticket cerrado con descuento |

**Validaciones:**
- [ ] Descuento calculado correctamente (15% del subtotal)
- [ ] Ícono de corona visible
- [ ] Descuento registrado en auditoría

---

### TC-008: Cobro con tiempo pausado
**Prioridad:** Alta  
**Precondiciones:** Ticket que fue pausado y reanudado

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a cobro del ticket | Página de cobro visible |
| 2 | Verificar desglose de tiempo | Tiempo real vs Tiempo cobrable |
| 3 | Confirmar que pausa no se cobra | Tiempo pausado excluido |

**Validaciones:**
- [ ] `tiempo_cobrado_minutos` < `tiempo_real_minutos`
- [ ] Función `calcular_tiempo_cobrable` considera pausas

---

## 👥 Módulo: Clientes

### TC-009: Paginación de clientes
**Prioridad:** Media  
**Precondiciones:** Más de 12 clientes en sistema

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a Clientes | Lista de clientes visible |
| 2 | Verificar cantidad inicial | Máximo 12 clientes por página |
| 3 | Click "Siguiente" | Página 2 con más clientes |
| 4 | Click "Anterior" | Vuelve a página 1 |
| 5 | Verificar indicador | "Página X de Y" correcto |

**Validaciones:**
- [ ] 12 items por página
- [ ] Navegación funcional
- [ ] No muestra "Anterior" en página 1
- [ ] No muestra "Siguiente" en última página

---

### TC-010: Búsqueda con reset de paginación
**Prioridad:** Media  
**Precondiciones:** Múltiples páginas de clientes

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a página 2 de clientes | Página 2 visible |
| 2 | Escribir en búsqueda | Resultados filtrados |
| 3 | Verificar paginación | Reset a página 1 |

**Validaciones:**
- [ ] Búsqueda filtra por nombre y código
- [ ] Paginación se reinicia al buscar

---

### TC-011: Crear cliente con membresía
**Prioridad:** Alta  
**Precondiciones:** Usuario admin autenticado

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a Clientes → "Nuevo Cliente" | Formulario visible |
| 2 | Llenar datos básicos | Campos completados |
| 3 | Seleccionar membresía "Premium" | Membresía seleccionada |
| 4 | Guardar cliente | Cliente creado |
| 5 | Verificar código generado | Código RCM-XXXXX asignado |

**Validaciones:**
- [ ] Código único generado
- [ ] Descuento asociado (10% para Premium)
- [ ] Cliente visible en lista

---

## 🛠️ Módulo: Servicios

### TC-012: Crear servicio con inventario
**Prioridad:** Media  
**Precondiciones:** Usuario admin

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a Servicios → "Nuevo Servicio" | Formulario visible |
| 2 | Activar "Requiere inventario" | Campos de stock visibles |
| 3 | Establecer stock inicial: 5 | Stock configurado |
| 4 | Guardar servicio | Servicio creado |

**Validaciones:**
- [ ] `requiere_inventario = true`
- [ ] `stock_actual = 5`
- [ ] Badge de stock visible en lista

---

### TC-013: Devolución de inventario al cerrar ticket
**Prioridad:** Alta  
**Precondiciones:** Ticket con servicio de renta cerrado

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Verificar stock antes del cobro | Stock = X |
| 2 | Cobrar ticket con renta | Ticket cerrado |
| 3 | Verificar stock después | Stock = X + cantidad rentada |

**Validaciones:**
- [ ] Stock incrementado automáticamente
- [ ] Solo aplica a servicios con `requiere_inventario`

---

## 📊 Módulo: Reportes

### TC-014: Exportar reporte a CSV
**Prioridad:** Media  
**Precondiciones:** Datos de cierres existentes

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a Reportes | Página de reportes visible |
| 2 | Seleccionar rango de fechas | Datos filtrados |
| 3 | Click en botón de descarga | Archivo CSV descargado |
| 4 | Abrir CSV | Datos correctos |

**Validaciones:**
- [ ] Nombre archivo: `reporte_YYYY-MM-DD_YYYY-MM-DD.csv`
- [ ] Columnas: Fecha, Cerrados, Cancelados, Abiertos, Total
- [ ] Formato numérico correcto

---

### TC-015: Visualización de gráficas
**Prioridad:** Baja  
**Precondiciones:** Datos históricos existentes

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Ir a Reportes | Gráficas visibles |
| 2 | Cambiar rango de fechas | Gráficas actualizadas |
| 3 | Verificar tooltips | Información correcta al hover |

**Validaciones:**
- [ ] Gráfica de barras con tickets
- [ ] Gráfica de línea con ingresos
- [ ] Datos coinciden con tabla

---

## 🔐 Casos de Seguridad

### TC-SEC-01: Operador no puede acceder a admin
**Prioridad:** Alta

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Login como operador | Dashboard visible |
| 2 | Verificar sidebar | Sin opciones admin (Servicios, Tarifas, Usuarios) |
| 3 | Navegar directo a /servicios | Redirección a /dashboard |

---

### TC-SEC-02: RLS previene modificación no autorizada
**Prioridad:** Alta

| Paso | Acción | Resultado Esperado |
|------|--------|-------------------|
| 1 | Como operador, intentar editar cliente | Error de permisos |
| 2 | Como operador, intentar eliminar ticket | Error de permisos |

---

## 📝 Registro de Ejecución

| Fecha | Ejecutor | Casos Pasados | Casos Fallidos | Notas |
|-------|----------|---------------|----------------|-------|
| | | | | |

---

## 🐛 Bugs Encontrados

| ID | Caso | Descripción | Severidad | Estado |
|----|------|-------------|-----------|--------|
| | | | | |
