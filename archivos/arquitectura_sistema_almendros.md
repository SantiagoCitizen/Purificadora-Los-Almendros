## 1. Arquitectura general

El sistema "Purificadora Los Almendros" está compuesto por tres partes principales:

1. **Backend (API REST con FastAPI y MySQL)**
   - Ubicación principal: `backend/routers/*.py` y `backend/database.py`.
   - Expone endpoints REST para autenticación, gestión de clientes, repartidores, colonias, finanzas, analítica y ajustes.
   - Se conecta a una base de datos MySQL definida en `database/schema.sql` mediante la función `db_conexion()` de `backend/database.py`.

2. **Aplicación móvil (Ionic/Angular, cliente y repartidor)**
   - Ubicación principal: `almendros-movil/src/app/*`.
   - Usa `HttpClient` de Angular para consumir la API del backend usando la URL definida en `almendros-movil/src/environments/environment` (referenciada como `environment.apiUrl`).
   - Maneja dos perfiles según el rol (`id_rol`) que devuelve el backend: repartidor (rol 2) e cliente (rol 3).

3. **Panel web de gerencia (HTML + JS)**
   - Frontend principal: `web_panel/index.html`, `web_panel/login.html` y páginas en `web_panel/paginas/*.html`.
   - Lógica de frontend en JS: `web_panel/js/*.js` (por ejemplo `login.js`, `principal.js`, `logistica.js`, `finanzas.js`, `analitica.js`, `auth.js`, `config.js`).
   - Consume la API REST usando `fetch` con la URL base configurada en `web_panel/js/config.js` (`environment.apiUrl`).

La **base de datos MySQL** está definida en `database/schema.sql` y contiene tablas principales como `roles`, `usuarios`, `direcciones_clientes`, `colonias`, `repartidores_rutas`, `pedidos` y `configuracion`.

---

## 2. Cómo funciona el backend

### 2.1 Routers principales

Los routers FastAPI se definen en `backend/routers`:

- `backend/routers/auth.py`
  - Ruta `POST /login` – función `login(datos: DatosLogin)`.
  - Ruta `PUT /cambiar-password` – función `cambiar_password(datos: DatosCambioPassword, usuario_actual: dict = Depends(get_usuario_actual))`.
  - Ruta `POST /registro` – función `registrar_cliente(datos: ClienteRegistro)`.
  - Función auxiliar `get_usuario_actual(credentials: HTTPAuthorizationCredentials = Depends(security))` para validar y decodificar el token JWT.

- `backend/routers/clientes.py` (prefijo `/clientes`)
  - `GET /clientes/` – función `get_clientes()`.
  - `GET /clientes/mi-tarifa` – función `obtener_mi_tarifa(usuario_actual: dict = Depends(get_usuario_actual))`.
  - `GET /clientes/mis-pedidos` – función `obtener_mis_pedidos(usuario_actual: dict = Depends(get_usuario_actual))`.
  - `POST /clientes/pedidos` – función `crear_pedido(..., usuario_actual: dict = Depends(get_usuario_actual))`.
  - `GET /clientes/{id_usuario}` – función `get_detalle_clientes(id_usuario: int)`.
  - `PUT /clientes/{id_usuario}/tarifa` – función `actualizar_tarifa_cliente(id_usuario: int, datos: ActualizarTarifa)`.

- `backend/routers/repartidores.py` (prefijo `/repartidores`)
  - `GET /repartidores/` – función `get_repartidores()`.
  - `POST /repartidores/` – función `crear_repartidor(datos: AltaRepartidor)`.
  - `POST /repartidores/{id_usuario}/rutas` – función `guardar_rutas_repartidor(id_usuario: int, datos: AsignarRutas)`.
  - `PUT /repartidores/{id_usuario}/baja` – función `baja_repartidor(id_usuario: int, datos: BajaRepartidor)`.
  - `GET /repartidores/entregas` – función `obtener_entregas_asignadas(usuario_actual: dict = Depends(get_usuario_actual))`.
  - `PUT /repartidores/entregas/{id_pedido}/estatus` – función `cambiar_estatus_entrega(id_pedido: int, datos: ActualizarEstatus, usuario_actual: dict = Depends(get_usuario_actual))`.

