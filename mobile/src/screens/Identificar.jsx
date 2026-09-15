import Boton from '../components/Boton'

export default function Identificar({ choferes, cargando, onElegir }) {
  return (
    <div className="pantalla pantalla-centrada">
      <h1 className="titulo-marca">Empezar recorrido</h1>
      {cargando && <p>Cargando…</p>}
      {choferes.map((chofer) => (
        <Boton key={chofer.id} titulo={chofer.nombre} onClick={() => onElegir(chofer)} />
      ))}
    </div>
  )
}
