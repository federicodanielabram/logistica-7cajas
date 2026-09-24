// Duplicada en mobile/src/lib/formato.js — la usa el parser (web) para decidir
// si una fila viene con el pago pendiente de dividir, y acá para no mostrarla
// como si ya fuera un solo método definido.
export function necesitaDividirPago(formaPago) {
  if (!formaPago || formaPago.includes('$')) return false // ya viene resuelta con montos
  return /efectivo/i.test(formaPago) && /transferencia/i.test(formaPago)
}

/** Texto del método de pago para mostrar en checklist / resumen. */
export function formatoPago(formaPago, monto, pagoDividido) {
  if (!formaPago) return '—'
  if (pagoDividido) return formaPago // ya viene armado: "Efectivo ($X) + Transferencia ($Y)"
  if (necesitaDividirPago(formaPago)) return `${formaPago} (a dividir)`
  if (/pagad[oa]/i.test(formaPago)) return 'Ya pagado'
  if (/solo entrega/i.test(formaPago)) return 'Sin cobro (solo entrega)'
  if (/efectivo/i.test(formaPago)) {
    return monto ? `Efectivo ($${Number(monto).toLocaleString('es-AR')})` : 'Efectivo'
  }
  return formaPago
}

// Duplica a propósito mobile/src/lib/formato.js (formatoPago + resumenTexto): el botón de
// copiar del panel tiene que producir el mismo texto que copia el chofer. Si se edita el
// formato de un lado hay que editar el otro.
function formatoPagoChofer(formaPago, monto, pagoDividido) {
  if (!formaPago) return '—'
  if (pagoDividido) return `Pagó ${formaPago}`
  if (necesitaDividirPago(formaPago)) return `Pago pendiente de dividir (${formaPago})`
  if (/pagad[oa]/i.test(formaPago)) return 'Ya pagado'
  if (/solo entrega/i.test(formaPago)) return 'Sin cobro (solo entrega)'
  if (/efectivo/i.test(formaPago)) {
    return monto ? `Pagó efectivo $${Number(monto).toLocaleString('es-AR')}` : 'Pagó efectivo'
  }
  return `Pagó por ${formaPago.toLowerCase()}`
}

/**
 * "40lts SEDA MO" normal, o el texto ya armado tal cual si la parada es
 * multiproducto (ahí `producto` ya trae "40lts SEDA AO + 20lts SEDA MO" y no
 * hay que volver a pegarle el número de litros adelante).
 */
export function textoCantidadProducto({ litros, producto, multiproducto }) {
  return multiproducto ? producto : `${litros ?? '—'}lts · ${producto}`
}

/** "40lts AO — La Parrilla de Carlos — Pagó por transferencia", igual a lo que copia el chofer. */
export function resumenParaCopiar({ litros, producto, cliente, formaPago, monto, multiproducto, pagoDividido }) {
  const cantidadProducto = multiproducto ? producto : `${litros ?? '—'}lts ${producto}`
  return `${cantidadProducto} — ${cliente} — ${formatoPagoChofer(formaPago, monto, pagoDividido)}`
}
