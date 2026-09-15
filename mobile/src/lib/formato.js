export function hoyISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

/** Texto del método de pago para mostrar en el resumen de entrega. */
export function formatoPago(formaPago, monto) {
  if (!formaPago) return '—'
  if (/pagad[oa]/i.test(formaPago)) return 'Ya pagado'
  if (/solo entrega/i.test(formaPago)) return 'Sin cobro (solo entrega)'
  if (/efectivo/i.test(formaPago)) {
    return monto ? `Pagó efectivo $${Number(monto).toLocaleString('es-AR')}` : 'Pagó efectivo'
  }
  return `Pagó por ${formaPago.toLowerCase()}`
}

/** "40lts AO — La Parrilla de Carlos — pagó por transferencia" */
export function resumenTexto({ litros, producto, cliente, formaPago, monto }) {
  return `${litros ?? '—'}lts ${producto} — ${cliente} — ${formatoPago(formaPago, monto)}`
}

/** Múltiplos de 20, de 20 a 1000 litros, para el selector (cubre también los pedidos grandes de zona TRANSPORTES). */
export const OPCIONES_LITROS = Array.from({ length: 50 }, (_, i) => (i + 1) * 20)