- `backend/routers/finanzas.py` (prefijo `/finanzas`)
  - `GET /finanzas/kpis` – función `get_kpis_hoy()`.
  - `GET /finanzas/transferencias-pendientes` – función `get_transferencias()`.
  - `GET /finanzas/conciliacion-hoy` – función `get_conciliacion_repartidores()`.
  - `GET /finanzas/incidencias-hoy` – función `get_incidencias()`.
  - `PUT /finanzas/transferencias/{id_pedido}/aprobar` – función `aprobar_transferencia(id_pedido: int)`.
  - `PUT /finanzas/transferencias/{id_pedido}/rechazar` – función `rechazar_transferencias(id_pedido: int)`.
  - `GET /finanzas/conciliacion/{id_repartidor}` – función `get_detalle_repartidor(id_repartidor: int)`.

- `backend/routers/analitica.py` (prefijo `/analitica`)
  - `GET /analitica/tendencias` – función `get_tendencias(filtro: str = 'mes', fecha: str = None)`.
  - `GET /analitica/insights` – función `get_insights()`.

- `backend/routers/colonias.py` (prefijo `/colonias`)
  - `GET /colonias/` – función `obtener_colonias()`.
  - `POST /colonias/` – función `agregar_colonia(datos: NuevaColonia)`.
  - `PUT /colonias/{id_colonia}` – función `actualizar_colonia(id_colonia: int, datos: UpdateColonia)`.
  - `DELETE /colonias/{id_colonia}` – función `eliminar_colonia(id_colonia: int)`.

- `backend/routers/ajustes.py` (prefijo `/ajustes`)
  - `GET /ajustes/` – función `get_configuracion()`.
  - `PUT /ajustes/negocio` – función `update_negocio(datos: NegocioUpdate)`.
  - `PUT /ajustes/seguridad` – función `update_seguridad(datos: SeguridadUpdate)`.

### 2.2 Conexión a MySQL

La conexión a MySQL está centralizada en `backend/database.py`:

- Función `db_conexion()`:
  - Usa `mysql.connector.connect` para crear una conexión.
  - Lee las variables de entorno `DB_HOST`, `DB_USER`, `DB_PASSWORD` y `DB_NAME` (`os.getenv`).
  - Devuelve la conexión si `conexion.is_connected()` es verdadero, o `None` y un log de error en consola si falla.

Cada endpoint abre una conexión con `db_conexion()`, crea un cursor (normal o `dictionary=True`), ejecuta consultas SQL directas y hace `commit()` cuando actualiza datos. En los `finally` se cierran cursores y conexiones.

### 2.3 Autenticación y manejo de JWT

En `backend/routers/auth.py`:

- Login (`login`):
  - Recibe `telefono` y `password` en un `DatosLogin`.
  - Busca al usuario en la tabla `usuarios` con:
    ```sql
    SELECT id_usuario, nombre, apellido_paterno, telefono, password_hash, id_rol
    FROM usuarios
    WHERE telefono = %s
    ```
  - Compara la contraseña plana con el `password_hash` usando `bcrypt.checkpw`.
  - Si coincide, genera un token JWT con `jwt.encode` que incluye:
    - `id_usuario`
    - `rol` (mapeo directo de `id_rol`)
    - `exp` (expiración a 8 horas: `datetime.utcnow() + timedelta(hours=8)`).
  - La clave se toma de `os.getenv("JWT_SECRET")`.
  - Devuelve `{ "Mensaje": "Login exitoso", "token": token, "usuario": usuario_sin_password }`.

- Validación (`get_usuario_actual`):
  - Usa `HTTPBearer` (`security = HTTPBearer()`) para extraer el token del header `Authorization: Bearer ...`.
  - Decodifica el token con `jwt.decode(token, llave_secreta, algorithms=["HS256"])`.
  - Devuelve un diccionario con `id_usuario` e `id_rol` (mapeando `rol` del payload a `id_rol`).

