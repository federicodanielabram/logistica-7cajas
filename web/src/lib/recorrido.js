import { supabase } from './supabase'

/** Fecha de hoy en formato ISO (yyyy-mm-dd), en huso horario local. */
export function hoyISO() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10)
}

/**
 * Sube el recorrido parseado a la base, respetando el congelamiento de los
 * choferes que ya empezaron su día: las paradas que un chofer con
 * `iniciado_en` ya tomó no se tocan. Todo lo demás de esa fecha se reemplaza.
 */
export async function actualizarRecorrido(paradas, fecha) {
  const { data: diasIniciados, error: errDias } = await supabase
    .from('chofer_dia')
    .select('chofer_id')
    .eq('fecha', fecha)
    .not('iniciado_en', 'is', null)
  if (errDias) throw errDias

  const choferIdsIniciados = (diasIniciados ?? []).map((d) => d.chofer_id)

  let paradaIdsProtegidas = []
  if (choferIdsIniciados.length > 0) {
    const { data: asignadas, error: errAsig } = await supabase
      .from('parada_chofer')
      .select('parada_id')
      .eq('fecha', fecha)
      .in('chofer_id', choferIdsIniciados)
    if (errAsig) throw errAsig
    paradaIdsProtegidas = (asignadas ?? []).map((a) => a.parada_id)
  }

  let deleteQuery = supabase.from('parada').delete().eq('fecha', fecha)
  if (paradaIdsProtegidas.length > 0) {
    deleteQuery = deleteQuery.not('id', 'in', `(${paradaIdsProtegidas.join(',')})`)
  }
  const { error: errDelete } = await deleteQuery
  if (errDelete) throw errDelete

  if (paradas.length > 0) {
    // La fecha guardada es la de hoy (el momento de actualizar), no la que
    // diga la columna Fecha de la planilla — evita que un typo o una fila
    // vieja sin actualizar en Sheets haga que la parada no aparezca donde
    // corresponde.
    const paradasConFecha = paradas.map((p) => ({ ...p, fecha }))
    const { error: errInsert } = await supabase.from('parada').insert(paradasConFecha)
    if (errInsert) throw errInsert
  }

  return { insertadas: paradas.length, protegidas: paradaIdsProtegidas.length }
}
