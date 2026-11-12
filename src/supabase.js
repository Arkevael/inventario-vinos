import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && key && !url.includes('TU-PROYECTO'))
export const supabase = configurado ? createClient(url, key) : null
export const NOMBRE_NEGOCIO = import.meta.env.VITE_NOMBRE_NEGOCIO || 'Inventario de Vinos'