- Cambio de contraseña (`cambiar_password`):
  - Usa `Depends(get_usuario_actual)`.
  - Obtiene el `password_hash` actual desde `usuarios`.
  - Valida la contraseña actual con `bcrypt.checkpw`.
  - Genera un nuevo hash con `bcrypt.hashpw(..., bcrypt.gensalt()).decode('utf-8')` y actualiza `usuarios.password_hash`.

- Registro de clientes (`registrar_cliente`):
  - Valida que el teléfono no exista (`SELECT id_usuario FROM usuarios WHERE telefono = %s`).
  - Hashea la contraseña con `bcrypt.hashpw` y la guarda en `usuarios.password_hash`.
  - Asigna `id_rol = 3` para clientes.
  - Inserta también la dirección en `direcciones_clientes`.

### 2.4 Roles y autorizaciones

Roles en base de datos (tabla `roles` en `database/schema.sql`):

- `roles.id_rol` es la clave primaria. Los valores específicos por nombre no están en el SQL (no determinado), pero se infieren por uso en código:
  - Rol **1**: Administrador (panel web) – usado en `web_panel/js/login.js` al validar `if (datos.usuario.id_rol !== 1) ...`.
  - Rol **2**: Repartidor – usado en `backend/routers/repartidores.py` (`WHERE u.id_rol = 2`, validaciones `usuario_actual.get("id_rol") != 2`) y en la app móvil (`HomePage.iniciarSesion`, `if (rol === 2) this.router.navigate(['/ruta']);`).
  - Rol **3**: Cliente residencial – asignado explícitamente en `auth.registrar_cliente` (`id_rol_asignado = 3`) y validado en `clientes.obtener_mis_pedidos` (`id_rol in [3,4]`).
  - Rol **4**: Cliente empresarial – inferido por `CASE id_rol WHEN 3 THEN 'Residencial' WHEN 4 THEN 'Empresarial'` en `clientes.get_clientes`.

Autorización por rol en endpoints (ejemplos):

- `clientes.obtener_mis_pedidos`: limita el acceso a clientes (`id_rol` 3 y 4).
- `repartidores.obtener_entregas_asignadas` y `repartidores.cambiar_estatus_entrega`: limitan el acceso a repartidores (`id_rol` == 2).
- La validación de administrador se hace en el frontend del panel (`web_panel/js/login.js`) verificando `datos.usuario.id_rol === 1` después del login.

---

## 3. Funcionamiento del frontend móvil y del panel web

### 3.1 Frontend móvil (Ionic/Angular)

Rutas de la app definidas en `almendros-movil/src/app/app.routes.ts`:

- `path: 'home'` → componente `HomePage` (`home.page.ts`).
- `path: 'ruta'` → componente `RutaPage` (`ruta.page.ts`).
- `path: 'ajustes'` → componente `AjustesPage` (`ajustes.page.ts`).
- `path: 'registro'` → componente `RegistroPage` (`registro.page.ts`).
- `path: 'inicio-cliente'` → componente `InicioClientePage` (`inicio-cliente.page.ts`).
- `path: 'nuevo-pedido'` → componente `NuevoPedidoPage` (`nuevo-pedido.page.ts`).

Componentes y flujos clave:

- `home.page.ts` (login móvil):
  - Función `iniciarSesion()` envía `telefono` y `password` a `POST {environment.apiUrl}/login`.
  - Guarda `res.token` en `localStorage.setItem('token', res.token)`.
  - Lee `res.usuario.id_rol` y redirige:
    - Rol 2 → `this.router.navigate(['/ruta']);`.
    - Rol 3 → `this.router.navigate(['/inicio-cliente']);`.

- `registro.page.ts` (alta de cliente desde la app):
  - Carga colonias con `cargarColonias()` llamando a `GET {environment.apiUrl}/colonias`.
  - En `registrarCliente()`, valida campos y hace `POST {environment.apiUrl}/registro` enviando el objeto `cliente` con nombre, apellidos, teléfono, password, id_colonia y dirección.

- `inicio-cliente.page.ts` (dashboard cliente):
  - Usa `cargarMisPedidos()` para pedir `GET {environment.apiUrl}/clientes/mis-pedidos` con header `Authorization: Bearer {token}`.
  - Separa los pedidos en `pedidosActivos` (estatus `Pendiente` o `En camino`) y `pedidosHistorial` (estatus en `['Entregado','Cancelado','No Entregado']`).
  - Acción `nuevoPedido()` redirige a `/nuevo-pedido`.

