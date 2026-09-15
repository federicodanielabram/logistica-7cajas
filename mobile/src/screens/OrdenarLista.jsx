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

function ItemResuelto({ item }) {
  return (
    <div className={`item ${CLASE_ESTADO[item.estado]}`}>
      <div>
        <div className="item-nombre">{item.cliente}</div>
        {item.es_transporte && <div className="item-subtitulo">TRANS. {item.empresa_transporte}</div>}
      </div>
    </div>
  )
}

/**
 * Lista reordenable de paradas (mantener presionado el ≡ y arrastrar). Se usa
 * antes de arrancar el recorrido (todo en_espera) y en pleno reparto
 * ("Reordenar lista"): ahí los ítems ya resueltos (verde/rojo) quedan fijos
 * al fondo, fuera del arrastre.
 */
export default function OrdenarLista({ items, onReordenar, onQuitar, onConfirmar, tituloBoton }) {
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
          <ItemResuelto key={item.id} item={item} />
        ))}
      </div>
      <Boton titulo={tituloBoton} onClick={onConfirmar} />
    </div>
  )
}
