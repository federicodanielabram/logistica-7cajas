import { useMemo, useState } from 'react'
import Boton from '../components/Boton'
import { resumenTexto } from '../lib/formato'

const COLOR_ESTADO_PREVIO = { entregado: 'verde', descartado: 'rojo' }

export default function SeleccionarParadas({ paradas, seleccionadas, onToggle, onEditarPrevio, onSiguiente }) {
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return paradas
    return paradas.filter((p) => p.cliente.toLowerCase().includes(q))
  }, [paradas, busqueda])

  return (
    <div className="pantalla">
      <h2>Elegí tus paradas</h2>
      <input
        className="buscador"
        placeholder="Buscar cliente…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <div className="lista">
        {filtradas.map((item) => {
          const marcado = seleccionadas.has(item.id)
          const colorPrevio = COLOR_ESTADO_PREVIO[item.estado_previo]
          const yaResuelta = Boolean(colorPrevio)
          // Un punto ya entregado (de una tanda anterior del día) se puede
          // tocar para corregirlo; uno descartado no tiene nada para editar.
          const editable = item.estado_previo === 'entregado' && Boolean(onEditarPrevio)
          return (
            <button
              key={item.id}
              className={`item ${marcado ? 'item-marcado' : ''} ${colorPrevio ? `item-${colorPrevio}` : ''}`}
              disabled={yaResuelta && !editable}
              onClick={editable ? () => onEditarPrevio(item) : () => onToggle(item.id)}
            >
              <div>
                <div className="item-nombre">
                  {item.estado_previo === 'entregado'
                    ? resumenTexto({
                        litros: item.previo.litros_confirmado,
                        producto: item.previo.producto_confirmado,
                        cliente: item.cliente,
                        formaPago: item.previo.forma_pago_confirmada,
                        monto: item.previo.monto_confirmado,
                        multiproducto: item.previo.multiproducto,
                        pagoDividido: item.previo.pago_dividido,
                      })
                    : item.cliente}
                </div>
                {item.es_transporte && (
                  <div className="item-subtitulo">TRANS. {item.empresa_transporte}</div>
                )}
              </div>
              {editable && <span className="item-subtitulo">Tocá para editar</span>}
              {item.estado_previo === 'descartado' && <span className="item-subtitulo">Ya descartado</span>}
            </button>
          )
        })}
      </div>
      <div className="pie">
        <div className="contador">{seleccionadas.size} seleccionadas</div>
        <Boton titulo="Siguiente" onClick={onSiguiente} />
      </div>
    </div>
  )
}
