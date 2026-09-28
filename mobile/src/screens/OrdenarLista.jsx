import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Boton from '../components/Boton'
import { resumenTexto } from '../lib/formato'

const CLASE_ESTADO = { entregado: 'item-verde', descartado: 'item-rojo' }

function ItemArrastrable({ item, onQuitar }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="item">
      <span className="item-asa" {...attributes} {...listeners}>
        ≡
      </span>
      <div style={{ flex: 1 }}>
        <div className="item-nombre">{item.cliente}</div>
        {item.es_transporte && <div className="item-subtitulo">TRANS. {item.empresa_transporte}</div>}
      </div>
      <button className="item-icono-btn" onClick={() => onQuitar(item.id)}>
        🗑️
      </button>
    </div>
  )
}

// Entregados quedan clickeables para reabrir su edición directamente (por si
// el chofer se confundió al cargar litros/producto/pago y ya no es el último
// punto resuelto, así que "↩ Volver atrás" en Yendo no llega hasta acá).
// Descartados no tienen nada para editar, quedan solo como referencia.
function ItemResuelto({ item, onEditar }) {
  const editable = item.estado === 'entregado' && Boolean(onEditar)
  const Tag = editable ? 'button' : 'div'
  return (
    <Tag className={`item ${CLASE_ESTADO[item.estado]}`} onClick={editable ? () => onEditar(item.id) : undefined}>
      <div>
        <div className="item-nombre">
          {item.estado === 'entregado'
            ? resumenTexto({
                litros: item.litros_confirmado,
                producto: item.producto_confirmado,
                cliente: item.cliente,
                formaPago: item.forma_pago_confirmada,
                monto: item.monto_confirmado,
                multiproducto: item.multiproducto,
                pagoDividido: item.pago_dividido,
              })
            : item.cliente}
        </div>
        {item.es_transporte && <div className="item-subtitulo">TRANS. {item.empresa_transporte}</div>}
      </div>
      {editable && <span className="item-icono-btn">✎</span>}
    </Tag>
  )
}

/**
 * Lista reordenable de paradas (mantener presionado el ≡ y arrastrar). Se usa
 * antes de arrancar el recorrido (todo en_espera) y en pleno reparto
 * ("Reordenar lista"): ahí los ítems ya resueltos (verde/rojo) quedan fijos
 * al fondo, fuera del arrastre.
 */
export default function OrdenarLista({ items, onReordenar, onQuitar, onConfirmar, tituloBoton, onEditar }) {
  const pendientes = items.filter((i) => i.estado === 'en_espera')
  const resueltos = items.filter((i) => i.estado !== 'en_espera')

  // Delay chico para que el long-press dispare el arrastre sin robarle el
  // scroll normal de la lista al dedo.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  )

  function onDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = pendientes.findIndex((i) => i.id === active.id)
    const newIndex = pendientes.findIndex((i) => i.id === over.id)
    onReordenar(arrayMove(pendientes, oldIndex, newIndex))
  }

  return (
    <div className="pantalla">
      <h2>Orden del recorrido</h2>
      <p className="item-subtitulo" style={{ marginBottom: 8 }}>
        Mantené presionado el ≡ y arrastrá para reordenar.
      </p>
      <div className="lista">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={pendientes.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {pendientes.map((item) => (
              <ItemArrastrable key={item.id} item={item} onQuitar={onQuitar} />
            ))}
          </SortableContext>
        </DndContext>
        {resueltos.map((item) => (
          <ItemResuelto key={item.id} item={item} onEditar={onEditar} />
        ))}
      </div>
      <Boton titulo={tituloBoton} onClick={onConfirmar} />
    </div>
  )
}
