export const soles = n =>
  'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const entero = v => {
  const n = Math.max(0, Math.floor(Number(v)))
  return Number.isFinite(n) ? n : 0
}

export const estado = p => (p.cantidad <= 0 ? 'out' : p.cantidad <= p.minimo ? 'low' : 'ok')
export const ETIQUETA = { ok: 'Normal', low: 'Stock bajo', out: 'Agotado' }

export const fechaHora = iso =>
  new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

// Descarga un CSV que Excel abre directo (con BOM para tildes y ñ)
export function descargarCSV(nombreArchivo, filas) {
  const celda = v => {
    const s = String(v ?? '')
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
  }
  const texto = '﻿' + filas.map(f => f.map(celda).join(',')).join('\r\n')
  const blob = new Blob([texto], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 1000)
}

export const hoy = () => new Date().toISOString().slice(0, 10)

export function mensajeError(e) {
  const m = (e && (e.message || e.error_description)) || ''
  if (/Invalid login/i.test(m)) return 'Correo o contraseña incorrectos.'
  if (/duplicate key/i.test(m)) return 'Ya existe un registro con ese nombre.'
  if (/foreign key|violates.*vinedo/i.test(m)) return 'No se puede borrar: todavía tiene productos.'
  if (/permiso|row-level security/i.test(m)) return 'Tu usuario no tiene permiso para hacer esto.'
  if (/Failed to fetch|NetworkError/i.test(m)) return 'Sin conexión. Revisa tu internet e inténtalo otra vez.'
  return m || 'Algo salió mal. Inténtalo otra vez.'
}
