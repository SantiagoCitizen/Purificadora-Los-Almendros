
//Evitar que entren al index sin logearse
function verificarAcceso() {
    if (!sessionStorage.getItem('tokenVIP')) {
        window.location.replace('login.html');
    }
}
//Revision al cargar la pagina
verificarAcceso();
//Revision forzada si el usuario usa los botones de "atras o adelante" del navegador
window.addEventListener('pageshow', function(event) {
    //event.persisted es true si el navegador saco la pagina de la memoria cache
    if (event.persisted) {
        verificarAcceso();
    }
});

const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));

//MODULO PRINCIPAL (VENTANA PRINCIPAL)

// Función: Cargar Repartidores
async function cargarRepartidores() {
    const select = document.getElementById('tablaRepartidores');
    if (!select) return;
    try {
        const respuesta = await fetch('http://127.0.0.1:8000/repartidores');
        const repartidores = await respuesta.json();

        //buscar la tabla en el html por su id
        const tabla = document.getElementById('tablaRepartidores');
        tabla.innerHTML = ''; //Limpiar el mensaje de cargando repartidores

        //Contar cuantos repartidores hjay en total para actualizar el estado
        const total = repartidores.length;
        document.getElementById('estadoServidor').innerText = "En línea";
        document.getElementById('estadoServidor').className = "display-6 fw-bold text-success mb-0";

        //recorrer la lista de repartidores
        repartidores.forEach(repartidor => {
            //cambiar el color de etiqueta dependiendo del estado
            let colorBadge = repartidor.estado === 'Libre' ? 'bg-secondary' : 'bg-success';

            //fila con los datos
            const fila = `
                <tr>
                    <td class="fw-semibold">${repartidor.nombre}</td>
                    <td><span class="badge ${colorBadge}">${repartidor.estado}</span></td>
                    <td>${repartidor.ruta}</td>
                    <td class="text-muted"><i class="bi bi-telephone"></i> ${repartidor.telefono}</td>
                </tr>
            `;
            tabla.innerHTML += fila; //Se añade la fila a la tabla
        });
    } catch (error) {
        console.error("Error al cargar los repartidores:", error);
        document.getElementById('estadoServidor').innerText = "Desconectado";
        document.getElementById('estadoServidor').className = "display-6 fw-bold text-danger mb-0";
    }
}

// Función: Cargar Clientes
async function cargarClientes() {
    const tablita = document.getElementById('tablaClientes');
    if (!tablita) return;

    try {
        //Se piden los clientes
        const respuesta = await fetch('http://127.0.0.1:8000/clientes');
        const clientes = await respuesta.json();

        const tabla = document.getElementById('tablaClientes');
        tabla.innerHTML = ''; //Se limpia el texto

        //Se recorre la lista de clientes
        clientes.forEach(cliente => {
            //Se quita la palabra Cliente para verse mas limpio
            let categoriaLimpia = cliente.categoria.replace('Cliente ', '');
            //La tarifa se muestra en dos decimales
            let tarifaFormateada = parseFloat(cliente.tarifa).toFixed(2);

            //fila
            const fila = `
                <tr>
                    <td class="fw-semibold">${cliente.cliente}</td>
                    <td>${categoriaLimpia}</td>
                    <td>$${tarifaFormateada}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" onclick="abrirBtnVerCliente(${cliente.id_usuario})"><i class="bi bi-eye"></i> Ver</button>
                    </td>
                </tr>
            `;
            tabla.innerHTML += fila;
        });
    } catch (error) {
        console.error("Error al cargar los clientes:", error);
    }
}

//Funcion: Cerrar sesion

//Boton de salir en el html "btnSalir"
const botonSalir = document.getElementById('btnSalir');

//Listener para capturar el clic al boton
botonSalir.addEventListener('click', (evento) => {
    //Evitar que se recargue la pagina por defecto
    evento.preventDefault();
    //Eliminar el token por seguridad
    sessionStorage.removeItem('tokenVIP');
    //Borrar los datos del usuario logeado
    sessionStorage.removeItem('usuarioLogeado');
    //redirigir al login
    window.location.replace('login.html');
})

//Funcion para abrir el boton "Ver" en dashboard principal de cliente

