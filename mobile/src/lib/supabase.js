import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

// La app del chofer no tiene login: usa la clave pública directo. La
// identidad (Tito/Meme) es una elección en pantalla, no una cuenta.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
})
