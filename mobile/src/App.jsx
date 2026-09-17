import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { hoyISO } from './lib/formato'
import ActualizacionDisponible from './components/ActualizacionDisponible'
import Identificar from './screens/Identificar'
import SeleccionarParadas from './screens/SeleccionarParadas'
import OrdenarLista from './screens/OrdenarLista'
import Yendo from './screens/Yendo'
import ResumenEntrega from './screens/ResumenEntrega'
import EditarEntrega from './screens/EditarEntrega'
import CerrarDia from './screens/CerrarDia'

const fecha = hoyISO()
const CLAVE_SESION = '7cajas_sesion_chofer'

// Guardamos localmente quién sos y, si todavía no apretaste "Empezar", tu
// selección/orden de paradas en curso — así una recarga (una actualización
// de la PWA, quedarte sin batería, lo que sea) no te hace perder el progreso
// ni te obliga a tocar tu nombre de nuevo. Una vez que "Empezar" corre, la
// base de datos pasa a ser la fuente de verdad (ver `onElegirChofer`).
function guardarSesionLocal(datos) {
  try {
    localStorage.setItem(CLAVE_SESION, JSON.stringify({ fecha, ...datos }))
  } catch {
    // localStorage puede fallar (modo privado, cuota llena) — no es grave, seguimos sin persistir.
  }
}

function leerSesionLocal() {
  try {
    const guardada = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null')
    return guardada && guardada.fecha === fecha ? guardada : null
  } catch {
    return null
  }
}

function borrarSesionLocal() {
  try {
    localStorage.removeItem(CLAVE_SESION)
  } catch {
    // ignorar
  }
}

// Convierte una fila de `parada_chofer` (+ su `parada` asociada) a lo que
// consumen las pantallas del recorrido.
function aItemRuta(pc, parada) {
  return {
    id: pc.id,
    parada_id: parada.id,
    cliente: parada.cliente,
    es_transporte: parada.es_transporte,
    empresa_transporte: parada.empresa_transporte,
    direccion: parada.direccion,
    horario: parada.horario,
    notas: parada.notas,
    litros: parada.litros,
    producto: parada.producto,
    forma_pago: parada.forma_pago,
    monto_efectivo: parada.monto_efectivo,
    orden: pc.orden,
    estado: pc.estado,
    litros_confirmado: pc.litros_confirmado,
    producto_confirmado: pc.producto_confirmado,
    forma_pago_confirmada: pc.forma_pago_confirmada,
    monto_confirmado: pc.monto_confirmado,
    editado: pc.editado,
  }
}

