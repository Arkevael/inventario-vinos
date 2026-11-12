import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { fechaHora, descargarCSV, hoy, mensajeError } from '../util'

const haceDias = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

export default function Historial({ vinedos }) {
  const [desde, setDesde] = useState(haceDias(30))
  const [hasta, setHasta] = useState(hoy())
  const [vin, setVin] = useState('')
  const [tipo, setTipo] = useState('')
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    let q = supabase.from('movimientos').select('*')
      .gte('creado', new Date(desde + 'T00:00:00').toISOString())
      .lte('creado', new Date(hasta + 'T23:59:59').toISOString())
      .order('creado', { ascending: false }).limit(1000)
    if (vin) q = q.eq('vinedo_nombre', vin)
    if (tipo === 'entrada') q = q.gt('delta', 0)
    if (tipo === 'salida') q = q.lt('delta', 0)
    const { data, error } = await q
    if (error) { setError(mensajeError(error)); return }
    setError(''); setFilas(data)
  }, [desde, hasta, vin, tipo])

  useEffect(() => { cargar() }, [cargar])
  useEffect(() => {
    const canal = supabase.channel('historial')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'movimientos' }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [cargar])

  const entradas = (filas || []).filter(m => m.delta > 0).reduce((s, m) => s + m.delta, 0)
  const salidas = (filas || []).filter(m => m.delta < 0).reduce((s, m) => s - m.delta, 0)

  const exportar = () => descargarCSV(`movimientos-${desde}-a-${hasta}.csv`, [
    ['Fecha', 'Viñedo', 'Producto', 'Movimiento', 'Quedó en', 'Usuario'],
    ...(filas || []).map(m => [fechaHora(m.creado), m.vinedo_nombre, m.producto_nombre, m.delta, m.cantidad_final, m.usuario_nombre]),
  ])

  return (
    <>
      <div className="bar">
        <input id="h-desde" type="date" value={desde} onChange={e => setDesde(e.target.value)} aria-label="Desde" />
        <input id="h-hasta" type="date" value={hasta} onChange={e => setHasta(e.target.value)} aria-label="Hasta" />
        <select id="h-vinedo" value={vin} onChange={e => setVin(e.target.value)} aria-label="Viñedo">
          <option value="">Todos los viñedos</option>
          {vinedos.map(v => <option key={v.id} value={v.nombre}>{v.nombre}</option>)}
        </select>
        <select id="h-tipo" value={tipo} onChange={e => setTipo(e.target.value)} aria-label="Tipo">
          <option value="">Entradas y salidas</option>
          <option value="entrada">Solo entradas</option>
          <option value="salida">Solo salidas</option>
        </select>
      </div>

      <div className="chips">
        <div className="chip"><b className="pos">+{entradas.toLocaleString('es-PE')}</b><span>Entraron</span></div>
        <div className="chip"><b className="neg">−{salidas.toLocaleString('es-PE')}</b><span>Salieron</span></div>
        <button className="chip" onClick={exportar} disabled={!filas?.length}><b>⤓</b><span>Exportar a Excel</span></button>
      </div>

      {error && <p className="note err">{error}</p>}
      {filas === null ? <p className="note">Cargando historial…</p> : !filas.length ? (
        <div className="empty"><strong>Sin movimientos</strong>No hay entradas ni salidas en estas fechas.</div>
      ) : (
        <div className="list scroll">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Producto</th><th style={{ textAlign: 'right' }}>Mov.</th><th style={{ textAlign: 'right' }}>Quedó</th><th>Usuario</th></tr></thead>
            <tbody>
              {filas.map(m => (
                <tr key={m.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fechaHora(m.creado)}</td>
                  <td>{m.producto_nombre}<div className="note">{m.vinedo_nombre}</div></td>
                  <td className={'num ' + (m.delta > 0 ? 'pos' : 'neg')}>{m.delta > 0 ? '+' : ''}{m.delta}</td>
                  <td className="num">{m.cantidad_final}</td>
                  <td>{m.usuario_nombre}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