async function abrirBtnVerCliente(idUsuario) {
    try{
        //Instanciar el modal de bootstrap para controlarlo
        const modal = new bootstrap.Modal(document.getElementById('btnVerCliente'));
        //mostrar en pantalla
        modal.show();
        //Texto de "cargando" por si el internet esta lento
        document.getElementById('nombreCliente').innerText = 'Cargando...';
        document.getElementById('telefonoCliente').innerText = '...';
        document.getElementById('direccionCliente').innerText = '...';
        document.getElementById('inputTarifa').value = "";
        //Pedir a FastAPI el JSON del cliente
        const respuesta = await fetch(`http://127.0.0.1:8000/clientes/${idUsuario}`);
        const datosCliente = await respuesta.json();

        //armar el nombre (si es empresa, se agrega la razon social)
        let nombreCompleto = `${datosCliente.nombre} ${datosCliente.apellido_paterno}`;
        if (datosCliente.id_rol === 4){
            nombreCompleto += ` - ${datosCliente.razon_social}`;
        }
        document.getElementById('nombreCliente').innerText = nombreCompleto;
        //poner telefono
        document.getElementById('telefonoCliente').innerText = datosCliente.telefono;
        //armar la direccion
        let direccionFisica = `${datosCliente.calle} #${datosCliente.numero}, Col. ${datosCliente.nombre_colonia}`;
        //si el cliente puso referencias, se concatenan
        if (datosCliente.referencias_domicilio) {
            direccionFisica += ` (Ref: ${datosCliente.referencias_domicilio})`;
        }
        document.getElementById('direccionCliente').innerText = direccionFisica;
        //poner la tarifa especial en el input
        document.getElementById('inputTarifa').value = datosCliente.tarifa_especial;
        document.getElementById('btnGuardarTarifa').setAttribute(`onclick`, `guardarNuevaTarifa(${idUsuario})`);
    } catch (error) {
        console.error("Error al cargar los detalles del cliente", error);
        document.getElementById('nombreCliente').innerText = "Error al cargar datos";
    }
}
//Funcion para guardar la nueva tarifa
async function guardarNuevaTarifa(idUsuario) {
    //Obtener el valor de la nueva tarifa
    const nuevaTarifa = document.getElementById('inputTarifa').value;
    //Cambiar el texto del boton para que parezca que esta pensando o procesando
    const btnGuardar = document.getElementById('btnGuardarTarifa');
    btnGuardar.innerText = 'Guardando...';
    btnGuardar.disable = true;

    try {
        //Enviar el valor al backend
        const respuesta = await fetch(`http://127.0.0.1:8000/clientes/${idUsuario}/tarifa`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tarifa_especial: parseFloat(nuevaTarifa) })
        });

        if (respuesta.ok){
            //Si todo sale bien, recarga la tabla principal para mostrar el nuevo precio
            cargarClientes();
            //Aviso al usuario y se regresa el boton a la normalidad
            alert("Tarifa actualizada con éxito.");
            btnGuardar.innerText = "Guardar";
            btnGuardar.disabled = false;
        } else {
            alert("Error al guardar la tarifa.");
            btnGuardar.innerText = "Guardar";
            btnGuardar.disabled = false;
        }
    } catch (error) {
        console.error("Error en la petición PUT:", error);
        alert("Fallo en la conexion con el servidor");
        btnGuardar.innerText = "Guardar";
        btnGuardar.disabled = false;
    }
    
}
//FIN MODULO PRINCIPAL: (VISTA PRINCIPAL)

//MODULO LOGISTICA 

// VER COLONIAS REGISTRADAS

