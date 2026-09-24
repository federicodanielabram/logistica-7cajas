import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO } from '../lib/recorrido'
import { formatoPago, textoCantidadProducto } from '../lib/formato'

const ESTADO_COLOR = { en_espera: 'amarillo', entregado: 'verde', descartado: 'rojo' }

export default function Historial() {
  const [choferes, setChoferes] = useState([])
  const [fecha, setFecha] = useState(hoyISO())
  const [choferId, setChoferId] = useState('todos')
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase
      .from('chofer')
      .select('*')
      .order('nombre')
      .then(({ data }) => setChoferes(data ?? []))
  }, [])

  useEffect(() => {
    let cancelado = false
    setCargando(true)
    async function cargar() {
      const { data: paradas } = await supabase.from('parada').select('*').eq('fecha', fecha)
      const { data: asignaciones } = await supabase.from('parada_chofer').select('*').eq('fecha', fecha)

      const paradaPorId = Object.fromEntries((paradas ?? []).map((p) => [p.id, p]))
      const filas = (asignaciones ?? [])
        .map((a) => {
          const p = paradaPorId[a.parada_id]
          if (!p) return null
          return {
            id: a.id,
            chofer_id: a.chofer_id,
            cliente: p.cliente,
            es_transporte: p.es_transporte,
            empresa_transporte: p.empresa_transporte,
            estado: a.estado,
            litros: a.litros_confirmado ?? p.litros,
            producto: a.producto_confirmado ?? p.producto,
            formaPago: a.forma_pago_confirmada ?? p.forma_pago,
            monto: a.monto_confirmado ?? p.monto_efectivo,
            multiproducto: p.multiproducto,
            pagoDividido: a.pago_dividido,
            entregadoEn: a.entregado_en,
          }
        })
        .filter(Boolean)

      if (!cancelado) {
        setItems(filas)
        setCargando(false)
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [fecha])

  const itemsFiltrados = useMemo(() => {
    if (choferId === 'todos') return items
    return items.filter((i) => i.chofer_id === choferId)
  }, [items, choferId])

  const nombrePorChoferId = useMemo(() => Object.fromEntries(choferes.map((c) => [c.id, c.nombre])), [choferes])

  return (
    <div className="pagina">
      <h2>Historial</h2>
      <div className="filtros-historial">
        <label>
          Fecha
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </label>
        <label>
          Camioneta
          <select value={choferId} onChange={(e) => setChoferId(e.target.value)}>
            <option value="todos">Todos</option>
            {choferes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {cargando && <p className="ayuda">Cargando…</p>}
      {!cargando && itemsFiltrados.length === 0 && <p className="ayuda">No hay puntos para esta fecha.</p>}

      <ul className="checklist">
        {itemsFiltrados.map((item) => (
          <li key={item.id} className={`item-${ESTADO_COLOR[item.estado]}`}>
            <div className="item-linea-principal">
              <strong>{item.cliente}</strong>
              <span className="subtitulo-chico">
                {nombrePorChoferId[item.chofer_id] ?? '—'}
                {item.entregadoEn
                  ? ` · ${new Date(item.entregadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                  : ''}
              </span>
            </div>
            {item.es_transporte && <div className="subtitulo-chico">TRANS. {item.empresa_transporte}</div>}
            <div className="item-detalle">
              {textoCantidadProducto(item)} · {formatoPago(item.formaPago, item.monto, item.pagoDividido)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
