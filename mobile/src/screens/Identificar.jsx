import Boton from '../components/Boton'
// Acá específicamente en blanco: el crema del logo original se pierde contra
// el fondo de esta pantalla, que es prácticamente el mismo color.
import logo from '../assets/logo-blanco.png'

export default function Identificar({ choferes, cargando, onElegir }) {
  return (
    <div className="pantalla pantalla-centrada">
      <div className="identificar-marca">
        <img src={logo} alt="" className="identificar-logo" />
        <p className="identificar-titulo">Logística de repartos</p>
      </div>
      <h1 className="titulo-marca">Empezar recorrido</h1>
      {cargando && <p>Cargando…</p>}
      {choferes.map((chofer) => (
        <Boton key={chofer.id} titulo={chofer.nombre} onClick={() => onElegir(chofer)} />
      ))}
    </div>
  )
}
