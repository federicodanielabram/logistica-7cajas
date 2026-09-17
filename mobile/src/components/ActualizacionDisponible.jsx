import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * Mientras estamos en plena etapa de pruebas: apenas hay una versión nueva
 * publicada, se aplica sola — sin cartel, sin que nadie tenga que tocar
 * nada. Además fuerza un chequeo de actualización cada vez que la app
 * vuelve a primer plano (no siempre alcanza con que el navegador lo
 * chequee por su cuenta al reabrir).
 */
export default function ActualizacionDisponible() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      registration.update()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update()
      })
    },
  })

  useEffect(() => {
    if (needRefresh) updateServiceWorker(true)
  }, [needRefresh, updateServiceWorker])

  return null
}
