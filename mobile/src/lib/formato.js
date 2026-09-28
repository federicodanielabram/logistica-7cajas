export function hoyISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

// Duplicada en web/src/lib/formato.js — le avisa a "Editar entrega" y a
// "Confirmar entrega" que la planilla dejó el pago pendiente de dividir entre
// efectivo y transferencia (ej. "Transferencia/Efectivo"), sin los montos
// todavía. Deja de aplicar en cuanto el texto ya trae montos ("$"), que es
// como queda una vez que el chofer lo divide.
export function necesitaDividirPago(formaPago) {
  if (!formaPago || formaPago.includes('$')) return false
  return /efectivo/i.test(formaPago) && /transferencia/i.test(formaPago)
}

/** Texto del método de pago para mostrar en el resumen de entrega. */
export function formatoPago(formaPago, monto, pagoDividido) {
  if (!formaPago) return '—'
  if (pagoDividido) return `Pagó ${formaPago}`
  if (necesitaDividirPago(formaPago)) return `Pago pendiente de dividir (${formaPago})`
  // "Transferencia debe" no es lo mismo que "Pago transferencia": acá el
  // cliente todavía no transfirió, no hay que decir "Pagó".
  if (/^transferencia debe$/i.test(formaPago)) return 'Debe transferencia'
  if (/^pago transferencia$/i.test(formaPago)) return 'Pagó transferencia'
  if (/pagad[oa]/i.test(formaPago)) return 'Ya pagado'
  if (/solo entrega/i.test(formaPago)) return 'Sin cobro (solo entrega)'
  if (/efectivo/i.test(formaPago)) {
    return monto ? `Pagó efectivo $${Number(monto).toLocaleString('es-AR')}` : 'Pagó efectivo'
  }
  return `Pagó por ${formaPago.toLowerCase()}`
}

/** "40lts AO — La Parrilla de Carlos — pagó por transferencia" */
export function resumenTexto({ litros, producto, cliente, formaPago, monto, multiproducto, pagoDividido }) {
  const cantidadProducto = multiproducto ? producto : `${litros ?? '—'}lts ${producto}`
  return `${cantidadProducto} — ${cliente} — ${formatoPago(formaPago, monto, pagoDividido)}`
}

// "Efectivo ($30.000) + Transferencia ($15.000)" -> { efectivo: 30000, transferencia: 15000 }
// Inversa de combinarPagoDividido — para volver a editar un pago ya dividido.
export function separarPagoDividido(texto) {
  const matchEfectivo = String(texto || '').match(/Efectivo \(\$([\d.]+)\)/i)
  const matchTransferencia = String(texto || '').match(/Transferencia \(\$([\d.]+)\)/i)
  return {
    efectivo: matchEfectivo ? Number(matchEfectivo[1].replace(/\./g, '')) : null,
    transferencia: matchTransferencia ? Number(matchTransferencia[1].replace(/\./g, '')) : null,
  }
}

/** Inversa de separarPagoDividido: arma el texto combinado a partir de los dos montos cargados. */
export function combinarPagoDividido({ efectivo, transferencia }) {
  return `Efectivo ($${Number(efectivo).toLocaleString('es-AR')}) + Transferencia ($${Number(transferencia).toLocaleString('es-AR')})`
}

// "40lts SEDA AO + 20lts SEDA MO" -> [{litros:40, producto:'SEDA AO'}, {litros:20, producto:'SEDA MO'}]
// Inversa de cómo el parser (web/src/lib/parser.js) arma el texto combinado —
// se usa para volver a mostrar los productos por separado en "Editar entrega".
export function separarProductos(texto) {
  return texto.split(' + ').map((parte) => {
    const match = parte.match(/^(\d+)lts (.+)$/)
    return match ? { litros: Number(match[1]), producto: match[2] } : { litros: null, producto: parte }
  })
}

/** Inversa de separarProductos: arma de nuevo el texto combinado tras editar. */
export function combinarProductos(lineas) {
  return lineas.map((l) => `${l.litros ?? '—'}lts ${l.producto}`).join(' + ')
}

/** Múltiplos de 20, de 20 a 1000 litros, para el selector (cubre también los pedidos grandes de zona TRANSPORTES). */
export const OPCIONES_LITROS = Array.from({ length: 50 }, (_, i) => (i + 1) * 20)
