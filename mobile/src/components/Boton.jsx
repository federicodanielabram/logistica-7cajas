export default function Boton({ titulo, onClick, variante, chico, disabled }) {
  const clases = ['btn']
  if (variante === 'secundario') clases.push('btn-secundario')
  if (variante === 'emergencia') clases.push('btn-emergencia')
  if (chico) clases.push('btn-chico')
  return (
    <button className={clases.join(' ')} onClick={onClick} disabled={disabled}>
      {titulo}
    </button>
  )
}