async function cargarColonias() {
    const tabla = document.getElementById('tablaColonias');
    //Si no encuentra la tabla, detenemos la funcion
    if (!tabla) return;

    try {
        const respuesta = await fetch('http://localhost:8000/colonias');
        if (!respuesta) {
            throw new Error('Error en la respuesta del servidor');
        }
        const colonias = await respuesta.json();
        //Quitar el spinner
        tabla.innerHTML = '';
        //Si la bd esta vacia
        if (colonias.length === 0) {
            tabla.innerHTML = `
                <tr>
                    <td colspan="2" class="text-center py-4 text-muted">
                        No hay colonias registradas aún.
                    </td>
                </tr>`;
            return;
        }
        //Recorrer el arreglo de colonias y poner una fila por cada una
        colonias.forEach(colonia => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td class="px-4 py-3 fw-medium text-dark">${colonia.nombre_colonia}</td>
                <td class="px-4 py-3">
                    <button class="btn btn-sm btn-outline-primary me-1 btn-editar" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-eliminar" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            //Boton eliminar
            const btnEliminar = fila.querySelector('.btn-eliminar');
            btnEliminar.addEventListener('click', async () => {
                //Confirmacion del usuario
                const confirmacion = confirm(`¿Estás seguro de eliminar la colonia "${colonia.nombre_colonia}"?`);
                if (confirmacion) {
                    try {
                        //Peticion a FastAPI que borre
                        const respuestaDelete = await fetch(`http://localhost:8000/colonias/${colonia.id_colonia}`, {
                            method: 'DELETE'
                        });
                        if (respuestaDelete.ok) {
                            alert('Colonia eliminada');
                            cargarColonias();
                        } else {
                            const errorData = await respuestaDelete.json();
                            alert(`Alerta_ ${errorData.detail}`);
                        }
                    } catch (error) {
                        console.error('Error al eliminar', error);
                        alert('No se pudo conectar con el servidor');
                    }
                }
            });
            //Boton editar
            const btnEditar = fila.querySelector('.btn-editar');
            btnEditar.addEventListener('click', async () => {
                //Pedir el nuevo nombre
                const nuevoNombre = prompt(`Editar el nombre de la colonia:`, colonia.nombre_colonia);
                //cancelar
                if (nuevoNombre === null) {
                    return;
                }
                //limpiar espacios en blanco al inicio y final
                const nombreLimpio = nuevoNombre.trim();
                //validar que no este vacio
                if (nombreLimpio === '') {
                    alert('El nombre de la colonia no puede estar vacio');
                    return;
                }
                //validar que si sea un nombre nuevo
                if (nombreLimpio === colonia.nombre_colonia) {
                    return;
                }
                try {
                    //peticion put a fastapi
                    const respuestaPUT = await fetch(`http://localhost:8000/colonias/${colonia.id_colonia}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ nombre_colonia: nombreLimpio })
                    });
                    if (respuestaPUT.ok) {
                        alert('Colonia actualizada con exito');
                        //Volver a cargar la tabla
                        cargarColonias();
                    } else {
                        const errorData = await respuestaPUT.json();
                        alert(`Error al actualizar: ${errorData.detail}`);
                    }
                } catch (error) {
                    console.error('Error al editar:', error);
                    alert('No se pudo conectar con el servidor')
                }
            });
            tabla.appendChild(fila);
        });
    } catch (error) {
        console.error('Error al cargar colonias:', error);
        tabla.innerHTML = `
            <tr>
                <td colspan="2" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error al conectar con el servidor.
                </td>
            </tr>`;
    }
    
}

//REGISTRAR COLONIA

document.addEventListener('DOMContentLoaded', () => {

    cargarColonias();

    const btnGuardarColonia = document.getElementById('btnGuardarColonia');
    const inputNombreColonia = document.getElementById('inputNombreColonia');

    if(btnGuardarColonia) {
        btnGuardarColonia.addEventListener('click', async () => {
            const nombreColonia = inputNombreColonia.value.trim();
            //Validar que el campo no este vacio
            if(!nombreColonia) {
                alert('Por favor, escribe el nombre de la colonia');
                return;
            }
            try {
                //Peticion POST a FastAPI
                const respuesta = await fetch('http://localhost:8000/colonias', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        nombre_colonia: nombreColonia
                    })
                });
                const datos = await respuesta.json();
                if (respuesta.ok) {
                    alert('Colonia registrada con éxito');
                    //Limpiar el campo de texto
                    inputNombreColonia.value = '';
                    //Cerrar el modal automaticamente con bootstrap
                    const modalElemento = document.getElementById('nuevaColonia');
                    const modalInstancia = bootstrap.Modal.getInstance(modalElemento);
                    if (modalInstancia) {
                        modalInstancia.hide();
                    }
                    cargarColonias();
                } else {
                    alert(`Error al guardar: ${datos.detail || 'Ocurrio un problema'}`);
                }
            } catch (error) {
                console.error('Error en la peticion:', error);
                alert('No se pudo conectar con el servidor backend')
            }
        });
    }
})

//Modulo: Ver repartidores en logistica:
// Función exclusiva para la vista de Logística
async function cargarRepartidoresLogistica() {
    const tabla = document.getElementById('tablaRepartidoresLogistica');
    
    // Si no estamos en la página de logística (no existe la tabla), detenemos la función
    if (!tabla) return; 

    try {
        const respuesta = await fetch('http://localhost:8000/repartidores');
        const repartidores = await respuesta.json();

        tabla.innerHTML = ''; // Limpiar el mensaje de "Cargando..."

        // Recorrer la lista de repartidores
        repartidores.forEach(repartidor => {
            
            // Unimos el nombre con su apellido (si tiene materno, se agrega, si no, se deja en blanco)
            const nombreCompleto = `${repartidor.nombre} ${repartidor.apellido_materno || ''}`.trim();
            
            // Lógica de colores 
            const colorTurno = repartidor.en_turno ? 'bg-success' : 'bg-secondary';
            const textoTurno = repartidor.en_turno ? 'En turno' : 'Inactivo';
            
            const colorContrato = repartidor.estatus_contrato ? 'bg-primary' : 'bg-danger';
            const textoContrato = repartidor.estatus_contrato ? 'Activo' : 'Baja';

            // Fila con los datos 
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td class="px-4 py-3 fw-medium text-dark">${nombreCompleto}</td>
                <td class="px-4 py-3 text-muted">${repartidor.ruta}</td> 
                <td class="px-4 py-3"><i class="bi bi-telephone"></i> ${repartidor.telefono}</td>
                <td class="px-4 py-3"><span class="badge ${colorTurno}">${textoTurno}</span></td>
                <td class="px-4 py-3"><span class="badge ${colorContrato}">${textoContrato}</span></td>
            `;
            
            tabla.appendChild(fila);
        });
    } catch (error) {
        console.error("Error al cargar los repartidores en logística:", error);
        tabla.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4 text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error al cargar los datos.
                </td>
            </tr>
        `;
    }
}

//Modulo: Alta de repartidores

const btnGuardarRepartidor = document.getElementById('btnGuardarRepartidor');

if(btnGuardarRepartidor) {
    btnGuardarRepartidor.addEventListener('click', async () => {
        //Capturar valores de los inputs y limpiar espacios en blanco
        const nombre = document.getElementById('inputNombreRepartidor').value.trim();
        const paterno = document.getElementById('inputPaternoRepartidor').value.trim();
        const materno = document.getElementById('inputMaternoRepartidor').value.trim();
        const telefono = document.getElementById('inputTelefonoRepartidor').value.trim();

        //Validacion de campos obligatorios
        if (nombre === '' || paterno === '' || telefono === '') {
            alert('Por favor, llena los campos obligatorios: Nombre, Apellido Paterno y Telefono');
            return;
        }
    //JSON: si el apellido materno esta vacio, se manda NULL
    const datosRepartidor = {
        nombre: nombre,
        apellido_paterno: paterno,
        apellido_materno: materno === '' ? null : materno,
        telefono: telefono
    };
    try {
        //Peticion post a FastAPI
        const respuesta = await fetch('http://localhost:8000/repartidores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datosRepartidor)
        });

        if (respuesta.ok) {
            alert('Repartidor registado con éxito');
            //Limpiar el formulario
            document.getElementById('inputNombreRepartidor').value = '';
            document.getElementById('inputPaternoRepartidor').value = '';
            document.getElementById('inputMaternoRepartidor').value = '';
            document.getElementById('inputTelefonoRepartidor').value = '';
            //Cerrar el modal
            const modalElement = document.getElementById('nuevoRepartidor');
            const modalInstancia = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
            modalInstancia.hide();
            
            cargarRepartidoresLogistica();

        } else {
            //Errores de fastapi, como telefono duplicado
            const errorData = await respuesta.json();
            alert(`Atencion: ${errorData.detail}`);
        }
    } catch (error) {
        alert('No se pudo conectar con el servidor')
    }
    });
}
//FIN MODULO LOGISTICA

// Ejecutar las funciones al mismo tiempo
cargarRepartidores();
cargarClientes();
cargarRepartidoresLogistica();