- `nuevo-pedido.page.ts` (creación de pedido):
  - `cargarPrecioCliente()` llama `GET /clientes/mi-tarifa` para obtener `tarifa_especial` o `precio_garrafon`.
  - `confirmarPedido()`:
    - Valida que si `metodoPago === 'Transferencia'` exista `archivoComprobante`.
    - Crea un `FormData` con campos `cantidad_garrafones`, `tipo_pago`, `monto_total`, `notas_cliente` y opcionalmente `comprobante`.
    - Envía `POST {environment.apiUrl}/clientes/pedidos` con header `Authorization: Bearer {token}`.

- `ruta.page.ts` (repartidor – ruta del día):
  - `cargarRutaDelDia()` llama `GET {environment.apiUrl}/repartidores/entregas` con token.
  - Gestiona auto-actualización de pedidos cada 10 segundos (`iniciarAutoActualizacion`, `setInterval`).
  - Detecta nuevos pedidos y reproduce una alerta sonora con `reproducirSonidoAlerta()`.
  - `actualizarEstatus(id_pedido, nuevoEstatus)` hace `PUT {environment.apiUrl}/repartidores/entregas/{id_pedido}/estatus` enviando JSON `{ estatus, notas_campo }`.

- `ajustes.page.ts` (repartidor – cambio de contraseña):
  - `actualizarPassword()` valida contraseñas.
  - Envía `PUT {environment.apiUrl}/cambiar-password` con token Bearer y payload `{ password_actual, password_nueva }`.

### 3.2 Panel web (gerencia)

Configuración de API:

- `web_panel/js/config.js` define:
  ```js
  export const environment = {
      apiUrl: 'http://127.0.0.1:8000'
  };
  ```

Autenticación en panel:

- `web_panel/js/login.js`:
  - En el `submit` del formulario (`loginForm`), envía `telefono` y `password` a `POST {environment.apiUrl}/login`.
  - Verifica que `respuesta.ok` y que `datos.usuario.id_rol === 1` (administrador).
  - Si válido, guarda en `sessionStorage`:
    - `usuarioLogueado` (JSON de usuario).
    - `tokenVIP` (JWT).
  - Redirige a `index.html`.

- `web_panel/js/auth.js`:
  - Función `verificarAcceso()` comprueba `sessionStorage.getItem('tokenVIP')`.
  - Si no hay token, redirige a `login.html` o `../login.html` según la ruta actual.
  - Se ejecuta al cargar el script y también en el evento `pageshow` para manejar navegación con atrás/adelante.

Módulos principales del panel:

- `web_panel/js/principal.js` (dashboard principal):
  - `cargarRepartidores()` → `GET {environment.apiUrl}/repartidores` y muestra nombre, estado (`Libre`/`En Ruta`), ruta y teléfono.
  - `cargarClientes()` → `GET {environment.apiUrl}/clientes` y llena tabla de clientes con su tarifa.
  - `window.abrirBtnVerCliente(idUsuario)` → `GET {environment.apiUrl}/clientes/{idUsuario}` para ver detalle completo (nombre, teléfono, dirección, `tarifa_especial`).
  - `window.guardarNuevaTarifa(idUsuario)` → `PUT {environment.apiUrl}/clientes/{idUsuario}/tarifa`.
  - `cargarPrecioBase()` → `GET {environment.apiUrl}/ajustes/` y muestra `precio_garrafon` en el dashboard.

- `web_panel/js/logistica.js` (módulo de logística):
  - Gestión de colonias:
    - `cargarColonias()` → `GET /colonias` y construye la tabla con botones Editar/Eliminar.
    - Registro de colonia nueva vía `POST /colonias`.
    - Actualización vía `PUT /colonias/{id_colonia}`.
    - Eliminación vía `DELETE /colonias/{id_colonia}`.
  - Visualización de repartidores en logística: `cargarRepartidoresLogistica()` → `GET /repartidores`.
  - Alta de repartidores: escucha clic en `btnGuardarRepartidor`, construye `datosRepartidor` y llama `POST /repartidores`.
  - Baja de repartidores con posible traspaso de rutas:
    - Llenado de selects en evento `show.bs.modal` con `GET /repartidores`.
    - `btnConfirmarBaja` dispara `PUT /repartidores/{id_usuario}/baja` con JSON `{ id_reemplazo }`.

