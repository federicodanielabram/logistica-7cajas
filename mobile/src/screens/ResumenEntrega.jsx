import { useState } from 'react'
import Boton from '../components/Boton'
import { resumenTexto, necesitaDividirPago } from '../lib/formato'

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

  // La planilla puede avisar que el pago va a ser una combinación de efectivo
  // y transferencia sin decir cuánto de cada uno — eso lo carga el chofer en
  // "Editar" recién al entregar. Hasta que no lo haga, no lo dejamos confirmar.
  function alTocarSiguiente() {
    if (necesitaDividirPago(buffer.formaPago)) {
      alert('Tenés que dividir el método de pago antes de confirmar la entrega. Tocá "Editar" → "Método de pago" → "Dividir método de pago".')
      return
    }
    onSiguiente()
  }

  return (
    <div className="pantalla pantalla-resumen">
      <div className="centro-flex">
        <div className="etiqueta">Confirmar entrega</div>
        <p className="resumen-texto">{texto}</p>
      </div>
      <div>
        <Boton titulo={copiado ? 'Copiado ✓' : 'Copiar'} variante="secundario" onClick={copiar} />
        <Boton titulo="Editar" variante="secundario" onClick={onEditar} />
        <Boton titulo="Siguiente" onClick={alTocarSiguiente} />
      </div>
    </div>
  )
}