export default function App() {
  const [pantalla, setPantalla] = useState('identificar')
  const [choferes, setChoferes] = useState([])
  const [cargandoChoferes, setCargandoChoferes] = useState(true)
  const [chofer, setChofer] = useState(null)

  const [paradasDelDia, setParadasDelDia] = useState([])
  const [seleccionadas, setSeleccionadas] = useState(new Set())
  const [ordenLocal, setOrdenLocal] = useState([]) // pre-arranque, ids de `parada`

  const [ruta, setRuta] = useState([]) // post-arranque, respaldado en `parada_chofer`
  const [historial, setHistorial] = useState([]) // para "Volver atrás"
  const [bufferEdicion, setBufferEdicion] = useState(null)

  // Botón/gesto "atrás" de Android: se registra UNA SOLA VEZ (nunca se
  // vuelve a registrar) para evitar los quilombos de antes. Usa un ref para
  // leer siempre la pantalla actual sin necesidad de re-suscribirse.
  // Empezamos con un solo caso mapeado (ordenar_inicial -> seleccionar); el
  // resto de las pantallas no hacen nada todavía — se van sumando de a una,
  // probando cada una antes de seguir.
  const pantallaRef = useRef(pantalla)
  useEffect(() => {
    pantallaRef.current = pantalla
  })

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    function alAtras() {
      window.history.pushState(null, '', window.location.href)
      if (pantallaRef.current === 'ordenar_inicial') {
        setPantalla('seleccionar')
      }
    }
    window.addEventListener('popstate', alAtras)
    return () => window.removeEventListener('popstate', alAtras)
  }, [])

  useEffect(() => {
    supabase
      .from('chofer')
      .select('*')
      .order('nombre')
      .then(({ data }) => {
        setChoferes(data ?? [])
        setCargandoChoferes(false)
      })
  }, [])

  // Al abrir la app, si había una sesión de hoy guardada, retomamos sin
  // pedir de nuevo quién sos. OJO: siempre chequeamos primero contra la
  // base si en realidad ya se había arrancado (chofer_dia.iniciado_en) —
  // sin importar qué pantalla haya quedado guardada en el celular. Si
  // confiáramos ciegamente en lo guardado localmente, un "Empezar" repetido
  // (por ejemplo tras una prueba anterior del mismo día) intentaría crear
  // de nuevo las mismas paradas para el chofer y la base lo rechazaría.
  useEffect(() => {
    const guardada = leerSesionLocal()
    if (!guardada?.chofer) return

    async function retomar() {
      const { data: dia } = await supabase
        .from('chofer_dia')
        .select('*')
        .eq('chofer_id', guardada.chofer.id)
        .eq('fecha', fecha)
        .maybeSingle()

      if (dia?.iniciado_en && !dia?.cerrado_en) {
        // Ya se había arrancado de verdad — la base manda, ignoramos lo
        // que haya quedado guardado localmente (podría estar desactualizado).
        onElegirChofer(guardada.chofer)
        return
      }

      if (guardada.pantalla === 'seleccionar' || guardada.pantalla === 'ordenar_inicial') {
        setChofer(guardada.chofer)
        setSeleccionadas(new Set(guardada.seleccionadas ?? []))
        setOrdenLocal(guardada.ordenLocal ?? [])
        setPantalla(guardada.pantalla)
        const { data: paradas } = await supabase
          .from('parada')
          .select('*')
          .eq('fecha', fecha)
          .order('orden_planilla', { ascending: true })
        setParadasDelDia(paradas ?? [])
      }
    }

    retomar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Mientras el chofer todavía está eligiendo/ordenando (antes de
  // "Empezar"), vamos guardando el progreso local por las dudas.
  useEffect(() => {
    if (!chofer) return
    if (pantalla === 'seleccionar' || pantalla === 'ordenar_inicial') {
      guardarSesionLocal({ chofer, seleccionadas: [...seleccionadas], ordenLocal, pantalla })
    }
  }, [chofer, seleccionadas, ordenLocal, pantalla])

  async function onElegirChofer(choferElegido) {
    setChofer(choferElegido)

    const { data: dia } = await supabase
      .from('chofer_dia')
      .select('*')
      .eq('chofer_id', choferElegido.id)
      .eq('fecha', fecha)
      .maybeSingle()

    if (dia?.iniciado_en && !dia?.cerrado_en) {
      // La app se cerró/reabrió a mitad de recorrido: retomamos donde estaba.
      const { data: filas } = await supabase
        .from('parada_chofer')
        .select('*, parada:parada_id(*)')
        .eq('chofer_id', choferElegido.id)
        .eq('fecha', fecha)
        .order('orden', { ascending: true })
      const rutaRetomada = (filas ?? []).map((f) => aItemRuta(f, f.parada))
      setRuta(rutaRetomada)
      const hayPendientes = rutaRetomada.some((i) => i.estado === 'en_espera')
      setPantalla(hayPendientes ? 'yendo' : 'cerrar_dia')
      return
    }

    const { data: paradas } = await supabase
      .from('parada')
      .select('*')
      .eq('fecha', fecha)
      .order('orden_planilla', { ascending: true })
    setParadasDelDia(paradas ?? [])
    setSeleccionadas(new Set())
    setPantalla('seleccionar')
  }

  function onToggleParada(paradaId) {
    setSeleccionadas((prev) => {
      const next = new Set(prev)
      if (next.has(paradaId)) next.delete(paradaId)
      else next.add(paradaId)
      return next
    })
  }

  function onSiguienteSeleccion() {
    const items = paradasDelDia
      .filter((p) => seleccionadas.has(p.id))
      .map((p) => ({
        id: p.id,
        cliente: p.cliente,
        es_transporte: p.es_transporte,
        empresa_transporte: p.empresa_transporte,
        estado: 'en_espera',
      }))
    setOrdenLocal(items)
    setPantalla('ordenar_inicial')
  }

  function quitarDeLista(setLista) {
    return (id) => setLista((prev) => prev.filter((i) => i.id !== id))
  }

  // Reordenar en pleno reparto (`ruta`) es distinto de reordenar antes de
  // arrancar (`ordenLocal`): acá la posición real la define el campo
  // `orden` (persistido en la base), no la posición dentro del array de
  // React. `OrdenarLista` nos devuelve el subconjunto de pendientes ya en
  // el nuevo orden — les reasignamos `orden` secuencial a partir del primer
  // valor libre después de los ya resueltos, para no pisarlos.
  function onReordenarRuta(pendientesReordenados) {
    const resueltos = ruta.filter((i) => i.estado !== 'en_espera')
    const base = resueltos.length > 0 ? Math.max(...resueltos.map((r) => r.orden)) + 1 : 0
    const nuevoOrdenPorId = Object.fromEntries(pendientesReordenados.map((item, index) => [item.id, base + index]))
    setRuta((prev) => prev.map((i) => (i.id in nuevoOrdenPorId ? { ...i, orden: nuevoOrdenPorId[i.id] } : i)))
  }

  async function onEmpezar() {
    // Si mientras elegías/ordenabas el vendedor volvió a actualizar el
    // recorrido, tus paradas elegidas pueden haber quedado apuntando a filas
    // que ya no existen (todavía no estabas protegido: eso arranca recién
    // acá). Chequeamos contra la base antes de arrancar para no fallar en
    // silencio.
    const idsElegidos = ordenLocal.map((item) => item.id)
    const { data: vigentes } = await supabase.from('parada').select('*').in('id', idsElegidos)
    const paradasVigentesPorId = Object.fromEntries((vigentes ?? []).map((p) => [p.id, p]))
    const ordenVigente = ordenLocal.filter((item) => paradasVigentesPorId[item.id])

    if (ordenVigente.length === 0) {
      alert(
        'El recorrido cambió mientras elegías tus paradas y ya no queda ninguna vigente. Volvé a elegir tus paradas.'
      )
      setPantalla('seleccionar')
      return
    }
    if (ordenVigente.length < ordenLocal.length) {
      alert(
        `El recorrido cambió: ${ordenLocal.length - ordenVigente.length} de tus paradas elegidas ya no existen y se sacaron solas. Revisá el orden antes de seguir.`
      )
      setOrdenLocal(ordenVigente)
      return
    }

    await supabase
      .from('chofer_dia')
      .upsert({ chofer_id: chofer.id, fecha, iniciado_en: new Date().toISOString() }, { onConflict: 'chofer_id,fecha' })

    const filas = ordenVigente.map((item, index) => ({
      parada_id: item.id,
      chofer_id: chofer.id,
      fecha,
      orden: index,
      estado: 'en_espera',
    }))
    const { data: insertadas, error } = await supabase.from('parada_chofer').insert(filas).select()
    if (error) {
      alert('No se pudo arrancar el recorrido. Probá de nuevo en un momento.')
      return
    }

    const rutaNueva = (insertadas ?? [])
      .map((pc) => aItemRuta(pc, paradasVigentesPorId[pc.parada_id]))
      .sort((a, b) => a.orden - b.orden)
    setRuta(rutaNueva)
    setHistorial([])
    setPantalla('yendo')
  }

  // Ordenamos siempre por `orden` acá (en vez de confiar en el orden del
  // array de estado) porque reordenar la ruta cambia ese campo sin
  // necesariamente cambiar la posición del ítem dentro del array de React.
  const rutaOrdenada = [...ruta].sort((a, b) => a.orden - b.orden)
  const targetActual = rutaOrdenada.find((i) => i.estado === 'en_espera')

  useEffect(() => {
    if (pantalla === 'yendo' && !targetActual) setPantalla('cerrar_dia')
  }, [pantalla, targetActual])

  async function actualizarItemRuta(itemId, cambios) {
    await supabase.from('parada_chofer').update(cambios).eq('id', itemId)
    setRuta((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...cambios } : i)))
  }

  function onEntregado() {
    setBufferEdicion({
      itemId: targetActual.id,
      cliente: targetActual.cliente,
      litros: targetActual.litros,
      producto: targetActual.producto,
      formaPago: targetActual.forma_pago,
      monto: targetActual.monto_efectivo,
    })
    setPantalla('resumen')
  }

  async function onSiguienteCliente() {
    const item = targetActual
    setHistorial((h) => [...h, { itemId: item.id }])
    await actualizarItemRuta(item.id, { estado: 'descartado', entregado_en: new Date().toISOString() })
  }

  async function onDeshacer() {
    const ultimo = historial[historial.length - 1]
    if (!ultimo) return
    setHistorial((h) => h.slice(0, -1))
    await actualizarItemRuta(ultimo.itemId, {
      estado: 'en_espera',
      litros_confirmado: null,
      producto_confirmado: null,
      forma_pago_confirmada: null,
      monto_confirmado: null,
      editado: false,
      entregado_en: null,
    })
    setPantalla('yendo')
  }

  async function onConfirmarResumen() {
    const original = ruta.find((i) => i.id === bufferEdicion.itemId)
    const editado =
      bufferEdicion.litros !== original.litros ||
      bufferEdicion.producto !== original.producto ||
      bufferEdicion.formaPago !== original.forma_pago ||
      bufferEdicion.monto !== original.monto_efectivo

    setHistorial((h) => [...h, { itemId: bufferEdicion.itemId }])
    await actualizarItemRuta(bufferEdicion.itemId, {
      estado: 'entregado',
      litros_confirmado: bufferEdicion.litros,
      producto_confirmado: bufferEdicion.producto,
      forma_pago_confirmada: bufferEdicion.formaPago,
      monto_confirmado: bufferEdicion.monto,
      editado,
      entregado_en: new Date().toISOString(),
    })
    setBufferEdicion(null)
    setPantalla('yendo')
  }

  async function onQuitarDeRuta(itemId) {
    await supabase.from('parada_chofer').delete().eq('id', itemId)
    setRuta((prev) => prev.filter((i) => i.id !== itemId))
  }

  async function onConfirmarReordenamiento() {
    // `onReordenarRuta` ya dejó los valores de `orden` correctos en el
    // estado local tras el arrastre — acá solo los persistimos.
    const pendientes = ruta.filter((i) => i.estado === 'en_espera')
    await Promise.all(
      pendientes.map((item) => supabase.from('parada_chofer').update({ orden: item.orden }).eq('id', item.id))
    )
    setPantalla('yendo')
  }

  async function onCerrarDia() {
    await supabase
      .from('chofer_dia')
      .update({ cerrado_en: new Date().toISOString() })
      .eq('chofer_id', chofer.id)
      .eq('fecha', fecha)
    borrarSesionLocal()
    setChofer(null)
    setRuta([])
    setHistorial([])
    setSeleccionadas(new Set())
    setPantalla('identificar')
  }

  function pantallaActual() {
  if (pantalla === 'identificar') {
    return <Identificar choferes={choferes} cargando={cargandoChoferes} onElegir={onElegirChofer} />
  }

  if (pantalla === 'seleccionar') {
    return (
      <SeleccionarParadas
        paradas={paradasDelDia}
        seleccionadas={seleccionadas}
        onToggle={onToggleParada}
        onSiguiente={onSiguienteSeleccion}
      />
    )
  }

  if (pantalla === 'ordenar_inicial') {
    return (
      <OrdenarLista
        items={ordenLocal}
        onReordenar={setOrdenLocal}
        onQuitar={quitarDeLista(setOrdenLocal)}
        onConfirmar={onEmpezar}
        tituloBoton="Empezar"
      />
    )
  }

  if (pantalla === 'yendo' && targetActual) {
    return (
      <Yendo
        parada={targetActual}
        puedeDeshacer={historial.length > 0}
        onEntregado={onEntregado}
        onSiguienteCliente={onSiguienteCliente}
        onDeshacer={onDeshacer}
        onReordenar={() => setPantalla('reordenar_ruta')}
      />
    )
  }

  if (pantalla === 'resumen' && bufferEdicion) {
    return <ResumenEntrega buffer={bufferEdicion} onSiguiente={onConfirmarResumen} onEditar={() => setPantalla('editar')} />
  }

  if (pantalla === 'editar' && bufferEdicion) {
    return (
      <EditarEntrega
        bufferInicial={bufferEdicion}
        onListo={(buffer) => {
          setBufferEdicion(buffer)
          setPantalla('resumen')
        }}
      />
    )
  }

  if (pantalla === 'reordenar_ruta') {
    return (
      <OrdenarLista
        items={rutaOrdenada}
        onReordenar={onReordenarRuta}
        onQuitar={onQuitarDeRuta}
        onConfirmar={onConfirmarReordenamiento}
        tituloBoton="Siguiente"
      />
    )
  }

  if (pantalla === 'cerrar_dia') {
    return <CerrarDia items={rutaOrdenada} onCerrar={onCerrarDia} />
  }

  return null
  }

  return (
    <>
      {pantallaActual()}
      <ActualizacionDisponible />
    </>
  )
}
