import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { supabase } from './lib/supabase'
import logo from './assets/logo.png'
import Login from './pages/Login'
import ActualizarRecorrido from './pages/ActualizarRecorrido'
import RecorridoDelDia from './pages/RecorridoDelDia'
import Panel from './pages/Panel'

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
        <span className="logo">
          <img src={logo} alt="" />
          <span>7 Cajas</span>
        </span>
        <nav>
          <NavLink to="/" end>
            Actualizar recorrido
          </NavLink>
          <NavLink to="/recorrido">Recorrido de hoy</NavLink>
          <NavLink to="/panel">Panel por chofer</NavLink>
        </nav>
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
          <Route path="/" element={<ActualizarRecorrido />} />
          <Route path="/recorrido" element={<RecorridoDelDia />} />
          <Route path="/panel" element={<Panel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
