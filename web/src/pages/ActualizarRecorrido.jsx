import { useMemo, useState } from 'react'
import { parsearRecorrido } from '../lib/parser'
import { actualizarRecorrido, hoyISO } from '../lib/recorrido'

export default function ActualizarRecorrido() {
  const [texto, setTexto] = useState('')
  const [resultado, setResultado] = useState(null)
  const [subiendo, setSubiendo] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const fecha = hoyISO()

  function onCambiarTexto(e) {
    const valor = e.target.value
    setTexto(valor)
    setMensaje(null)
    if (!valor.trim()) {
      setResultado(null)
      return
    }
    setResultado(parsearRecorrido(valor, fecha))
  }

  async function onConfirmar() {
    if (!resultado || resultado.paradas.length === 0) return
    setSubiendo(true)
    setMensaje(null)
    try {
      const { insertadas, yaExistian } = await actualizarRecorrido(resultado.paradas, fecha)
      let texto = `Recorrido actualizado: ${insertadas} parada(s) nueva(s) agregada(s).`
      if (yaExistian > 0) {
        texto += ` (${yaExistian} ya estaban cargadas, no se tocaron.)`
      }
      setMensaje({ tipo: 'ok', texto })
      setTexto('')
      setResultado(null)
    } catch (err) {
      setMensaje({ tipo: 'error', texto: `Error al actualizar: ${err.message}` })
    } finally {
      setSubiendo(false)
    }
  }

  const totalLitros = useMemo(
    () => (resultado ? resultado.paradas.reduce((acc, p) => acc + (p.litros || 0), 0) : 0),
    [resultado]
  )

  return (
    <div className="pagina">
      <h2>Actualizar recorrido — {fecha}</h2>
      <p className="ayuda">
        Pegá la hoja semanal completa (Ctrl+A, Ctrl+C en Sheets) — no hace falta filtrar nada a
        mano, el sistema se queda solo con las filas de la fecha de hoy.
      </p>
      <textarea
        className="pegado"
        placeholder="Pegá acá el contenido de la hoja semanal…"
        value={texto}
        onChange={onCambiarTexto}
        rows={8}
      />

      {resultado && (
        <div className="vista-previa">
          <h3>
            Vista previa — {resultado.paradas.length} paradas · {totalLitros} litros totales
          </h3>
          {resultado.errores.length > 0 && (
            <div className="errores">
              <strong>{resultado.errores.length} fila(s) no se pudieron interpretar:</strong>
              <ul>
                {resultado.errores.map((e) => (
                  <li key={e.linea}>
                    Línea {e.linea}: {e.motivo} — <code>{e.texto.slice(0, 80)}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="tabla-scroll">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Producto</th>
                  <th>Litros</th>
                  <th>Total</th>
                  <th>Pago</th>
                  <th>Dirección</th>
                  <th>Horario</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {resultado.paradas.map((p, i) => (
                  <tr key={i} className={p.es_transporte ? 'fila-transporte' : ''}>
                    <td>
                      {p.cliente}
                      {p.es_transporte && (
                        <div className="subtitulo-chico">TRANS. {p.empresa_transporte}</div>
                      )}
                    </td>
                    <td>{p.producto}</td>
                    <td>{p.litros ?? '—'}</td>
                    <td>{p.total ? `$${p.total.toLocaleString('es-AR')}` : '—'}</td>
                    <td>
                      {p.forma_pago}
                      {p.monto_efectivo ? ` ($${p.monto_efectivo.toLocaleString('es-AR')})` : ''}
                    </td>
                    <td>{p.direccion}</td>
                    <td>{p.horario}</td>
                    <td>{p.notas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={onConfirmar} disabled={subiendo || resultado.paradas.length === 0}>
            {subiendo ? 'Actualizando…' : 'Actualizar recorrido'}
          </button>
        </div>
      )}

      {mensaje && <p className={mensaje.tipo === 'error' ? 'error' : 'ok'}>{mensaje.texto}</p>}
    </div>
  )
}
