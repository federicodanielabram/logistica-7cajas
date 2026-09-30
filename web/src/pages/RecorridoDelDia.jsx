import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO } from '../lib/recorrido'
import { formatoPago, resumenParaCopiar, resumenPendienteParaCopiar, textoCantidadProducto } from '../lib/formato'
import BotonCopiar from '../components/BotonCopiar'

const ESTADO_COLOR = { en_espera: 'amarillo', entregado: 'verde', descartado: 'rojo' }
// Si por error quedó más de una asignación para la misma parada (los dos
// choferes la marcaron), nos quedamos con la más "avanzada".
const PRIORIDAD_ESTADO = { entregado: 2, descartado: 1, en_espera: 0 }

export default function RecorridoDelDia() {
  const [items, setItems] = useState([])
  const fecha = hoyISO()

  async function marcarCopiado(id) {
    await supabase.from('parada').update({ copiado: true }).eq('id', id)
  }

  async function cargar() {
    const { data: paradas } = await supabase
      .from('parada')
      .select('*')
      .eq('fecha', fecha)
      .order('orden_planilla', { ascending: true })

    const { data: asignaciones } = await supabase.from('parada_chofer').select('*').eq('fecha', fecha)

    const mejorAsignacionPorParada = {}
    for (const a of asignaciones ?? []) {
      const actual = mejorAsignacionPorParada[a.parada_id]
      if (!actual || PRIORIDAD_ESTADO[a.estado] > PRIORIDAD_ESTADO[actual.estado]) {
        mejorAsignacionPorParada[a.parada_id] = a
      }
    }

    setItems(
      (paradas ?? []).map((p) => {
        const asig = mejorAsignacionPorParada[p.id]
        return {
          id: p.id,
          cliente: p.cliente,
          es_transporte: p.es_transporte,
          empresa_transporte: p.empresa_transporte,
          estado: asig?.estado ?? 'en_espera',
          litros: asig?.litros_confirmado ?? p.litros,
          producto: asig?.producto_confirmado ?? p.producto,
          formaPago: asig?.forma_pago_confirmada ?? p.forma_pago,
          monto: asig?.monto_confirmado ?? p.monto_efectivo,
          total: p.total,
          copiado: p.copiado,
          multiproducto: p.multiproducto,
          pagoDividido: asig?.pago_dividido ?? false,
        }
      })
    )
  }

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel(`recorrido_dia_${fecha}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parada_chofer', filter: `fecha=eq.${fecha}` }, cargar)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parada', filter: `fecha=eq.${fecha}` }, cargar)
      .subscribe()
    return () => supabase.removeChannel(canal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fecha])

  return (
    <div className="pagina">
      <h2>Recorrido de hoy — {fecha}</h2>
      <p className="ayuda">
        Todos los clientes de la última actualización, sin separar por chofer. Se ponen verdes o
        rojos a medida que se van resolviendo, no importa quién los tenga asignados.
      </p>
      {items.length === 0 && <p className="ayuda">Todavía no se actualizó el recorrido de hoy.</p>}
      <ul className="checklist">
        {items.map((item) => (
          <li key={item.id} className={`item-${ESTADO_COLOR[item.estado]}`}>
            <div className="item-contenido">
              <div className="item-linea-principal">
                <strong>{item.cliente}</strong>
              </div>
              {item.es_transporte && <div className="subtitulo-chico">TRANS. {item.empresa_transporte}</div>}
              <div className="item-detalle">
                {textoCantidadProducto(item)} · {formatoPago(item.formaPago, item.monto, item.pagoDividido)}
              </div>
            </div>
            {(item.estado === 'entregado' || item.estado === 'en_espera') && (
              <BotonCopiar
                texto={
                  item.estado === 'entregado'
                    ? resumenParaCopiar({ ...item, entregado: true })
                    : resumenPendienteParaCopiar(item)
                }
                copiado={item.copiado}
                onCopiado={() => marcarCopiado(item.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
