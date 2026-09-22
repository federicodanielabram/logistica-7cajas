import { useMemo, useState } from 'react'
import Boton from '../components/Boton'

/**
 * En pleno reparto: todas las paradas del día, para sumar una que te
 * habías olvidado. Se llega acá yendo hacia atrás desde "Reordenar lista".
 * Tocar una parada disponible la agrega de inmediato al recorrido.
 */
export default function AgregarParadas({ paradas, idsEnRuta, onAgregar, onListo }) {
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return paradas
    return paradas.filter((p) => p.cliente.toLowerCase().includes(q))
  }, [paradas, busqueda])

  return (
    <div className="pantalla">
      <h2>Agregar parada</h2>
      <input
        className="buscador"
        placeholder="Buscar cliente…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
      />
      <div className="lista">
        {filtradas.map((item) => {
          const yaAgregada = idsEnRuta.has(item.id)
          return (
            <button
              key={item.id}
              className={`item ${yaAgregada ? 'item-en-ruta' : ''}`}
              disabled={yaAgregada}
              onClick={() => onAgregar(item.id)}
            >
              <div>
                <div className="item-nombre">{item.cliente}</div>
                {item.es_transporte && (
                  <div className="item-subtitulo">TRANS. {item.empresa_transporte}</div>
                )}
              </div>
              {yaAgregada && <span className="item-subtitulo">Ya en tu recorrido</span>}
            </button>
          )
        })}
      </div>
      <Boton titulo="Listo" onClick={onListo} />
    </div>
  )
}
