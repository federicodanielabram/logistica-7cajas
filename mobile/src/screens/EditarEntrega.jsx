import { useState } from 'react'
import Boton from '../components/Boton'
import { OPCIONES_LITROS, formatoPago } from '../lib/formato'

const OPCIONES_PAGO = ['Efectivo', 'Transferencia', 'Ya pagado']

function Fila({ etiqueta, valor, onCambiar }) {
  return (
    <div className="fila-editar">
      <div>
        <div className="fila-etiqueta">{etiqueta}</div>
        <div className="fila-valor">{valor}</div>
      </div>
      <Boton titulo="Cambiar" variante="secundario" chico onClick={onCambiar} />
    </div>
  )
}

export default function EditarEntrega({ bufferInicial, onListo }) {
  const [buffer, setBuffer] = useState(bufferInicial)
  const [seccion, setSeccion] = useState(null) // null | 'litros' | 'producto' | 'pago' | 'pago_monto'
  const [montoTexto, setMontoTexto] = useState(bufferInicial.monto ? String(bufferInicial.monto) : '')

  function elegirPago(op) {
    if (op === 'Efectivo') {
      setSeccion('pago_monto')
    } else {
      setBuffer((b) => ({ ...b, formaPago: op, monto: null }))
      setSeccion(null)
    }
  }

  function confirmarMonto() {
    setBuffer((b) => ({ ...b, formaPago: 'Efectivo', monto: Number(montoTexto) || 0 }))
    setSeccion(null)
  }

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']

  return (
    <div className="pantalla">
      <h2>Editar entrega — {buffer.cliente}</h2>

      {seccion === null && (
        <div className="lista">
          <Fila etiqueta="Litros" valor={`${buffer.litros ?? '—'}lts`} onCambiar={() => setSeccion('litros')} />
          <Fila etiqueta="Tipo de aceite" valor={buffer.producto} onCambiar={() => setSeccion('producto')} />
          <Fila
            etiqueta="Método de pago"
            valor={formatoPago(buffer.formaPago, buffer.monto)}
            onCambiar={() => setSeccion('pago')}
          />
        </div>
      )}

      {seccion === 'litros' && (
        <div className="grilla-opciones">
          {OPCIONES_LITROS.map((v) => (
            <button
              key={v}
              className="opcion"
              onClick={() => {
                setBuffer((b) => ({ ...b, litros: v }))
                setSeccion(null)
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {seccion === 'producto' && (
        <div className="opciones-fila">
          {['MO', 'AO'].map((v) => (
            <button
              key={v}
              className="opcion-grande"
              onClick={() => {
                setBuffer((b) => ({ ...b, producto: v }))
                setSeccion(null)
              }}
            >
              {v}
            </button>
          ))}
        </div>
      )}

      {seccion === 'pago' && (
        <div className="lista">
          {OPCIONES_PAGO.map((v) => (
            <Boton key={v} titulo={v} variante="secundario" onClick={() => elegirPago(v)} />
          ))}
        </div>
      )}

      {seccion === 'pago_monto' && (
        <div className="teclado">
          <div className="monto-preview">${montoTexto || '0'}</div>
          <div className="teclas">
            {teclas.map((t) => (
              <button
                key={t}
                className="tecla"
                onClick={() =>
                  t === '⌫'
                    ? setMontoTexto((m) => m.slice(0, -1))
                    : t === 'OK'
                    ? confirmarMonto()
                    : setMontoTexto((m) => m + t)
                }
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {seccion === null && <Boton titulo="Siguiente" onClick={() => onListo(buffer)} />}
      {seccion !== null && seccion !== 'pago_monto' && (
        <Boton titulo="Cancelar" variante="emergencia" chico onClick={() => setSeccion(null)} />
      )}
    </div>
  )
}
