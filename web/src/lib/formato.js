/** Texto del método de pago para mostrar en checklist / resumen. */
export function formatoPago(formaPago, monto) {
  if (!formaPago) return '—'
  if (/pagad[oa]/i.test(formaPago)) return 'Ya pagado'
  if (/solo entrega/i.test(formaPago)) return 'Sin cobro (solo entrega)'
  if (/efectivo/i.test(formaPago)) {
    return monto ? `Efectivo ($${Number(monto).toLocaleString('es-AR')})` : 'Efectivo'
  }
  return formaPago
}
