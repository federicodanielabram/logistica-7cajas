import Boton from '../components/Boton'

export default function Yendo({ parada, puedeDeshacer, onEntregado, onSiguienteCliente, onDeshacer, onReordenar }) {
  return (
    <div className="pantalla pantalla-yendo">
      <div className="centro-flex">
        <div className="etiqueta">Yendo a</div>
        <div className="cliente-grande">{parada.cliente}</div>
        {parada.es_transporte && <div className="item-subtitulo">TRANS. {parada.empresa_transporte}</div>}
        {parada.direccion ? <div className="direccion">{parada.direccion}</div> : null}
        {parada.horario ? <div className="item-subtitulo">🕒 {parada.horario}</div> : null}
        {parada.notas ? <div className="notas">📌 {parada.notas}</div> : null}
      </div>
      <div>
        <Boton titulo="Entregado" onClick={onEntregado} />
        <Boton titulo="Siguiente cliente (no entregó)" variante="secundario" onClick={onSiguienteCliente} />
        <Boton titulo="Reordenar lista" variante="secundario" chico onClick={onReordenar} />
        {puedeDeshacer && <Boton titulo="↩ Volver atrás" variante="emergencia" chico onClick={onDeshacer} />}
      </div>
    </div>
  )
}
