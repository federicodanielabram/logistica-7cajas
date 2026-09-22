import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'
import foto1 from '../assets/inicio/distribucion1.jpg'
import foto2 from '../assets/inicio/distribucion2.jpg'
import foto3 from '../assets/inicio/distribucion3.jpg'
import foto4 from '../assets/inicio/distribucion4.jpg'

const FOTOS = [foto1, foto2, foto3, foto4]
const INTERVALO_MS = 2500

export default function Inicio() {
  const [activa, setActiva] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setActiva((i) => (i + 1) % FOTOS.length)
    }, INTERVALO_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="pantalla-inicio">
      <div className="carrusel-inicio">
        {FOTOS.map((foto, i) => (
          <div
            key={foto}
            className="carrusel-foto"
            style={{ backgroundImage: `url(${foto})`, opacity: i === activa ? 1 : 0 }}
          />
        ))}
        <div className="carrusel-velo" />
      </div>
      <div className="inicio-contenido">
        <img src={logo} alt="" className="inicio-imagen" />
        <h1 className="inicio-titulo">Logística de Repartos</h1>
      </div>
    </div>
  )
}
