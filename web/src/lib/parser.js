// Parser del recorrido pegado desde Google Sheets.
//
// La hoja real es SEMANAL (no una pestaña por día) — el vendedor pega el
// contenido completo, con pedidos de varios días mezclados, y acá adentro
// nos quedamos solo con las filas de la fecha que nos interesa (hoy). No
// hace falta detectar el encabezado por separado: cualquier fila cuya
// columna "Fecha" no matchee la fecha objetivo (sea el encabezado, un
// bloque de resumen arriba de la tabla, o un pedido de otro día) se ignora
// en silencio. Es texto TSV (tabs entre columnas) — no requiere IA.
//
// ⚠️ El orden de columnas de abajo (COLUMNAS) está armado a partir de una
// captura real de la hoja semanal de la distribuidora. Si el parser
// interpreta mal algo, es cuestión de reordenar este array. La vista previa
// (ver ActualizarRecorrido.jsx) existe para detectar esto antes de confirmar.
const COLUMNAS = [
  '_ignorar_copiar_facturas', // 0
  'notas', // 1 — Observaciones
  '_ignorar_otros_datos', // 2
  'fecha', // 3
  'litros', // 4 — CANTIDAD LTS
  'producto', // 5 — SEDA MO / SEDA AO / LOT / ARECO / SEDA OLIVA / combinaciones...
  'cliente', // 6 — EMPRESA
  '_ignorar_remito', // 7
  '_ignorar_entregado', // 8 — columna vieja de seguimiento manual, ya no la usamos
  'forma_pago', // 9
  '_ignorar_facturacion', // 10
  '_ignorar_cuit', // 11
  '_ignorar_fc_numero', // 12
  'precio_unitario', // 13
  '_ignorar_envio', // 14
  'total', // 15
  '_ignorar_zona', // 16 — no lo usamos por ahora
  '_ignorar_localidad', // 17
  'direccion', // 18
  '_ignorar_provincia', // 19
  'empresa_transporte', // 20 — "Transporte": si viene con algo, es una parada de zona TRANSPORTES
  'horario', // 21 — horario de atención del cliente
]

// "4.000" -> 4000 · "$2.800.000" -> 2800000 · "1.234,50" -> 1234.5
// Formato argentino: "." separa miles, "," separa decimales.
function parseNumeroAR(texto) {
  if (texto == null) return null
  const limpio = String(texto).replace(/[^0-9.,-]/g, '').trim()
  if (!limpio) return null
  const normalizado = limpio.replace(/\./g, '').replace(',', '.')
  const numero = parseFloat(normalizado)
  return Number.isNaN(numero) ? null : numero
}

// "31/08/2026" -> "2026-08-31" (ISO, para comparar contra la fecha de hoy)
function parseFechaAR(texto) {
  const match = String(texto || '').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!match) return null
  const [, dia, mes, anio] = match
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

/**
 * Parsea el texto pegado y devuelve solo las paradas de `fechaObjetivo`
 * (formato ISO yyyy-mm-dd — normalmente hoy). Todo lo demás (otros días,
 * encabezados, bloques de resumen, filas vacías al final) se descarta en
 * silencio. `errores` son filas *de la fecha objetivo* que igual no se
 * pudieron interpretar (falta cliente o producto) — esas sí se muestran,
 * porque son un problema real de datos que vale la pena revisar.
 */
export function parsearRecorrido(textoPegado, fechaObjetivo) {
  const lineas = textoPegado
    .split(/\r?\n/)
    .map((l) => l.replace(/\r/g, ''))
    .filter((l) => l.trim().length > 0)

  const paradas = []
  const errores = []

  lineas.forEach((linea, i) => {
    const columnas = linea.split('\t')
    if (columnas.every((c) => !c.trim())) return

    const fila = {}
    COLUMNAS.forEach((nombre, idx) => {
      fila[nombre] = (columnas[idx] ?? '').trim()
    })

    const fecha = parseFechaAR(fila.fecha)
    if (!fecha || fecha !== fechaObjetivo) return // no es de hoy (o es basura/encabezado)

    const cliente = fila.cliente
    const producto = fila.producto
    if (!cliente || !producto) {
      errores.push({ linea: i + 1, texto: linea, motivo: 'Falta cliente o producto en una fila de hoy' })
      return
    }

    const formaPago = fila.forma_pago
    const total = parseNumeroAR(fila.total)
    // La planilla a veces ya avisa que el pago se va a dividir entre efectivo
    // y transferencia (ej. "Transferencia/Efectivo"), pero sin los montos —
    // eso lo carga el chofer recién al entregar. Si tratáramos esto como
    // "esEfectivo" le asignaríamos de una todo el total como si fuera cash,
    // que está mal: todavía no sabemos cuánto es de cada método.
    const pagoPendienteDeDividir = /efectivo/i.test(formaPago) && /transferencia/i.test(formaPago)
    const esEfectivo = !pagoPendienteDeDividir && /efectivo/i.test(formaPago)
    const empresaTransporte = fila.empresa_transporte
    // La planilla no deja la columna vacía en las entregas propias: pone "PROPIO" a mano.
    // Eso no cuenta como transporte tercerizado, no hay que mostrar ninguna etiqueta.
    const esTransporte = Boolean(empresaTransporte) && !/^propio$/i.test(empresaTransporte)

    paradas.push({
      orden_planilla: paradas.length,
      producto,
      cliente,
      notas: fila.notas || null,
      horario: fila.horario || null,
      forma_pago: formaPago || null,
      monto_efectivo: esEfectivo ? total : null,
      precio_unitario: parseNumeroAR(fila.precio_unitario),
      litros: parseNumeroAR(fila.litros),
      total,
      direccion: fila.direccion || null,
      es_transporte: esTransporte,
      empresa_transporte: esTransporte ? empresaTransporte : null,
      multiproducto: false,
    })
  })

  return { paradas: agruparPorCliente(paradas), errores }
}

// Un mismo cliente puede pedir más de un producto: el vendedor lo carga como
// filas separadas en Sheets (mismo cliente, mismo día), pero es una sola
// parada física — el chofer la visita una vez. Acá se combinan en una sola
// fila, con el texto de "producto" ya armado con todos los productos juntos
// ("40lts SEDA AO + 20lts SEDA MO"). El resto de los datos (dirección,
// horario, forma de pago, transporte) sale de la primera fila del grupo —
// asumimos que son iguales entre sí, porque es el mismo cliente.
function agruparPorCliente(paradas) {
  const grupos = new Map()
  for (const p of paradas) {
    if (!grupos.has(p.cliente)) grupos.set(p.cliente, [])
    grupos.get(p.cliente).push(p)
  }

  const combinadas = [...grupos.values()].map((filas) => {
    if (filas.length === 1) return filas[0]
    const [primera] = filas
    return {
      ...primera,
      producto: filas.map((f) => `${f.litros ?? '—'}lts ${f.producto}`).join(' + '),
      litros: filas.reduce((acc, f) => acc + (f.litros || 0), 0),
      total: filas.reduce((acc, f) => acc + (f.total || 0), 0),
      monto_efectivo: filas.some((f) => f.monto_efectivo != null)
        ? filas.reduce((acc, f) => acc + (f.monto_efectivo || 0), 0)
        : null,
      precio_unitario: null, // ya no hay un único precio por unidad para todo el grupo
      multiproducto: true,
    }
  })

  return combinadas.sort((a, b) => a.orden_planilla - b.orden_planilla)
}
