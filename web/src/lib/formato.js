// Duplicada en mobile/src/lib/formato.js — la usa el parser (web) para decidir
// si una fila viene con el pago pendiente de dividir, y acá para no mostrarla
// como si ya fuera un solo método definido.
export function necesitaDividirPago(formaPago) {
  if (!formaPago || formaPago.includes('$')) return false // ya viene resuelta con montos
  return /efectivo/i.test(formaPago) && /transferencia/i.test(formaPago)
}

/**
 * Texto del método de pago para mostrar en checklist / resumen. `total` es
 * el monto del pedido tal cual sale de la planilla — se usa como monto a
 * mostrar en transferencia, que a diferencia de efectivo nunca tiene un
 * `monto` propio cargado (ver `mobile/src/screens/EditarEntrega.jsx`).
 */
export function formatoPago(formaPago, monto, pagoDividido, total) {
  if (!formaPago) return '—'
  if (pagoDividido) return formaPago // ya viene armado: "Efectivo ($X) + Transferencia ($Y)"
  if (necesitaDividirPago(formaPago)) return `${formaPago} (a dividir)`
  if (/pagad[oa]/i.test(formaPago)) return 'Pagado'
  if (/solo entrega/i.test(formaPago)) return 'Sin cobro (solo entrega)'
  if (/efectivo/i.test(formaPago)) {
    return monto ? `Efectivo ($${Number(monto).toLocaleString('es-AR')})` : 'Efectivo'
  }
  return total ? `${formaPago} $${Number(total).toLocaleString('es-AR')}` : formaPago
}

// Duplica a propósito mobile/src/lib/formato.js (formatoPago + resumenTexto): el botón de
// copiar del panel tiene que producir el mismo texto que copia el chofer. Si se edita el
// formato de un lado hay que editar el otro.
//
// `entregado` distingue el texto de una entrega ya hecha ("Pagó X", tiempo
// pasado) del de una parada todavía pendiente ("Método de pago: X" — lo que
// tiene que pasar cuando se entregue, no lo que ya pasó).
function formatoPagoChofer(formaPago, monto, pagoDividido, entregado = true) {
  if (!formaPago) return '—'
  if (!entregado) {
    if (pagoDividido) return `Método de pago: ${formaPago}`
    if (necesitaDividirPago(formaPago)) return `Método de pago: Pendiente de dividir (${formaPago})`
    if (/pagad[oa]/i.test(formaPago)) return 'Método de pago: Pagado'
    if (/solo entrega/i.test(formaPago)) return 'Método de pago: Sin cobro (solo entrega)'
    if (/efectivo/i.test(formaPago)) {
      return monto ? `Método de pago: Efectivo $${Number(monto).toLocaleString('es-AR')}` : 'Método de pago: Efectivo'
    }
    return `Método de pago: ${formaPago}`
  }
  if (pagoDividido) return `Pagó ${formaPago}`
  if (necesitaDividirPago(formaPago)) return `Pago pendiente de dividir (${formaPago})`
  // "Transferencia pendiente pago" no es lo mismo que "Transferencia paga":
  // acá el cliente todavía no transfirió, no hay que decir "Pagó". Ninguna
  // de las dos lleva monto: a diferencia del amarillo, acá el monto solo
  // importa para efectivo (lo que el chofer realmente cobró en mano).
  if (/^transferencia pendiente pago$/i.test(formaPago)) return formaPago
  // Ya viene armado tal cual se tiene que mostrar: "Transferencia paga (pedir comprobante)".
  if (/^transferencia paga/i.test(formaPago)) return formaPago
  // Chequear antes que el "solo entrega" genérico de más abajo: ese es el
  // "sin cobro" de la planilla, este es un estado distinto que el chofer
  // elige a propósito al entregar.
  if (/^solo entrega \(debe\)$/i.test(formaPago)) return `Método de pago: ${formaPago}`
  if (/^bonificad/i.test(formaPago)) return `Método de pago: ${formaPago}`
  if (/pagad[oa]/i.test(formaPago)) return 'Pagado'
  if (/solo entrega/i.test(formaPago)) return 'Sin cobro (solo entrega)'
  if (/efectivo/i.test(formaPago)) {
    return monto ? `Pagó efectivo $${Number(monto).toLocaleString('es-AR')}` : 'Pagó efectivo'
  }
  // Transferencia tal cual la dejó la planilla, sin que el chofer la edite.
  if (/transferencia/i.test(formaPago)) return 'Pagó transferencia'
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

/**
 * "40lts AO — La Parrilla de Carlos — Pagó por transferencia" para una parada
 * ya entregada, igual a lo que copia el chofer. Para una parada todavía
 * pendiente (`entregado: false`) arma en cambio "... — Método de pago: X",
 * lo que se espera que pase al entregarla, no una entrega ya confirmada.
 */
export function resumenParaCopiar({ litros, producto, cliente, formaPago, monto, multiproducto, pagoDividido, entregado = true }) {
  const cantidadProducto = multiproducto ? producto : `${litros ?? '—'}lts ${producto}`
  return `${cantidadProducto} — ${cliente} — ${formatoPagoChofer(formaPago, monto, pagoDividido, entregado)}`
}

/**
 * Texto para el botón de copiar de los puntos amarillos (todavía sin
 * entregar) en "Recorrido de hoy": litros, producto y método de pago — sin
 * el nombre del cliente. "Pagado" y "Solo entrega" se tratan igual (no hay
 * nada que cobrar al entregar, no llevan monto); efectivo y transferencia sí
 * llevan el monto total del pedido.
 */
export function resumenPendienteParaCopiar({ litros, producto, multiproducto, formaPago, total }) {
  const cantidadProducto = multiproducto ? producto : `${litros ?? '—'}lts ${producto}`
  const pago = formaPago || ''
  let metodo
  if (/pagad[oa]/i.test(pago) || /solo entrega/i.test(pago)) {
    metodo = 'Sin cobro (solo entrega)'
  } else if (/transferencia/i.test(pago)) {
    metodo = total ? `Transferencia $${Number(total).toLocaleString('es-AR')}` : 'Transferencia'
  } else {
    metodo = total ? `Efectivo $${Number(total).toLocaleString('es-AR')}` : 'Efectivo'
  }
  return `${cantidadProducto} — Método de pago: ${metodo}`
}
