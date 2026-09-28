import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, Link } from 'react-router-dom'
import { supabase } from './lib/supabase'
import logo from './assets/logo.png'
import wordmark from './assets/logo-wordmark-dark.png'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import ActualizarRecorrido from './pages/ActualizarRecorrido'
import RecorridoDelDia from './pages/RecorridoDelDia'
import Panel from './pages/Panel'
import Historial from './pages/Historial'

function useSesion() {
  const [sesion, setSesion] = useState(undefined) // undefined = cargando, null = sin sesión

  useEffect(() => {
    supabase
      .auth.getSession()
      .then(({ data }) => setSesion(data.session))
      // Si Supabase todavía no está conectado (variables de entorno sin
      // completar) esto rechaza en vez de resolver — sin este catch la
      // pantalla queda en "Cargando…" para siempre.
      .catch(() => setSesion(null))
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSesion(session))
    return () => sub.subscription.unsubscribe()
  }, [])

  return sesion
}

function Layout({ children }) {
  return (
    <div className="app">
      <header className="header">
        <Link to="/inicio" className="logo">
          <img src={logo} alt="" className="logo-icono" />
          <span
            className="logo-wordmark"
            role="img"
            aria-label="7 Cajas"
            style={{ WebkitMaskImage: `url(${wordmark})`, maskImage: `url(${wordmark})` }}
          />
        </Link>
        <nav>
          <NavLink to="/inicio">Inicio</NavLink>
          <NavLink to="/" end>
            Actualizar recorrido
          </NavLink>
          <NavLink to="/recorrido">Recorrido de hoy</NavLink>
          <NavLink to="/panel">Panel por chofer</NavLink>
          <NavLink to="/historial">Historial</NavLink>
        </nav>
        <span className="version">Versión 1.3</span>
        <button className="link" onClick={() => supabase.auth.signOut()}>
          Salir
        </button>
      </header>
      <main>{children}</main>
    </div>
  )
}

export default function App() {
  const sesion = useSesion()

  if (sesion === undefined) return <div className="pantalla-centrada">Cargando…</div>
  if (sesion === null) return <Login />

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/inicio" element={<Inicio />} />
          <Route path="/" element={<ActualizarRecorrido />} />
          <Route path="/recorrido" element={<RecorridoDelDia />} />
          <Route path="/panel" element={<Panel />} />
          <Route path="/historial" element={<Historial />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
