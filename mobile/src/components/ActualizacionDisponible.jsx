import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Cartel chico que avisa cuando hay una versión nueva publicada, en vez de
 * recargar solo (que podría interrumpir al chofer a mitad de una entrega).
 * El chofer decide cuándo tocar "Actualizar".
 */
export default function ActualizacionDisponible() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      style={{
        position: 'fixed',
        left: 12,
        right: 12,
        bottom: 12,
        zIndex: 1000,
        background: '#2b1c0f',
        color: 'white',
        borderRadius: 10,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}
    >
      <span style={{ fontSize: 14 }}>Hay una versión nueva de la app.</span>
      <button
        onClick={() => updateServiceWorker(true)}
        style={{
          background: '#f5a623',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontWeight: 600,
        }}
      >
        Actualizar
      </button>
    </div>
  )
}
