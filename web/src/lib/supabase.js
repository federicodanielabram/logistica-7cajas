import { createClient } from '@supabase/supabase-js'

// Si falta el .env todavía (proyecto de Supabase sin crear), usamos una URL
// con forma válida para que la app no explote al arrancar — los pedidos van
// a fallar igual, pero al menos se puede ver la interfaz mientras se conecta
// el proyecto real.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

export const supabase = createClient(url, anonKey)
