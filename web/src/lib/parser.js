// Parser del recorrido pegado desde Google Sheets.
//
// El vendedor selecciona toda la pestaña del día (Ctrl+A) y copia (Ctrl+C).
// Al pegar en un <textarea>, el navegador recibe texto plano separado por
// tabs entre columnas y saltos de línea entre filas (formato TSV) — así es
// como Sheets/Excel exportan una selección al portapapeles. No hace falta
// ninguna IA para esto: es un formato mecánico y siempre en el mismo orden.
//
// ⚠️ El orden de columnas de abajo (COLUMNAS) está armado a partir de una
// captura de la planilla real. Si al pegar los datos de verdad el parser
// interpreta mal alguna columna, es cuestión de reordenar este array — no
// hace falta tocar nada más. La vista previa (ver ActualizarRecorrido.jsx)
// existe justamente para detectar esto antes de confirmar.
const COLUMNAS = [
  'notas',
  'fecha',
  'producto',
  'cliente',
  '_ignorar_dropdown',
  '_ignorar_solo_entrega',
  'forma_pago',
  '_ignorar_facturado',
  '_ignorar_cuit',
  'precio_unitario',
  'litros',
  'total',
  'zona',
  'barrio',
  'direccion',
  '_ignorar_telefono',
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

// "31/08/2026" -> "2026-08-31" (ISO, para guardar como `date` en Postgres)
function parseFechaAR(texto) {
  const match = String(texto || '').trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (!match) return null
  const [, dia, mes, anio] = match
  return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`
}

function parseProducto(texto) {
  const t = String(texto || '').toUpperCase()
  if (t.includes('AO')) return 'AO'
  if (t.includes('MO')) return 'MO'
  return null
}

function esSiNoTruthy(texto) {
  return /^s[ií]$/i.test(String(texto || '').trim())
}

/**
 * Parsea el texto pegado en filas de parada.
 * Devuelve { paradas, errores } — `errores` son filas que no se pudieron
 * interpretar (se muestran en la vista previa para que el vendedor decida).
 */
export function parsearRecorrido(textoPegado) {
  const lineas = textoPegado
    .split(/\r?\n/)
    .map((l) => l.replace(/\r/g, ''))
    .filter((l) => l.trim().length > 0)

  if (lineas.length === 0) {
    return { paradas: [], errores: [] }
  }

  // Detección de encabezado: si la columna "fecha" de la primera fila no
  // parsea como fecha válida, asumimos que es una fila de títulos y la
  // salteamos. Así funciona tanto si el vendedor copia con título como sin.
  const primeraFilaCols = lineas[0].split('\t')
  const primeraEsEncabezado = !parseFechaAR(primeraFilaCols[COLUMNAS.indexOf('fecha')])
  const filasDeDatos = primeraEsEncabezado ? lineas.slice(1) : lineas

  const paradas = []
  const errores = []

  filasDeDatos.forEach((linea, i) => {
    const columnas = linea.split('\t')
    // Si la fila entera está vacía en el contenido (Ctrl+A suele traer
    // columnas/filas de más al final), la ignoramos en silencio.
    if (columnas.every((c) => !c.trim())) return

    const fila = {}
    COLUMNAS.forEach((nombre, idx) => {
      fila[nombre] = (columnas[idx] ?? '').trim()
    })

    const fecha = parseFechaAR(fila.fecha)
    const producto = parseProducto(fila.producto)
    const cliente = fila.cliente

    if (!fecha || !producto || !cliente) {
      errores.push({ linea: i + 1, texto: linea, motivo: 'Falta fecha, producto o cliente' })
      return
    }

    const zona = fila.zona
    const esTransporte = /transportes?/i.test(zona)
    const formaPago = fila.forma_pago
    const total = parseNumeroAR(fila.total)
    const esEfectivo = /efectivo/i.test(formaPago)

    paradas.push({
      orden_planilla: i,
      fecha,
      producto,
      cliente,
      notas: fila.notas || null,
      forma_pago: formaPago || null,
      monto_efectivo: esEfectivo ? total : null,
      precio_unitario: parseNumeroAR(fila.precio_unitario),
      litros: parseNumeroAR(fila.litros),
      total,
      zona: zona || null,
      barrio: fila.barrio || null,
      direccion: fila.direccion || null,
      es_transporte: esTransporte,
      // En las filas de zona TRANSPORTES el nombre del transportista ya
      // viene en la columna "cliente" de la planilla (ver notas del proyecto).
      empresa_transporte: esTransporte ? cliente : null,
    })
  })

  return { paradas, errores }
}
