import Boton from '../components/Boton'

export default function CerrarDia({ items, onCerrar }) {
  return (
    <div className="pantalla">
      <h2>Cerrar el día</h2>
      <ul className="checklist-cierre">
        {items.map((item) => (
          <li
            key={item.id}
            className={item.estado === 'entregado' ? 'item-verde' : 'item-rojo'}
          >
            {item.estado === 'entregado' ? '✓' : '✕'} {item.cliente}
          </li>
        ))}
      </ul>
      <Boton titulo="Cerrar el día" onClick={onCerrar} />
    </div>
  )
}
