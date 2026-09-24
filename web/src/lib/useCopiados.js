import { useCallback, useEffect, useState } from 'react'

function leer(clave) {
  try {
    const guardado = localStorage.getItem(clave)
    return guardado ? new Set(JSON.parse(guardado)) : new Set()
  } catch {
    return new Set()
  }
}

/** Guarda en localStorage qué items ya se copiaron, para que el check quede fijo entre recargas. */
export function useCopiados(clave) {
  const [copiados, setCopiados] = useState(() => leer(clave))

  useEffect(() => {
    setCopiados(leer(clave))
  }, [clave])

  const marcarCopiado = useCallback(
    (id) => {
      setCopiados((prev) => {
        if (prev.has(id)) return prev
        const siguiente = new Set(prev).add(id)
        try {
          localStorage.setItem(clave, JSON.stringify([...siguiente]))
        } catch {
          // localStorage no disponible (modo privado, etc.) — no rompe nada, solo no persiste.
        }
        return siguiente
      })
    },
    [clave]
  )

  return [copiados, marcarCopiado]
}
