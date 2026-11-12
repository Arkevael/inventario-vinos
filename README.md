# Inventario de Vinos

App web instalable en el celular para controlar el stock por viñedo.
Hecha con **React (Vite)** y **Supabase**, y se publica gratis en **Vercel**.

## Qué hace

- **Inventario por viñedo.** Hay pestañas por viñedo, y cada uno muestra su total de cajas y su valor en soles.
- **Stock.** Se suma o resta con un toque (**+** / **−**), o se escribe la cantidad exacta.
- **Alertas.** Avisa cuando un producto tiene stock bajo o está agotado.
- **Historial.** Guarda cada entrada y salida con fecha, cantidad y usuario, y se puede filtrar por fechas y por viñedo.
- **Exportar a Excel.** Descarga el inventario o el historial en CSV.
- **Dos roles:**
  - **Administrador.** Crea, edita y borra productos y viñedos, y activa o desactiva usuarios.
  - **Vendedor.** Solo suma y resta stock y ve el historial.
- **Tiempo real.** Si un vendedor saca una caja, el administrador lo ve al instante en su celular.
- **Datos iniciales.** Ya vienen cargados Viñedo Paraíso (30 productos) y Viña San Pedro (12 productos, de la cotización N° 45997).

---

## Despliegue (unos 20 minutos, todo gratis)

### 1. Crear la base de datos en Supabase

1. Entra a <https://supabase.com>, crea una cuenta y luego **New project**. Usa la región **South America (São Paulo)**, que es la más cercana a Perú.
2. Ve a **SQL Editor**, toca **New query**, pega todo el contenido de `supabase/01_esquema.sql` y toca **Run**.
3. Abre otra **New query**, pega `supabase/02_datos_iniciales.sql` y toca **Run**.
4. En **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Así nadie puede crearse una cuenta por su cuenta y solo entran los usuarios que tú crees.

### 2. Crear el usuario administrador

En **Authentication → Users → Add user → Create new user**:

- Escribe el correo y la contraseña del dueño del negocio.
- Marca **Auto Confirm User**.

> El **primer** usuario que se crea queda como **Administrador**. Todos los siguientes quedan como **Vendedor**.

Para agregar vendedores, repite este paso con su correo y contraseña. Si quieres, el administrador puede subirlos a Administrador desde la app, en la pestaña **Administrar**.

### 3. Copiar las claves

En **Project Settings → API** copia:
- **Project URL**
- **anon public key**: es una clave pública y se puede poner en la app sin problema.

### 4. Probar en tu computadora (opcional)

```bash
cp .env.example .env     # y pega la URL y la clave
npm install
npm run dev
```

### 5. Publicar en Vercel

1. Sube esta carpeta a un repositorio de GitHub.
2. En <https://vercel.com>, toca **Add New → Project** e importa el repositorio. Vercel detecta Vite solo.
3. En **Environment Variables** agrega:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | la Project URL |
| `VITE_SUPABASE_ANON_KEY` | la anon public key |
| `VITE_NOMBRE_NEGOCIO` | el nombre del negocio, ej. `Distribuidora de Vinos Cusco` |

4. Toca **Deploy**. Vercel te da un link como `https://inventario-vinos.vercel.app`.
5. En Supabase, ve a **Authentication → URL Configuration** y pon ese link en **Site URL**. Sin esto, el correo de “Olvidé mi contraseña” no lleva al lugar correcto.

### 6. Instalar en el celular del cliente

Abre el link en el celular:
- **Android (Chrome):** toca el menú ⋮ y luego **Agregar a pantalla principal** (o **Instalar app**).
- **iPhone (Safari):** toca el botón Compartir y luego **Agregar a inicio**.

Queda con su ícono y abre a pantalla completa, como una app normal.

---

## Personalizar para cada cliente

- **Nombre:** se cambia con la variable `VITE_NOMBRE_NEGOCIO` en Vercel.
- **Ícono:** reemplaza `public/icon-192.png` y `public/icon-512.png` (cuadrados de 192 y 512 px).
- **Color principal:** cambia `--accent` en `src/styles.css` y `theme_color` en `public/manifest.webmanifest`.
- **Otro cliente:** crea un proyecto nuevo en Supabase y otro proyecto en Vercel. Cada cliente queda con sus datos separados.

## Estructura

```
supabase/01_esquema.sql         tablas, permisos por rol (RLS) y funciones de stock
supabase/02_datos_iniciales.sql viñedos y productos iniciales
src/App.jsx                     sesión, menú y carga de datos en tiempo real
src/pages/Inventario.jsx        lista por viñedo, + / −, alta y edición de productos
src/pages/Historial.jsx         entradas y salidas con filtros y exportación
src/pages/Admin.jsx             viñedos y usuarios
public/sw.js, manifest          lo que permite instalarla como app
```

## Seguridad

- Los permisos se aplican en la base de datos (Row Level Security), no solo en la pantalla. Un vendedor no puede modificar productos aunque intente saltarse la app.
- Los cambios de stock pasan por la función `ajustar_stock`, que registra quién hizo cada movimiento y nunca deja el stock en negativo.
- Si alguien deja de trabajar con el cliente, el administrador lo **desactiva** desde la app y pierde el acceso de inmediato.

## Límites del plan gratis

- **Supabase:** 500 MB de base de datos, que sobra para un inventario. Los proyectos sin uso por 7 días se pausan, y se reactivan desde el panel.
- **Vercel:** gratis para este uso.
