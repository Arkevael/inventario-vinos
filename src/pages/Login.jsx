import { useState } from 'react'
import { supabase, NOMBRE_NEGOCIO } from '../supabase'
import { mensajeError } from '../util'

export default function Login() {
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [msg, setMsg] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const entrar = async e => {
    e.preventDefault()
    setOcupado(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave })
    if (error) setMsg({ err: true, t: mensajeError(error) })
    setOcupado(false)
  }

  const olvide = async () => {
    if (!email.trim()) { setMsg({ err: true, t: 'Escribe tu correo arriba y vuelve a tocar el enlace.' }); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    setMsg(error ? { err: true, t: mensajeError(error) } : { t: 'Te enviamos un correo para crear una nueva contraseña.' })
  }

  return (
    <div className="login">
      <form className="card" onSubmit={entrar}>
        <div>
          <h1>{NOMBRE_NEGOCIO}</h1>
          <p className="sub">Ingresa con el usuario que te dio el administrador.</p>
        </div>
        <div className="stack">
          <label>Correo<input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
          <label>Contraseña<input id="clave" type="password" autoComplete="current-password" required value={clave} onChange={e => setClave(e.target.value)} /></label>
        </div>
        <button className="btn" disabled={ocupado}>{ocupado ? 'Entrando…' : 'Entrar'}</button>
        <button type="button" className="link" onClick={olvide}>Olvidé mi contraseña</button>
        {msg && <p className={'note ' + (msg.err ? 'err' : 'okmsg')}>{msg.t}</p>}
      </form>
    </div>
  )
}

export function NuevaClave({ onListo }) {
  const [clave, setClave] = useState('')
  const [msg, setMsg] = useState(null)

  const guardar = async e => {
    e.preventDefault()
    if (clave.length < 6) { setMsg({ err: true, t: 'La contraseña debe tener al menos 6 caracteres.' }); return }
    const { error } = await supabase.auth.updateUser({ password: clave })
    if (error) setMsg({ err: true, t: mensajeError(error) })
    else onListo()
  }

  return (
    <div className="login">
      <form className="card" onSubmit={guardar}>
        <h2>Nueva contraseña</h2>
        <label className="stack">Contraseña nueva<input id="nueva-clave" type="password" autoComplete="new-password" value={clave} onChange={e => setClave(e.target.value)} /></label>
        <button className="btn">Guardar contraseña</button>
        {msg && <p className="note err">{msg.t}</p>}
      </form>
    </div>
  )
}
