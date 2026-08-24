//constante con la url del local host que ya luego cambio metiendolo a env cuando tenga el servidor en la nube aprendi a pensar kalajo
const url_finanzas = 'http://127.0.0.1:8000/finanzas';

document.addEventListener('DOMContentLoaded', () => {
    //Cuando cargue la pagina, se ejecutan las 4 peticiones
    cargarKPIs();
    cargarTransferencias();
    cargarConciliacion();
    cargarIncidencias();
});

//Cargar las Kpis
async function cargarKPIs() {
    try {
        const respuesta = await fetch(`${url_finanzas}/kpis`);
        const datos = await respuesta.json();

        document.getElementById('kpiTransferencias').innerText = datos.transferencias_pendientes || 0;
        document.getElementById('kpiAlertas').innerText = datos.alertas || 0;

        //Formato de dinero
        const totalMoneda = parseFloat(datos.ventas_totales || 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN'});
        document.getElementById('kpiVentasTotal').innerText = totalMoneda;

        document.getElementById('kpiGarrafonesTotal').innerText = `${datos.garrafones_totales || 0} Garrafones Vendidos (Hoy)`;
    } catch (error) {
        console.error("Errpr al cargar las KPIs", error);
        document.getElementById('kpiTransferencias').innerText = "-";
        document.getElementById('kpiAlertas').innerText = '-';
        document.getElementById('kpiVentasTotal').innerText = "Error";
        document.getElementById('kpiGarrafonesTotal').innerText = "Error de conexion";
    }
}

//Tabla de transferencias pendientes
async function cargarTransferencias() {
    const tabla = document.getElementById('tablaAuditoriaTransferencias');
    try {
        const respuesta = await fetch(`${url_finanzas}/transferencias-pendientes`);
        const transferencias = await respuesta.json();

        tabla.innerHTML = ''; // Limpiar el spinner

        if (transferencias.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No hay transferencias pendientes por validar.</td></tr>';
            return;
        }

        transferencias.forEach(t => {
            const monto = parseFloat(t.monto_total).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
            
            // Si el cliente no subió imagen, deshabilitamos el botón
            const btnVer = t.comprobante_url 
                ? `<button class="btn btn-sm btn-outline-secondary" onclick="verComprobante('${t.comprobante_url}')"><i class="bi bi-image"></i> Ver</button>`
                : `<span class="badge bg-light text-muted border">Sin captura</span>`;

            tabla.innerHTML += `
                <tr>
                    <td class="fw-bold">#${t.id_pedido}</td>
                    <td>${t.cliente}</td>
                    <td class="text-primary fw-semibold">${monto}</td>
                    <td>${btnVer}</td>
                    <td class="text-muted">${t.hora_solicitud}</td>
                    <td>
                        <button class="btn btn-sm btn-success me-1" onclick="aprobarTransferencia(${t.id_pedido})"><i class="bi bi-check-lg"></i> Aprobar</button>
                        <button class="btn btn-sm btn-danger" onclick="rechazarTransferencia(${t.id_pedido})"><i class="bi bi-x-lg"></i> Rechazar</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar datos.</td></tr>';
    }
}

// 3. Cargar la tabla central de conciliación por repartidor
async function cargarConciliacion() {
    const tabla = document.getElementById('tablaConciliacionRepartidores');
    try {
        const respuesta = await fetch(`${url_finanzas}/conciliacion-hoy`);
        const conciliacion = await respuesta.json();

        tabla.innerHTML = ''; // Limpiar el spinner

        if (conciliacion.length === 0) {
            tabla.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay cortes de caja activos hoy.</td></tr>';
            return;
        }

        conciliacion.forEach(c => {
            const esperado = parseFloat(c.efectivo_esperado).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
            const validadas = parseFloat(c.transferencias_validadas).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
            const totales = parseFloat(c.transferencias_totales).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
            
            // Resaltar en rojo si hay incidencias
            const badgeIncidencias = c.incidencias > 0 
                ? `<span class="badge bg-danger">${c.incidencias}</span>` 
                : `<span class="text-muted">0</span>`;

            tabla.innerHTML += `
                <tr>
                    <td class="fw-bold">${c.repartidor}</td>
                    <td class="text-success fw-bold">${esperado}</td>
                    <td><span class="badge bg-secondary">${validadas} / ${totales}</span></td>
                    <td>${badgeIncidencias}</td>
                    <td><button class="btn btn-sm btn-outline-primary" onclick="verDetalleRepartidor(${c.id_repartidor})"><i class="bi bi-search"></i> Ver Detalle</button></td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error al cargar datos.</td></tr>';
    }
}

// 4. Cargar las notas de campo
async function cargarIncidencias() {
    const tabla = document.getElementById('tablaBitacoraIncidencias');
    try {
        const respuesta = await fetch(`${url_finanzas}/incidencias-hoy`);
        const incidencias = await respuesta.json();

        tabla.innerHTML = '';

        if (incidencias.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Todo tranquilo. No hay incidencias registradas hoy.</td></tr>';
            return;
        }

        incidencias.forEach(i => {
            // Cambiar color de la etiqueta dependiendo si fue "Entregado" u otra cosa
            let colorBadge = i.estatus_entrega === 'Entregado' ? 'bg-warning text-dark' : 'bg-danger';
            let nota = i.notas_campo ? i.notas_campo : 'Sin nota especificada.';

            tabla.innerHTML += `
                <tr>
                    <td class="fw-bold">#${i.id_pedido}</td>
                    <td>${i.repartidor}</td>
                    <td><span class="badge ${colorBadge}"><i class="bi bi-info-circle"></i> ${i.estatus_entrega}</span></td>
                    <td class="text-start text-muted fst-italic">${nota}</td>
                </tr>
            `;
        });
    } catch (error) {
        tabla.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Error al cargar datos.</td></tr>';
    }
}

function verComprobante(url) { alert("Abrir modal de comprobante: " + url); }
function aprobarTransferencia(idPedido) { alert("Aprobar pedido #" + idPedido); }
function rechazarTransferencia(idPedido) { alert("Rechazar pedido #" + idPedido); }
function verDetalleRepartidor(idRepartidor) { alert("Abrir desglose del repartidor ID: " + idRepartidor); }