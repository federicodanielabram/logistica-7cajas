import { useMemo, useState } from 'react'
import Boton from '../components/Boton'

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
          return (
            <button
              key={item.id}
              className={`item ${marcado ? 'item-marcado' : ''}`}
              onClick={() => onToggle(item.id)}
            >
              <div>
                <div className="item-nombre">{item.cliente}</div>
                {item.es_transporte && (
                  <div className="item-subtitulo">TRANS. {item.empresa_transporte}</div>
                )}
              </div>
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
