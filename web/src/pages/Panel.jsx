import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO } from '../lib/recorrido'
import { formatoPago, resumenParaCopiar, textoCantidadProducto } from '../lib/formato'
import { useCopiados } from '../lib/useCopiados'
import BotonCopiar from '../components/BotonCopiar'

const ESTADO_COLOR = {
  en_espera: 'amarillo',
  entregado: 'verde',
  descartado: 'rojo',
}

function ColumnaChofer({ chofer, fecha }) {
  const [items, setItems] = useState([])
  const [copiados, marcarCopiado] = useCopiados(`copiados_${fecha}`)

  async function cargar() {
    const { data, error } = await supabase
      .from('parada_chofer')
      .select('*, parada:parada_id(*)')
      .eq('fecha', fecha)
      .eq('chofer_id', chofer.id)
      .order('orden', { ascending: true })
    if (!error) setItems(data ?? [])
  }

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel(`parada_chofer_${chofer.id}_${fecha}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'parada_chofer', filter: `chofer_id=eq.${chofer.id}` },
        () => cargar()
      )
      .subscribe()
    return () => supabase.removeChannel(canal)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chofer.id, fecha])

  const ultimaAccion = items
    .map((item) => item.entregado_en)
    .filter(Boolean)
    .sort()
    .at(-1)

  return (
    <div className="columna-chofer">
      <h3>{chofer.nombre}</h3>
      {ultimaAccion && (
        <p className="ayuda">
          Última acción: {new Date(ultimaAccion).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {items.length === 0 && <p className="ayuda">Todavía no eligió sus paradas.</p>}
      <ul className="checklist">
        {items.map((item) => {
          const p = item.parada
          const litros = item.litros_confirmado ?? p.litros
          const producto = item.producto_confirmado ?? p.producto
          const formaPago = item.forma_pago_confirmada ?? p.forma_pago
          const monto = item.monto_confirmado ?? p.monto_efectivo
          return (
            <li key={item.id} className={`item-${ESTADO_COLOR[item.estado]}`}>
              <div className="item-contenido">
                <div className="item-linea-principal">
                  <strong>{p.cliente}</strong>
                  {item.editado && <span className="tag-editado">editado</span>}
                </div>
                {p.es_transporte && <div className="subtitulo-chico">TRANS. {p.empresa_transporte}</div>}
                <div className="item-detalle">
                  {textoCantidadProducto({ litros, producto, multiproducto: p.multiproducto })} ·{' '}
                  {formatoPago(formaPago, monto, item.pago_dividido)}
                </div>
              </div>
              {(item.estado === 'entregado' || item.estado === 'en_espera') && (
                <BotonCopiar
                  texto={resumenParaCopiar({
                    litros,
                    producto,
                    cliente: p.cliente,
                    formaPago,
                    monto,
                    multiproducto: p.multiproducto,
                    pagoDividido: item.pago_dividido,
                    entregado: item.estado === 'entregado',
                  })}
                  copiado={copiados.has(p.id)}
                  onCopiado={() => marcarCopiado(p.id)}
                />
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function Panel() {
  const [choferes, setChoferes] = useState([])
  const fecha = hoyISO()

  useEffect(() => {
    supabase
      .from('chofer')
      .select('*')
      .order('nombre')
      .then(({ data }) => setChoferes(data ?? []))
  }, [])

  return (
    <div className="pagina">
      <h2>Reparto de hoy — {fecha}</h2>
      <div className="columnas-choferes">
        {choferes.map((chofer) => (
          <ColumnaChofer key={chofer.id} chofer={chofer} fecha={fecha} />
        ))}
      </div>
    </div>
  )
}