- `web_panel/js/finanzas.js` (módulo de finanzas):
  - `cargarKPIs()` → `GET /finanzas/kpis` para cargar KPIs de transferencias pendientes, alertas, ventas totales y garrafones.
  - `cargarTransferencias()` → `GET /finanzas/transferencias-pendientes` y arma tabla con botones:
    - `window.aprobarTransferencia(idPedido)` → `PUT /finanzas/transferencias/{idPedido}/aprobar`.
    - `window.rechazarTransferencia(idPedido)` → `PUT /finanzas/transferencias/{idPedido}/rechazar`.
  - `cargarConciliacion()` → `GET /finanzas/conciliacion-hoy` (resumen de ventas por repartidor).
  - `cargarIncidencias()` → `GET /finanzas/incidencias-hoy` (notas de campo e incidencias).
  - Exportaciones:
    - `window.exportarExcel(idTabla, nombreArchivo)` usando SheetJS.
    - `window.exportarPDF(idTabla, tituloReporte)` usando jsPDF y autoTable.

- `web_panel/js/analitica.js` (módulo de analítica):
  - `cargarGrafica(filtroTiempo)` → `GET /analitica/tendencias?filtro={mes|anio}&fecha={YYYY-MM}` y dibuja gráfica con Chart.js.
  - `cargarInsights()` → `GET /analitica/insights` para mostrar meses de mayor y menor demanda y un texto de predicción.
  - Exportación a Excel y PDF de los datos de la gráfica.

Control de sesión del panel:

- Protección mediante `sessionStorage` (token JWT) en el navegador y redirección a `login.html` si falta.
- La verificación de rol administrador se hace solo al momento de login en `login.js`.

---

## 4. Cómo se cifran los datos en la base de datos

### 4.1 Contraseñas de usuarios

En `backend/routers/auth.py` se maneja el cifrado de contraseñas con **bcrypt**:

- Campo en la base de datos: `usuarios.password_hash` (definido en `database/schema.sql`).

- Registro de clientes (`registrar_cliente`):
  - Convierte la contraseña a bytes: `password_bytes = datos.password.encode('utf-8')`.
  - Genera hash: `password_encriptada = bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')`.
  - Guarda `password_encriptada` en `usuarios.password_hash`.

- Alta de repartidores (`repartidores.crear_repartidor` en `backend/routers/repartidores.py`):
  - Usa el teléfono como base de contraseña inicial.
  - Hashea con bcrypt:
    ```python
    password_bytes = datos.telefono.encode('utf-8')
    salt = bcrypt.gensalt()
    password_hasheada = bcrypt.hashpw(password_bytes, salt).decode('utf-8')
    ```
  - Inserta `password_hasheada` en `usuarios.password_hash`.

- Cambio de contraseña (`auth.cambiar_password`):
  - Verifica la contraseña actual con `bcrypt.checkpw`.
  - Genera un nuevo hash con `bcrypt.hashpw(..., bcrypt.gensalt())` y actualiza `usuarios.password_hash`.

En `backend/routers/ajustes.py`, la función `update_seguridad` actualiza `usuarios.password_hash` directamente con `datos.password_nueva` sin aplicar hash adicional:

```python
if datos.password_nueva:
    sql_query = "UPDATE usuarios SET telefono = %s, password_hash = %s WHERE id_usuario = %s"
    cursor.execute(sql_query, (datos.telefono, datos.password_nueva, datos.id_usuario))
```

Esto implica que, al menos desde este endpoint, la contraseña podría guardarse en texto plano si se usa, lo cual es un comportamiento de seguridad a revisar en el diseño (hecho basado en el código real).

### 4.2 Cifrado de otros datos

