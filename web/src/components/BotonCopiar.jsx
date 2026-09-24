function IconoCopiar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="8" width="14" height="14" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  )
}

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

/** Botón redondo que copia `texto` al portapapeles. Una vez copiado queda en verde para siempre. */
export default function BotonCopiar({ texto, copiado, onCopiado }) {
  async function copiar(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Algunos navegadores viejos no tienen Clipboard API — no rompe nada, solo no copia.
    }
    onCopiado()
  }

  return (
    <button
      type="button"
      className={`boton-copiar${copiado ? ' copiado' : ''}`}
      onClick={copiar}
      title={copiado ? 'Copiado' : 'Copiar datos de la entrega'}
      aria-label={copiado ? 'Copiado' : 'Copiar datos de la entrega'}
    >
      {copiado ? <IconoCheck /> : <IconoCopiar />}
    </button>
  )
}
