import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import { hoyISO } from './lib/formato'
import logo from './assets/logo.png'
import ActualizacionDisponible from './components/ActualizacionDisponible'
import Identificar from './screens/Identificar'
import SeleccionarParadas from './screens/SeleccionarParadas'
import OrdenarLista from './screens/OrdenarLista'
import Yendo from './screens/Yendo'
import ResumenEntrega from './screens/ResumenEntrega'
import EditarEntrega from './screens/EditarEntrega'
import CerrarDia from './screens/CerrarDia'
import AgregarParadas from './screens/AgregarParadas'

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
    multiproducto: parada.multiproducto,
    forma_pago: parada.forma_pago,
    monto_efectivo: parada.monto_efectivo,
    orden: pc.orden,
    estado: pc.estado,
    litros_confirmado: pc.litros_confirmado,
    producto_confirmado: pc.producto_confirmado,
    forma_pago_confirmada: pc.forma_pago_confirmada,
    monto_confirmado: pc.monto_confirmado,
    pago_dividido: pc.pago_dividido,
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
  // true cuando "editar" se abrió desde un punto verde de "Elegí tus
  // paradas" (una entrega de una tanda anterior, ya cerrada) en vez de desde
  // el flujo normal de confirmar una entrega en curso — cambia adónde vuelve
  // "Siguiente" y a qué le pega el guardado (ver `onGuardarPuntoPrevio`).
  const [editandoPuntoPrevio, setEditandoPuntoPrevio] = useState(false)

  // Botón/gesto "atrás" de Android: se registra UNA SOLA VEZ (nunca se
  // vuelve a registrar) para evitar los quilombos de antes. Usa refs para
  // leer siempre el estado actual sin necesidad de re-suscribirse — clave
  // para no caer en closures viejas dentro de un efecto que se registra
  // una sola vez al montar.
  const pantallaRef = useRef(pantalla)
  useEffect(() => {
    pantallaRef.current = pantalla
  })

  // Mismo motivo que `pantallaRef`: el handler de "atrás" se registra una
  // sola vez, así que necesita leer el valor fresco de acá en vez de cerrar
  // sobre el de cuando se montó.
  const editandoPuntoPrevioRef = useRef(editandoPuntoPrevio)
  useEffect(() => {
    editandoPuntoPrevioRef.current = editandoPuntoPrevio
  })

  // `onVolverAUltimo` se define más abajo en el componente (function
  // declaration, así que ya existe para cuando este efecto corre) pero
  // cambia de identidad en cada render porque cierra sobre `historial`/`ruta`
  // actuales — lo guardamos en un ref para llamar siempre a la versión
  // fresca.
  const onVolverAUltimoRef = useRef(() => {})
  useEffect(() => {
    onVolverAUltimoRef.current = onVolverAUltimo
  })

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    function alAtras() {
      window.history.pushState(null, '', window.location.href)
      switch (pantallaRef.current) {
        case 'seleccionar':
          setPantalla('identificar')
          break
        case 'ordenar_inicial':
          setPantalla('seleccionar')
          cargarParadasDelDia()
          break
        case 'yendo':
          setPantalla('reordenar_ruta')
          break
        case 'resumen':
          setPantalla('yendo')
          break
        case 'editar':
          setPantalla(editandoPuntoPrevioRef.current ? 'seleccionar' : 'resumen')
          break
        case 'reordenar_ruta':
          setPantalla('agregar_paradas')
          cargarParadasDelDia()
          break
        case 'agregar_paradas':
          setPantalla('identificar')
          break
        case 'cerrar_dia':
          onVolverAUltimoRef.current()
          break
        default:
          break // identificar: sin mapear, es punta
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
        await cargarParadasDelDia(guardada.chofer.id)
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

  // Se usa al elegir chofer y también cada vez que se vuelve a "Seleccionar
  // paradas" o "Agregar paradas" en pleno reparto, para traer pedidos nuevos
  // que el vendedor haya cargado mientras tanto. También trae, para el
  // chofer actual, la fila completa de `parada_chofer` de cualquier parada
  // que ya haya resuelto hoy en una tanda anterior (por ejemplo si cerró el
  // día y volvió a elegir su nombre para sumar más entregas) — así "Elegí
  // tus paradas" puede seguir mostrando en verde/rojo lo que ya hizo (en vez
  // de mostrarlo como si nada) y, si fue una entrega, dejarla tocar para
  // editar litros/producto/pago sin tener que reabrir el día.
  async function cargarParadasDelDia(choferId = chofer?.id) {
    const { data } = await supabase
      .from('parada')
      .select('*')
      .eq('fecha', fecha)
      .order('orden_planilla', { ascending: true })

    let previoPorParada = {}
    if (choferId) {
      const { data: previas } = await supabase
        .from('parada_chofer')
        .select('*')
        .eq('chofer_id', choferId)
        .eq('fecha', fecha)
      previoPorParada = Object.fromEntries((previas ?? []).map((p) => [p.parada_id, p]))
    }

    setParadasDelDia(
      (data ?? []).map((p) => ({
        ...p,
        estado_previo: previoPorParada[p.id]?.estado ?? null,
        previo: previoPorParada[p.id] ?? null,
      }))
    )
  }

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

    await cargarParadasDelDia(choferElegido.id)
    setSeleccionadas(new Set())
    setPantalla('seleccionar')
  }

  // Tocar un punto verde en "Elegí tus paradas" abre su edición — para
  // corregir una entrega de una tanda anterior (día cerrado y reabierto)
  // que quedó mal cargada, sin tener que reabrir todo el día.
  function onEditarPuntoPrevio(parada) {
    const previo = parada.previo
    if (!previo || previo.estado !== 'entregado') return
    setBufferEdicion({
      itemId: previo.id,
      cliente: parada.cliente,
      litros: previo.litros_confirmado,
      producto: previo.producto_confirmado,
      multiproducto: previo.multiproducto,
      formaPago: previo.forma_pago_confirmada,
      monto: previo.monto_confirmado,
      pagoDividido: previo.pago_dividido,
    })
    setEditandoPuntoPrevio(true)
    setPantalla('editar')
  }

  // A diferencia de `onConfirmarResumen` (que opera sobre `ruta`, la
  // entrega en curso), esto guarda directo en la base: el punto editado no
  // es parte del recorrido activo, es de una tanda ya cerrada.
  async function onGuardarPuntoPrevio(buffer) {
    const cambios = {
      litros_confirmado: buffer.litros,
      producto_confirmado: buffer.producto,
      forma_pago_confirmada: buffer.formaPago,
      monto_confirmado: buffer.monto,
      pago_dividido: buffer.pagoDividido,
      editado: true,
    }
    await supabase.from('parada_chofer').update(cambios).eq('id', buffer.itemId)
    setParadasDelDia((prev) =>
      prev.map((p) => (p.previo?.id === buffer.itemId ? { ...p, previo: { ...p.previo, ...cambios } } : p))
    )
    setBufferEdicion(null)
    setEditandoPuntoPrevio(false)
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
    const paradasPorId = Object.fromEntries(paradasDelDia.map((p) => [p.id, p]))
    // El orden acá es el orden en que se fueron tildando (orden de inserción
    // del Set), no el de la planilla — así el armado del recorrido arranca
    // ya ordenado como el chofer los fue eligiendo.
    const items = [...seleccionadas]
      .map((id) => paradasPorId[id])
      .filter(Boolean)
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

    // Si ya habías arrancado antes y volviste a elegir tus paradas, tus
    // filas en_espera de la vuelta anterior siguen en la base — insertarlas
    // de nuevo chocaría contra el unique (parada_id, chofer_id) y "Empezar"
    // quedaría roto para siempre. Las entregadas/descartadas no se tocan.
    const { error: errorLimpieza } = await supabase
      .from('parada_chofer')
      .delete()
      .eq('chofer_id', chofer.id)
      .eq('fecha', fecha)
      .eq('estado', 'en_espera')
    if (errorLimpieza) {
      alert('No se pudo arrancar el recorrido. Probá de nuevo en un momento.')
      return
    }

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
      multiproducto: targetActual.multiproducto,
      formaPago: targetActual.forma_pago,
      monto: targetActual.monto_efectivo,
      pagoDividido: false, // recién sale de la planilla, todavía no se dividió nada
    })
    setPantalla('resumen')
  }

  async function onSiguienteCliente() {
    const item = targetActual
    setHistorial((h) => [...h, { itemId: item.id, tipo: 'descartado' }])
    await actualizarItemRuta(item.id, { estado: 'descartado', entregado_en: new Date().toISOString() })
  }

  // Botón "↩ Volver atrás" de Yendo, y atrás de Android desde "Cerrar el
  // día": ambos apuntan acá. Si el último punto fue un "no entregó", no hay
  // nada que confirmar — se revierte a en_espera para volver a intentarlo.
  // Si fue una entrega, se abre su confirmación (Resumen) para poder
  // revisarla o editarla, sin tocar la base hasta que se confirme de nuevo.
  async function onVolverAUltimo() {
    const ultimo = historial[historial.length - 1]
    if (!ultimo) return

    if (ultimo.tipo === 'descartado') {
      setHistorial((h) => h.slice(0, -1))
      await actualizarItemRuta(ultimo.itemId, { estado: 'en_espera', entregado_en: null })
      setPantalla('yendo')
      return
    }

    const item = ruta.find((i) => i.id === ultimo.itemId)
    if (!item) return
    setBufferEdicion({
      itemId: item.id,
      cliente: item.cliente,
      litros: item.litros_confirmado,
      producto: item.producto_confirmado,
      multiproducto: item.multiproducto,
      formaPago: item.forma_pago_confirmada,
      monto: item.monto_confirmado,
      pagoDividido: item.pago_dividido,
    })
    setPantalla('resumen')
  }

  // Tocar una parada verde en "Reordenar lista" abre su edición directo,
  // sin pasar por Resumen — a diferencia de "↩ Volver atrás" (que solo
  // llega al último punto del historial), esto permite corregir cualquier
  // entrega ya confirmada, esté donde esté en la ruta.
  function onEditarDesdeOrden(itemId) {
    const item = ruta.find((i) => i.id === itemId)
    if (!item || item.estado !== 'entregado') return
    setBufferEdicion({
      itemId: item.id,
      cliente: item.cliente,
      litros: item.litros_confirmado,
      producto: item.producto_confirmado,
      multiproducto: item.multiproducto,
      formaPago: item.forma_pago_confirmada,
      monto: item.monto_confirmado,
      pagoDividido: item.pago_dividido,
    })
    setEditandoPuntoPrevio(false) // este es el flujo normal (ruta activa), no el de un punto de una tanda ya cerrada
    setPantalla('editar')
  }

  async function onConfirmarResumen() {
    const original = ruta.find((i) => i.id === bufferEdicion.itemId)
    const editado =
      bufferEdicion.litros !== original.litros ||
      bufferEdicion.producto !== original.producto ||
      bufferEdicion.formaPago !== original.forma_pago ||
      bufferEdicion.monto !== original.monto_efectivo

    setHistorial((h) => {
      const ultimo = h[h.length - 1]
      // Si se está reconfirmando el mismo punto (se volvió con "↩ Volver
      // atrás" y se confirmó de nuevo), no duplicar la entrada.
      if (ultimo && ultimo.itemId === bufferEdicion.itemId) return h
      return [...h, { itemId: bufferEdicion.itemId, tipo: 'entregado' }]
    })
    await actualizarItemRuta(bufferEdicion.itemId, {
      estado: 'entregado',
      litros_confirmado: bufferEdicion.litros,
      producto_confirmado: bufferEdicion.producto,
      forma_pago_confirmada: bufferEdicion.formaPago,
      monto_confirmado: bufferEdicion.monto,
      pago_dividido: bufferEdicion.pagoDividido,
      editado,
      entregado_en: new Date().toISOString(),
    })
    setBufferEdicion(null)
    setPantalla('yendo')
  }

  // Agregar en pleno reparto una parada del día que no habías elegido al
  // arrancar (se llega acá yendo hacia atrás desde "Reordenar lista").
  async function onAgregarParada(paradaId) {
    const parada = paradasDelDia.find((p) => p.id === paradaId)
    if (!parada) return
    const maxOrden = ruta.length > 0 ? Math.max(...ruta.map((i) => i.orden)) + 1 : 0
    const { data, error } = await supabase
      .from('parada_chofer')
      .insert({ parada_id: paradaId, chofer_id: chofer.id, fecha, orden: maxOrden, estado: 'en_espera' })
      .select()
      .single()
    if (error) {
      alert('No se pudo agregar la parada. Probá de nuevo.')
      return
    }
    setRuta((prev) => [...prev, aItemRuta(data, parada)])
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
        onEditarPrevio={onEditarPuntoPrevio}
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
        onDeshacer={onVolverAUltimo}
        onReordenar={() => setPantalla('reordenar_ruta')}
      />
    )
  }

  if (pantalla === 'resumen' && bufferEdicion) {
    return (
      <ResumenEntrega
        buffer={bufferEdicion}
        onSiguiente={onConfirmarResumen}
        onEditar={() => {
          setEditandoPuntoPrevio(false)
          setPantalla('editar')
        }}
      />
    )
  }

  if (pantalla === 'editar' && bufferEdicion) {
    return (
      <EditarEntrega
        bufferInicial={bufferEdicion}
        onListo={
          editandoPuntoPrevio
            ? onGuardarPuntoPrevio
            : (buffer) => {
                setBufferEdicion(buffer)
                setPantalla('resumen')
              }
        }
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
        onEditar={onEditarDesdeOrden}
      />
    )
  }

  if (pantalla === 'agregar_paradas') {
    return (
      <AgregarParadas
        paradas={paradasDelDia}
        idsEnRuta={new Set(ruta.map((i) => i.parada_id))}
        onAgregar={onAgregarParada}
        onListo={() => setPantalla('reordenar_ruta')}
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
      <header className="header-chofer">
        <div className="header-chofer-marca">
          <img src={logo} alt="" className="header-chofer-logo" />
          <span className="header-chofer-texto">Logística de repartos</span>
        </div>
        <span className="header-chofer-version">v1.3</span>
      </header>
      {pantallaActual()}
      <ActualizacionDisponible />
    </>
  )
}
