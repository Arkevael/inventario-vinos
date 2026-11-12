import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { soles, mensajeError } from '../util'

export default function Admin({ perfil, vinedos, productos, recargar }) {
  return (
    <>
      <Vinedos vinedos={vinedos} productos={productos} recargar={recargar} />
      <Usuarios perfil={perfil} />
    </>
  )
}

function Vinedos({ vinedos, productos, recargar }) {
  const [nuevo, setNuevo] = useState('')
  const [editando, setEditando] = useState(null)
  const [texto, setTexto] = useState('')
  const [borrar, setBorrar] = useState(null)
  const [msg, setMsg] = useState(null)

  const crear = async e => {
    e.preventDefault()
    if (!nuevo.trim()) return
    const { error } = await supabase.from('vinedos').insert({ nombre: nuevo.trim() })
    if (error) return setMsg({ err: true, t: mensajeError(error) })
    setMsg({ t: `Viñedo creado: ${nuevo.trim()}` }); setNuevo(''); recargar()
  }
  const renombrar = async id => {
    if (!texto.trim()) return
    const { error } = await supabase.from('vinedos').update({ nombre: texto.trim() }).eq('id', id)
    if (error) return setMsg({ err: true, t: mensajeError(error) })
    setEditando(null); setMsg({ t: 'Nombre actualizado' }); recargar()
  }
  const eliminar = async v => {
    if (borrar !== v.id) return setBorrar(v.id)
    const { error } = await supabase.from('vinedos').delete().eq('id', v.id)
    setBorrar(null)
    if (error) return setMsg({ err: true, t: mensajeError(error) })
    setMsg({ t: `Eliminado: ${v.nombre}` }); recargar()
  }

  return (
    <section className="card">
      <h2>Viñedos</h2>
      <form className="bar" onSubmit={crear}>
        <input id="nuevo-vinedo" placeholder="Nombre del nuevo viñedo" value={nuevo} onChange={e => setNuevo(e.target.value)} />
        <button className="btn">Crear viñedo</button>
      </form>
      {msg && <p className={'note ' + (msg.err ? 'err' : 'okmsg')}>{msg.t}</p>}
      <div className="scroll">
        <table className="table">
          <thead><tr><th>Viñedo</th><th style={{ textAlign: 'right' }}>Productos</th><th style={{ textAlign: 'right' }}>Cajas</th><th style={{ textAlign: 'right' }}>Valor</th><th></th></tr></thead>
          <tbody>
            {vinedos.map(v => {
              const ps = productos.filter(p => p.vinedo_id === v.id)
              return (
                <tr key={v.id}>
                  <td>{editando === v.id
                    ? <input id={`ren-${v.id}`} value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && renombrar(v.id)} />
                    : v.nombre}</td>
                  <td className="num">{ps.length}</td>
                  <td className="num">{ps.reduce((s, p) => s + p.cantidad, 0).toLocaleString('es-PE')}</td>
                  <td className="num">{soles(ps.reduce((s, p) => s + p.cantidad * p.precio, 0))}</td>
                  <td className="num">
                    {editando === v.id ? (
                      <><button className="btn small" onClick={() => renombrar(v.id)}>Guardar</button>{' '}
                        <button className="btn ghost small" onClick={() => setEditando(null)}>Cancelar</button></>
                    ) : (
                      <><button className="btn ghost small" onClick={() => { setEditando(v.id); setTexto(v.nombre) }}>Renombrar</button>{' '}
                        <button className={'btn small ' + (borrar === v.id ? 'danger' : 'ghost')} disabled={ps.length > 0}
                          title={ps.length ? 'Primero elimina o mueve sus productos' : undefined} onClick={() => eliminar(v)}>
                          {borrar === v.id ? 'Sí, eliminar' : 'Eliminar'}
                        </button></>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Usuarios({ perfil }) {
  const [lista, setLista] = useState(null)
  const [msg, setMsg] = useState(null)

  const cargar = async () => {
    const { data, error } = await supabase.from('perfiles').select('*').order('creado')
    if (error) return setMsg({ err: true, t: mensajeError(error) })
    setLista(data)
  }
  useEffect(() => { cargar() }, [])

  const cambiar = async (u, campos) => {
    const { error } = await supabase.from('perfiles').update(campos).eq('id', u.id)
    if (error) return setMsg({ err: true, t: mensajeError(error) })
    setMsg({ t: 'Usuario actualizado' }); cargar()
  }

  return (
    <section className="card">
      <h2>Usuarios</h2>
      <p className="note">
        Para dar acceso a alguien, créale un usuario en Supabase (Authentication → Users → Add user, marcando
        “Auto Confirm User”). Aparecerá aquí como <b>Vendedor</b>: puede sumar y restar stock y ver el historial,
        pero no puede crear, editar ni borrar productos.
      </p>
      {msg && <p className={'note ' + (msg.err ? 'err' : 'okmsg')}>{msg.t}</p>}
      {!lista ? <p className="note">Cargando usuarios…</p> : (
        <div className="scroll">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acceso</th></tr></thead>
            <tbody>
              {lista.map(u => {
                const yo = u.id === perfil.id
                return (
                  <tr key={u.id}>
                    <td><input id={`nom-${u.id}`} defaultValue={u.nombre} onBlur={e => e.target.value.trim() !== u.nombre && cambiar(u, { nombre: e.target.value.trim() })} /></td>
                    <td>{u.email}{yo && <div className="note">(tú)</div>}</td>
                    <td>
                      <select id={`rol-${u.id}`} value={u.rol} disabled={yo} onChange={e => cambiar(u, { rol: e.target.value })}>
                        <option value="vendedor">Vendedor</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </td>
                    <td>
                      <button className={'btn small ' + (u.activo ? 'ghost' : '')} disabled={yo} onClick={() => cambiar(u, { activo: !u.activo })}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