- No se observa cifrado específico para otros campos en el esquema `database/schema.sql` (por ejemplo, teléfonos o datos de pedidos se almacenan en texto/numérico plano).
- La URL del comprobante de pago (`pedidos.comprobante_url`) se almacena como `varchar(255)` sin cifrado.

Por lo tanto, salvo las contraseñas manejadas con bcrypt en la mayoría de flujos, **no hay evidencia en el código de cifrado adicional a nivel de base de datos para otros datos sensibles**. Donde no se encuentra manejo explícito, el estado es **no determinado** para posibles mecanismos externos (por ejemplo, cifrado a nivel de servidor MySQL o disco) porque no se ve en este repositorio.

---

## 5. Flujos principales

### 5.1 Flujo de pedido (cliente)

**Frontend móvil (cliente):**

1. El cliente inicia sesión en `HomePage.iniciarSesion()` (`home.page.ts`), obtiene un JWT y es redirigido a `/inicio-cliente`.
2. Desde `InicioClientePage.nuevoPedido()` (`inicio-cliente.page.ts`), se navega a `/nuevo-pedido`.
3. En `NuevoPedidoPage` (`nuevo-pedido.page.ts`):
   - `ngOnInit()` llama a `cargarPrecioCliente()` → `GET /clientes/mi-tarifa` para obtener el precio por garrafón.
   - El usuario selecciona `cantidad`, `metodoPago` y puede agregar `notasCliente` y `archivoComprobante`.
   - `confirmarPedido()` construye un `FormData` y llama `POST /clientes/pedidos` con token Bearer.

**Backend (creación de pedido):**

- En `backend/routers/clientes.py`, función `crear_pedido(...)`:
  1. Valida que el rol del usuario sea cliente (`id_rol in [3,4]`).
  2. Si `tipo_pago == 'Transferencia'` y se envía archivo `comprobante`, lo guarda en `uploads/comprobantes` y genera una URL pública `http://127.0.0.1:8000/uploads/comprobantes/{filename}` asignada a `comprobante_url`.
  3. Obtiene la dirección y colonia del cliente de la tabla `direcciones_clientes`.
  4. Busca un repartidor disponible para esa colonia en `repartidores_rutas` (`estatus_disponibilidad = 1`).
  5. Calcula `precio_unitario = monto_total / cantidad_garrafones`.
  6. Inserta el pedido en la tabla `pedidos` con:
     - `estatus_entrega = 'Pendiente'`.
     - `id_repartidor_asignado` (si se encontró uno) o `NULL`.

**Repartidor (ruta y actualización de estatus):**

- `RutaPage.cargarRutaDelDia()` (`ruta.page.ts`) → `GET /repartidores/entregas` devuelve:
  - `id_pedido`, cliente, dirección, `cantidad_garrafones`, `tipo_pago`, `pago_confirmado`, `estatus_entrega`, `notas_cliente`, `notas_campo`.
- `RutaPage.actualizarEstatus(id_pedido, nuevoEstatus)` llama `PUT /repartidores/entregas/{id_pedido}/estatus` con JSON `{ estatus, notas_campo }`.
- En `repartidores.cambiar_estatus_entrega` (`backend/routers/repartidores.py`):
  - Valida que el usuario sea repartidor y que el pedido esté asignado a ese `id_repartidor`.
  - Si `estatus == 'En camino'`, verifica que el repartidor no tenga otro pedido "En camino".
  - Actualiza `pedidos.estatus_entrega` y `pedidos.notas_campo`.

**Cliente (visualización de pedidos):**

- `InicioClientePage.cargarMisPedidos()` llama `GET /clientes/mis-pedidos`.
- `clientes.obtener_mis_pedidos` construye una lista de pedidos del cliente ordenados por `fecha_hora_creacion` descendente.

### 5.2 Flujo de pago por transferencia

**1. Registro del pedido con comprobante (cliente móvil)**

- En `NuevoPedidoPage.confirmarPedido()` (`nuevo-pedido.page.ts`):
  - Si `metodoPago === 'Transferencia'`, obliga a seleccionar `archivoComprobante`.
  - Envía el formulario con el archivo en `comprobante`.

