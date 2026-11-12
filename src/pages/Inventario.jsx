import { useMemo, useRef, useState } from 'react'
import { supabase } from '../supabase'
import { soles, entero, estado, ETIQUETA, descargarCSV, hoy, mensajeError } from '../util'

export default function Inventario({ esAdmin, vinedos, productos, setProductos, recargar, cargado }) {
  const [vin, setVin] = useState(() => { try { return localStorage.getItem('inv-vinedo') || 'todos' } catch { return 'todos' } })
  const [filtro, setFiltro] = useState('all')
  const [q, setQ] = useState('')
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [msg, setMsg] = useState(null)
  const timers = useRef({})
  const pendientes = useRef({})

  const nombreVin = useMemo(() => Object.fromEntries(vinedos.map(v => [v.id, v.nombre])), [vinedos])
  const vinActual = vin === 'todos' || vinedos.some(v => String(v.id) === vin) ? vin : 'todos'
  const alcance = productos.filter(p => vinActual === 'todos' || String(p.vinedo_id) === vinActual)
  const filas = alcance.filter(p => (filtro === 'all' || estado(p) === filtro) && (!q || p.nombre.toLowerCase().includes(q.toLowerCase())))

  const elegirVin = v => { setVin(v); try { localStorage.setItem('inv-vinedo', v) } catch {} }
  const aviso = (t, err) => setMsg({ t, err })

  // Toques rápidos en +/− se juntan en un solo guardado
  const cambiar = (id, delta) => {
    setProductos(ps => ps.map(p => p.id === id ? { ...p, cantidad: Math.max(0, p.cantidad + delta) } : p))
    pendientes.current[id] = (pendientes.current[id] || 0) + delta
    clearTimeout(timers.current[id])
    timers.current[id] = setTimeout(async () => {
      const d = pendientes.current[id]; delete pendientes.current[id]
      if (!d) return
      const { data, error } = await supabase.rpc('ajustar_stock', { p_producto: id, p_delta: d })
      if (error) { aviso(mensajeError(error), true); recargar(); return }
      setProductos(ps => ps.map(p => p.id === id ? { ...p, cantidad: data } : p))
    }, 600)
  }

  const fijar = async (id, valor) => {
    const n = entero(valor)
    setProductos(ps => ps.map(p => p.id === id ? { ...p, cantidad: n } : p))
    const { data, error } = await supabase.rpc('fijar_stock', { p_producto: id, p_cantidad: n })
    if (error) { aviso(mensajeError(error), true); recargar(); return }
    setProductos(ps => ps.map(p => p.id === id ? { ...p, cantidad: data } : p))
  }

  const exportar = () => {
    const filasCSV = [['Viñedo', 'Producto', 'Cantidad', 'Avisar con', 'Precio unit. (S/)', 'Valor (S/)', 'Estado']]
    ;[...alcance].sort(orden(nombreVin)).forEach(p => filasCSV.push([
      nombreVin[p.vinedo_id], p.nombre, p.cantidad, p.minimo, p.precio.toFixed(2), (p.cantidad * p.precio).toFixed(2), ETIQUETA[estado(p)],
    ]))
    descargarCSV(`inventario-${hoy()}.csv`, filasCSV)
  }

  const grupos = {}
  filas.forEach(p => { (grupos[p.vinedo_id] ||= []).push(p) })
  const idsGrupo = Object.keys(grupos).sort((a, b) => (nombreVin[a] || '').localeCompare(nombreVin[b] || '', 'es'))

  return (
    <>
      <div className="tabs" role="toolbar" aria-label="Viñedos">
        <button className="tab" aria-pressed={vinActual === 'todos'} onClick={() => elegirVin('todos')}>Todos<small>{productos.length}</small></button>
        {vinedos.map(v => (
          <button key={v.id} className="tab" aria-pressed={vinActual === String(v.id)} onClick={() => elegirVin(String(v.id))}>
            {v.nombre}<small>{productos.filter(p => p.vinedo_id === v.id).length}</small>
          </button>
        ))}
      </div>

      <div className="chips">
        {[['all', 'Productos', alcance.length, ''], ['low', 'Stock bajo', alcance.filter(p => estado(p) === 'low').length, 'low'], ['out', 'Agotados', alcance.filter(p => estado(p) === 'out').length, 'out']].map(([k, t, n, c]) => (
          <button key={k} className={'chip ' + c} aria-pressed={filtro === k} onClick={() => setFiltro(filtro === k && k !== 'all' ? 'all' : k)}>
            <b>{n}</b><span>{t}</span>
          </button>
        ))}
      </div>

      <div className="bar">
        <input id="buscar" type="search" placeholder="Buscar producto…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn ghost" onClick={exportar}>Exportar a Excel</button>
        {esAdmin && <button className="btn" onClick={() => setAgregando(a => !a)}>+ Agregar producto</button>}
      </div>

      {agregando && esAdmin && (
        <FormProducto vinedos={vinedos} inicial={{ vinedo_id: vinActual !== 'todos' ? Number(vinActual) : vinedos[0]?.id }}
          nuevo onCancelar={() => setAgregando(false)}
          onGuardar={async datos => {
            const { cantidad, ...resto } = datos
            const { data, error } = await supabase.from('productos').insert({ ...resto, cantidad: 0 }).select().single()
            if (error) return aviso(mensajeError(error), true)
            if (cantidad > 0) await supabase.rpc('ajustar_stock', { p_producto: data.id, p_delta: cantidad })
            aviso(`Agregado: ${datos.nombre}`); recargar()
          }} />
      )}

      {msg && <p className={'note ' + (msg.err ? 'err' : 'okmsg')}>{msg.t}</p>}

      {!cargado ? <p className="note">Cargando inventario…</p> : !filas.length ? (
        <div className="empty">
          {productos.length
            ? <><strong>Nada coincide</strong>Prueba otra búsqueda o toca “Productos” para ver todo.</>
            : <><strong>Aún no hay productos</strong>{esAdmin ? 'Crea un viñedo en Administrar y luego agrega productos.' : 'El administrador todavía no registró productos.'}</>}
        </div>
      ) : (
        <div className="groups">
          {idsGrupo.map(id => {
            const lista = grupos[id].sort(orden(nombreVin))
            const cajas = lista.reduce((s, p) => s + p.cantidad, 0)
            const valor = lista.reduce((s, p) => s + p.cantidad * p.precio, 0)
            return (
              <section className="group" key={id}>
                <h2>{nombreVin[id]}<span>{cajas.toLocaleString('es-PE')} cajas{valor ? ' · ' + soles(valor) : ''}</span></h2>
                <div className="list">
                  {lista.map(p => (
                    <Fila key={p.id} p={p} esAdmin={esAdmin} abierto={editando === p.id}
                      onToggle={() => setEditando(editando === p.id ? null : p.id)}
                      onCambiar={d => cambiar(p.id, d)} onFijar={v => fijar(p.id, v)}>
                      <FormProducto vinedos={vinedos} inicial={p} onCancelar={() => setEditando(null)}
                        onGuardar={async datos => {
                          const { cantidad, ...resto } = datos
                          const { error } = await supabase.from('productos').update({ ...resto, actualizado: new Date().toISOString() }).eq('id', p.id)
                          if (error) return aviso(mensajeError(error), true)
                          setEditando(null); aviso('Cambios guardados'); recargar()
                        }}
                        onEliminar={async () => {
                          const { error } = await supabase.from('productos').delete().eq('id', p.id)
                          if (error) return aviso(mensajeError(error), true)
                          setEditando(null); aviso(`Eliminado: ${p.nombre}`); recargar()
                        }} />
                    </Fila>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </>
  )
}

const orden = nombreVin => (a, b) =>
  (nombreVin[a.vinedo_id] || '').localeCompare(nombreVin[b.vinedo_id] || '', 'es') ||
  (a.orden ?? 1e9) - (b.orden ?? 1e9) || a.nombre.localeCompare(b.nombre, 'es')

function Fila({ p, esAdmin, abierto, onToggle, onCambiar, onFijar, children }) {
  const s = estado(p)
  const [texto, setTexto] = useState(null)
  return (
    <div className="row">
      <div className="name">
        <strong className={esAdmin ? 'editable' : ''} onClick={esAdmin ? onToggle : undefined} title={esAdmin ? 'Editar' : undefined}>{p.nombre}</strong>
        <div className="meta">
          <span className={'pill ' + s}>{ETIQUETA[s]}</span>
          <span>{p.precio ? soles(p.precio) + ' c/u · ' : ''}avisar con {p.minimo}</span>
        </div>
      </div>
      <div className="qty">
        <button aria-label={`Restar uno a ${p.nombre}`} onClick={() => onCambiar(-1)} disabled={p.cantidad <= 0}>−</button>
        <input id={`cant-${p.id}`} type="number" min="0" inputMode="numeric" aria-label={`Cantidad de ${p.nombre}`}
          value={texto ?? p.cantidad}
          onFocus={e => { setTexto(String(p.cantidad)); e.target.select() }}
          onChange={e => setTexto(e.target.value)}
          onBlur={() => { if (texto !== null && texto !== '' && entero(texto) !== p.cantidad) onFijar(texto); setTexto(null) }}
          onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }} />
        <button className="plus" aria-label={`Sumar uno a ${p.nombre}`} onClick={() => onCambiar(1)}>+</button>
      </div>
      {abierto && esAdmin && children}
    </div>
  )
}

function FormProducto({ vinedos, inicial, nuevo, onGuardar, onCancelar, onEliminar }) {
  const [f, setF] = useState({
    nombre: inicial.nombre || '', vinedo_id: inicial.vinedo_id || '', cantidad: 0,
    minimo: inicial.minimo ?? 10, precio: inicial.precio || '',
  })
  const [seguro, setSeguro] = useState(false)
  const set = k => e => setF({ ...f, [k]: e.target.value })
  const sufijo = nuevo ? 'n' : inicial.id

  const enviar = e => {
    e.preventDefault()
    if (!f.nombre.trim() || !f.vinedo_id) return
    onGuardar({
      nombre: f.nombre.trim(), vinedo_id: Number(f.vinedo_id), cantidad: entero(f.cantidad),
      minimo: entero(f.minimo), precio: Math.max(0, Math.round(Number(f.precio || 0) * 100) / 100),
    })
  }

  if (!vinedos.length) return <p className="note err">Primero crea un viñedo en la pestaña Administrar.</p>

  return (
    <form className="form" onSubmit={enviar}>
      <label className="wide">Nombre<input id={`f-nombre-${sufijo}`} required value={f.nombre} onChange={set('nombre')} placeholder="Ej. Caja Borgoña x 12 bot" /></label>
      <label>Viñedo
        <select id={`f-vinedo-${sufijo}`} required value={f.vinedo_id} onChange={set('vinedo_id')}>
          <option value="">Elegir…</option>
          {vinedos.map(v => <option key={v.id} value={v.id}>{v.nombre}</option>)}
        </select>
      </label>
      {nuevo && <label>Cantidad<input id="f-cant-n" type="number" min="0" inputMode="numeric" value={f.cantidad} onChange={set('cantidad')} /></label>}
      <label>Avisar con<input id={`f-min-${sufijo}`} type="number" min="0" inputMode="numeric" value={f.minimo} onChange={set('minimo')} /></label>
      <label>Precio S/<input id={`f-precio-${sufijo}`} type="number" min="0" step="0.01" inputMode="decimal" value={f.precio} onChange={set('precio')} /></label>
      <div className={'actions' + (onEliminar ? ' split' : '')}>
        {onEliminar && (
          <button type="button" className={'btn ' + (seguro ? 'danger' : 'ghost')} onClick={() => (seguro ? onEliminar() : setSeguro(true))}>
            {seguro ? 'Sí, eliminar' : 'Eliminar'}
          </button>
        )}
        <div>
          <button type="button" className="btn ghost" onClick={onCancelar}>Cancelar</button>
          <button className="btn">{nuevo ? 'Guardar' : 'Guardar cambios'}</button>
        </div>
      </div>
    </form>
  )
}
