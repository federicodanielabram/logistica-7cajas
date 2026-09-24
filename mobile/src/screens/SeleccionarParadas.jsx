import { useMemo, useState } from 'react'
import Boton from '../components/Boton'

const COLOR_ESTADO_PREVIO = { entregado: 'verde', descartado: 'rojo' }

export default function SeleccionarParadas({ paradas, seleccionadas, onToggle, onSiguiente }) {
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
          return (
            <button
              key={item.id}
              className={`item ${marcado ? 'item-marcado' : ''} ${colorPrevio ? `item-${colorPrevio}` : ''}`}
              disabled={yaResuelta}
              onClick={() => onToggle(item.id)}
            >
              <div>
                <div className="item-nombre">{item.cliente}</div>
                {item.es_transporte && (
                  <div className="item-subtitulo">TRANS. {item.empresa_transporte}</div>
                )}
              </div>
              {yaResuelta && (
                <span className="item-subtitulo">{item.estado_previo === 'entregado' ? 'Ya entregado' : 'Ya descartado'}</span>
              )}
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