- Backend `clientes.crear_pedido`:
  - Procesa el archivo `UploadFile` del parámetro `comprobante`.
  - Guarda el archivo en `uploads/comprobantes/{uuid}.{ext}`.
  - Registra la URL del comprobante en `pedidos.comprobante_url`.
  - Inserta el pedido con `tipo_pago = 'Transferencia'`, `pago_confirmado = 0` (por defecto en la tabla) y `estatus_entrega = 'Pendiente'`.

**2. Visualización y validación de transferencias (panel web – finanzas)**

- En `web_panel/js/finanzas.js`:
  - `cargarTransferencias()` llama `GET /finanzas/transferencias-pendientes`.
  - Muestra cada transferencia con:
    - `t.id_pedido`, `t.cliente`, `t.monto_total`, `t.comprobante_url`, `t.hora_solicitud`.
  - Botón "Ver" llama `window.verComprobante(url)` que muestra la imagen en un modal Bootstrap.
  - Botón "Aprobar" llama `window.aprobarTransferencia(idPedido)` → `PUT /finanzas/transferencias/{id_pedido}/aprobar`.
  - Botón "Rechazar" llama `window.rechazarTransferencia(idPedido)` → `PUT /finanzas/transferencias/{id_pedido}/rechazar`.

- Backend `finanzas.py`:
  - `get_transferencias()` (`GET /finanzas/transferencias-pendientes`) obtiene pedidos donde:
    - `tipo_pago = 'Transferencia'`.
    - `pago_confirmado = 0`.
    - `estatus_entrega != 'Pago Rechazado'`.
  - `aprobar_transferencia(id_pedido)` (`PUT /finanzas/transferencias/{id_pedido}/aprobar`):
    - Ejecuta `UPDATE pedidos SET pago_confirmado = 1 WHERE id_pedido = %s`.
  - `rechazar_transferencias(id_pedido)` (`PUT /finanzas/transferencias/{id_pedido}/rechazar`):
    - Ejecuta `UPDATE pedidos SET estatus_entrega = 'Pago Rechazado', notas_campo = 'Comprobante rechazado por administracion' WHERE id_pedido = %s`.

**3. Impacto en otros módulos**

- KPIs (`finanzas.get_kpis_hoy`) cuentan `transferencias_pendientes` a partir de los pedidos con `tipo_pago = 'Transferencia'`, `pago_confirmado = 0` y `estatus_entrega != 'Pago Rechazado'`.
- Conciliación por repartidor (`finanzas.get_conciliacion_repartidores` y `get_detalle_repartidor`) suma por tipo de pago y estado de `pago_confirmado`.

### 5.3 Flujo de aprobación general (pedidos y entregas)

En el sistema hay varios puntos de "aprobación" o cambio de estatus:

1. **Asignación automática de repartidor (backend – creación de pedido)**
   - En `clientes.crear_pedido`, al crear el pedido se hace una selección automática de repartidor disponible por colonia.
   - Si hay repartidor con `estatus_disponibilidad = 1` en `repartidores_rutas`, se guarda `id_repartidor_asignado`.

2. **Cambio de estatus de entrega (repartidor)**
   - `RutaPage.actualizarEstatus` en app móvil.
   - Backend `repartidores.cambiar_estatus_entrega`: valida que el repartidor no tenga dos pedidos "En camino" y actualiza `estatus_entrega`.

3. **Aprobación / rechazo de transferencias (administración)**
   - Panel web: `finanzas.js` con funciones `aprobarTransferencia` y `rechazarTransferencia`.
   - Backend: `finanzas.aprobar_transferencia` y `finanzas.rechazar_transferencias`.

4. **No determinado**
   - No se observa en el código un flujo explícito de "aprobación" manual de pedidos en general (más allá de la validación de transferencias y de la actualización de estatus por el repartidor). Si existe un flujo adicional de aprobación antes de que un pedido pase a ruta, no está definido en los archivos inspeccionados → **no determinado**.

---

## Notas finales

- Cualquier comportamiento adicional de seguridad, cifrado a nivel de servidor MySQL, balanceo de carga u orquestación no está descrito en este repositorio → **no determinado**.
- La información anterior se basa únicamente en archivos reales del proyecto, sin inferir lógica que no esté explícitamente implementada.
