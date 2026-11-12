import { useEffect, useState, useCallback } from 'react'
import { supabase, configurado, NOMBRE_NEGOCIO } from './supabase'
import Login, { NuevaClave } from './pages/Login.jsx'
import Inventario from './pages/Inventario.jsx'
import Historial from './pages/Historial.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  const [sesion, setSesion] = useState(undefined)
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    if (!configurado) return
    document.title = NOMBRE_NEGOCIO
    supabase.auth.getSession().then(({ data }) => setSesion(data.session))
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
      setSesion(s)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  if (!configurado) {
    return (
      <div className="login"><div className="card">
        <h2>Falta configurar</h2>
        <p className="note">Crea el archivo <code>.env</code> con <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code> (ver README.md).</p>
      </div></div>
    )
  }
  if (sesion === undefined) return <div className="login"><p className="note">Cargando…</p></div>
  if (recuperando && sesion) return <NuevaClave onListo={() => setRecuperando(false)} />
  if (!sesion) return <Login />
  return <Principal sesion={sesion} />
}

function Principal({ sesion }) {
  const [perfil, setPerfil] = useState(null)
  const [vista, setVista] = useState('inventario')
  const [vinedos, setVinedos] = useState([])
  const [productos, setProductos] = useState([])
  const [error, setError] = useState('')
  const [cargado, setCargado] = useState(false)

  const cargar = useCallback(async () => {
    const [v, p] = await Promise.all([
      supabase.from('vinedos').select('id,nombre').order('nombre'),
      supabase.from('productos').select('id,vinedo_id,nombre,cantidad,minimo,precio,orden'),
    ])
    if (v.error || p.error) { setError('No se pudo cargar el inventario. Revisa tu conexión.'); return }
    setError('')
    setVinedos(v.data)
    setProductos(p.data.map(x => ({ ...x, precio: Number(x.precio) })))
    setCargado(true)
  }, [])

  useEffect(() => {
    supabase.from('perfiles').select('*').eq('id', sesion.user.id).single()
      .then(({ data }) => setPerfil(data || { activo: false }))
  }, [sesion.user.id])

  useEffect(() => {
    if (!perfil?.activo) return
    cargar()
    // Tiempo real: si otro usuario cambia algo, se actualiza aquí también
    const canal = supabase.channel('cambios-inventario')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, payload => {
        if (payload.eventType === 'UPDATE') {
          setProductos(ps => ps.map(x => x.id === payload.new.id ? { ...payload.new, precio: Number(payload.new.precio) } : x))
        } else cargar()
      })
      .subscribe()
    const alVolver = () => { if (document.visibilityState === 'visible') cargar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { supabase.removeChannel(canal); document.removeEventListener('visibilitychange', alVolver) }
  }, [perfil?.activo, cargar])

  const salir = () => supabase.auth.signOut()

  if (!perfil) return <div className="login"><p className="note">Cargando…</p></div>
  if (!perfil.activo) {
    return (
      <div className="login"><div className="card">
        <h2>Cuenta desactivada</h2>
        <p className="note">Pide al administrador que active tu usuario.</p>
        <button className="btn ghost" onClick={salir}>Salir</button>
      </div></div>
    )
  }

  const esAdmin = perfil.rol === 'admin'
  return (
    <div className="wrap">
      <header className="top">
        <div>
          <h1>{NOMBRE_NEGOCIO}</h1>
          <p className="sub">Toca <b>+</b> cuando entra mercadería y <b>−</b> cuando sale.</p>
        </div>
        <div className="who">
          <span>{perfil.nombre || perfil.email} · {esAdmin ? 'Administrador' : 'Vendedor'}</span>
          <button className="btn ghost small" onClick={salir}>Salir</button>
        </div>
      </header>

      <nav className="nav">
        {[['inventario', 'Inventario'], ['historial', 'Historial'], ...(esAdmin ? [['admin', 'Administrar']] : [])].map(([k, t]) => (
          <button key={k} aria-current={vista === k ? 'page' : undefined} onClick={() => setVista(k)}>{t}</button>
        ))}
      </nav>

      {error && <p className="note err">{error}</p>}
      {vista === 'inventario' && (
        <Inventario esAdmin={esAdmin} vinedos={vinedos} productos={productos}
          setProductos={setProductos} recargar={cargar} cargado={cargado} />
      )}
      {vista === 'historial' && <Historial vinedos={vinedos} />}
      {vista === 'admin' && esAdmin && <Admin perfil={perfil} vinedos={vinedos} productos={productos} recargar={cargar} />}
    </div>
  )
}
