import { useState } from 'react'
import Boton from '../components/Boton'
import {
  OPCIONES_LITROS,
  formatoPago,
  separarProductos,
  combinarProductos,
  separarPagoDividido,
  combinarPagoDividido,
} from '../lib/formato'

const OPCIONES_PAGO = ['Efectivo', 'Transferencia', 'Ya pagado']
// Los productos reales que vimos en la planilla van más allá de MO/AO.
const OPCIONES_PRODUCTO = ['SEDA MO', 'SEDA AO', 'LOT', 'ARECO', 'SEDA OLIVA']

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

// `lineas` es un array con un {litros, producto} por cada producto de la
// parada — 1 en el caso normal, 2 o más si el cliente pidió varios productos
// (parada multiproducto). El método de pago siempre es uno solo para toda la
// parada (o dividido en dos montos), no por línea de producto.
export default function EditarEntrega({ bufferInicial, onListo }) {
  const [lineas, setLineas] = useState(() =>
    bufferInicial.multiproducto
      ? separarProductos(bufferInicial.producto)
      : [{ litros: bufferInicial.litros, producto: bufferInicial.producto }]
  )
  const [formaPago, setFormaPago] = useState(bufferInicial.formaPago)
  const [monto, setMonto] = useState(bufferInicial.monto)
  const [pagoDividido, setPagoDividido] = useState(bufferInicial.pagoDividido || false)
  const [montosDivididos, setMontosDivididos] = useState(() =>
    bufferInicial.pagoDividido
      ? separarPagoDividido(bufferInicial.formaPago)
      : { efectivo: null, transferencia: null }
  )
  // null | {tipo:'litros'|'producto', indice} | {tipo:'pago'} | {tipo:'pago_monto'}
  // | {tipo:'pago_dividir'} | {tipo:'pago_dividir_monto', campo:'efectivo'|'transferencia'}
  const [seccion, setSeccion] = useState(null)
  const [montoTexto, setMontoTexto] = useState(bufferInicial.monto ? String(bufferInicial.monto) : '')

  function elegirLinea(indice, campo, valor) {
    setLineas((ls) => ls.map((l, i) => (i === indice ? { ...l, [campo]: valor } : l)))
    setSeccion(null)
  }

  function elegirPago(op) {
    if (op === 'Efectivo') {
      setMontoTexto(monto ? String(monto) : '')
      setSeccion({ tipo: 'pago_monto' })
    } else {
      setFormaPago(op)
      setMonto(null)
      setPagoDividido(false)
      setSeccion(null)
    }
  }

  function confirmarMonto() {
    setFormaPago('Efectivo')
    setMonto(Number(montoTexto) || 0)
    setPagoDividido(false)
    setSeccion(null)
  }

  function abrirMontoDividido(campo) {
    setMontoTexto(montosDivididos[campo] ? String(montosDivididos[campo]) : '')
    setSeccion({ tipo: 'pago_dividir_monto', campo })
  }

  function confirmarMontoDividido() {
    setMontosDivididos((m) => ({ ...m, [seccion.campo]: Number(montoTexto) || 0 }))
    setSeccion({ tipo: 'pago_dividir' })
  }

  function confirmarPagoDividido() {
    setFormaPago(combinarPagoDividido(montosDivididos))
    setMonto(montosDivididos.efectivo + montosDivididos.transferencia)
    setPagoDividido(true)
    setSeccion(null)
  }

  function confirmar() {
    const multiproducto = lineas.length > 1
    onListo({
      ...bufferInicial,
      litros: multiproducto ? lineas.reduce((acc, l) => acc + (l.litros || 0), 0) : lineas[0].litros,
      producto: multiproducto ? combinarProductos(lineas) : lineas[0].producto,
      multiproducto,
      formaPago,
      monto,
      pagoDividido,
    })
  }

  const teclas = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK']
  const esKeypad = seccion?.tipo === 'pago_monto' || seccion?.tipo === 'pago_dividir_monto'

  return (
    <div className="pantalla">
      <h2>Editar entrega — {bufferInicial.cliente}</h2>

      {seccion === null && (
        <div className="lista">
          {lineas.map((linea, i) => (
            <div key={i}>
              <Fila
                etiqueta={lineas.length > 1 ? `Litros ${i + 1}` : 'Litros'}
                valor={`${linea.litros ?? '—'}lts`}
                onCambiar={() => setSeccion({ tipo: 'litros', indice: i })}
              />
              <Fila
                etiqueta={lineas.length > 1 ? `Tipo de aceite ${i + 1}` : 'Tipo de aceite'}
                valor={linea.producto}
                onCambiar={() => setSeccion({ tipo: 'producto', indice: i })}
              />
            </div>
          ))}
          <Fila
            etiqueta="Método de pago"
            valor={formatoPago(formaPago, monto, pagoDividido)}
            onCambiar={() => setSeccion({ tipo: 'pago' })}
          />
        </div>
      )}

      {seccion?.tipo === 'litros' && (
        <div className="lista">
          {OPCIONES_LITROS.map((v) => (
            <button
              key={v}
              className={`item ${v === lineas[seccion.indice].litros ? 'item-marcado' : ''}`}
              onClick={() => elegirLinea(seccion.indice, 'litros', v)}
            >
              <span className="item-nombre">{v}lts</span>
            </button>
          ))}
        </div>
      )}

      {seccion?.tipo === 'producto' && (
        <div className="lista">
          {OPCIONES_PRODUCTO.map((v) => (
            <button
              key={v}
              className={`item ${v === lineas[seccion.indice].producto ? 'item-marcado' : ''}`}
              onClick={() => elegirLinea(seccion.indice, 'producto', v)}
            >
              <span className="item-nombre">{v}</span>
            </button>
          ))}
        </div>
      )}

      {seccion?.tipo === 'pago' && (
        <div className="lista">
          {OPCIONES_PAGO.map((v) => (
            <Boton key={v} titulo={v} variante="secundario" onClick={() => elegirPago(v)} />
          ))}
          <Boton
            titulo="Dividir método de pago"
            variante="secundario"
            onClick={() => setSeccion({ tipo: 'pago_dividir' })}
          />
        </div>
      )}

      {seccion?.tipo === 'pago_dividir' && (
        <div className="lista">
          <Fila
            etiqueta="Efectivo"
            valor={montosDivididos.efectivo != null ? `$${montosDivididos.efectivo.toLocaleString('es-AR')}` : 'Sin cargar'}
            onCambiar={() => abrirMontoDividido('efectivo')}
          />
          <Fila
            etiqueta="Transferencia"
            valor={
              montosDivididos.transferencia != null
                ? `$${montosDivididos.transferencia.toLocaleString('es-AR')}`
                : 'Sin cargar'
            }
            onCambiar={() => abrirMontoDividido('transferencia')}
          />
          <Boton
            titulo="Confirmar"
            disabled={montosDivididos.efectivo == null || montosDivididos.transferencia == null}
            onClick={confirmarPagoDividido}
          />
        </div>
      )}

      {esKeypad && (
        <div className="teclado">
          <div className="monto-preview">${montoTexto || '0'}</div>
          <div className="teclas">
            {teclas.map((t) => (
              <button
                key={t}
                className="tecla"
                onClick={() => {
                  if (t === '⌫') return setMontoTexto((m) => m.slice(0, -1))
                  if (t === 'OK') {
                    return seccion.tipo === 'pago_dividir_monto' ? confirmarMontoDividido() : confirmarMonto()
                  }
                  setMontoTexto((m) => m + t)
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      {seccion === null && <Boton titulo="Siguiente" onClick={confirmar} />}
      {seccion !== null && !esKeypad && (
        <Boton titulo="Cancelar" variante="emergencia" chico onClick={() => setSeccion(null)} />
      )}
    </div>
  )
}
