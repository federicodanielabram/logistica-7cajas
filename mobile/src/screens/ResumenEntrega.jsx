import { useState } from 'react'
import Boton from '../components/Boton'
import { resumenTexto } from '../lib/formato'

export default function ResumenEntrega({ buffer, onSiguiente, onEditar }) {
  const [copiado, setCopiado] = useState(false)
  const texto = resumenTexto(buffer)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Algunos navegadores viejos no tienen Clipboard API — no rompe nada, solo no copia.
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <div className="pantalla">
      <div className="centro-flex">
        <div className="etiqueta">Entrega confirmada</div>
        <p className="resumen-texto">{texto}</p>
      </div>
      <div>
        <Boton titulo={copiado ? 'Copiado ✓' : 'Copiar'} variante="secundario" onClick={copiar} />
        <Boton titulo="Editar" variante="secundario" onClick={onEditar} />
        <Boton titulo="Siguiente" onClick={onSiguiente} />
      </div>
    </div>
  )
}
