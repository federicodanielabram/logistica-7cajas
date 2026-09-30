import { supabase } from './supabase'

/** Fecha de hoy en formato ISO (yyyy-mm-dd), en huso horario local. */
export function hoyISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

function normalizarCliente(cliente) {
  return (cliente ?? '').trim().toLowerCase()
}

/**
 * Suma al recorrido del día las paradas nuevas de la planilla pegada. Las
 * que ya estaban cargadas hoy (mismo cliente) no se tocan, para poder
 * repegar la planilla completa a mitad de jornada sin duplicar nada.
 */
export async function actualizarRecorrido(paradas, fecha) {
  const { data: existentes, error: errExistentes } = await supabase
    .from('parada')
    .select('cliente')
    .eq('fecha', fecha)
  if (errExistentes) throw errExistentes

  const clientesExistentes = new Set((existentes ?? []).map((p) => normalizarCliente(p.cliente)))
  const paradasNuevas = paradas.filter((p) => !clientesExistentes.has(normalizarCliente(p.cliente)))

  if (paradasNuevas.length > 0) {
    // La fecha guardada es la de hoy (el momento de actualizar), no la que
    // diga la columna Fecha de la planilla — evita que un typo o una fila
    // vieja sin actualizar en Sheets haga que la parada no aparezca donde
    // corresponde.
    const paradasConFecha = paradasNuevas.map((p) => ({ ...p, fecha }))
    const { error: errInsert } = await supabase.from('parada').insert(paradasConFecha)
    if (errInsert) throw errInsert
  }

  return { insertadas: paradasNuevas.length, yaExistian: paradas.length - paradasNuevas.length }
}
