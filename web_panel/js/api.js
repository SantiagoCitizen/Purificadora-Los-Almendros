//Evitar que entren al index sin logearse
const tokenVIP = sessionStorage.getItem('tokenVIP');

if (!tokenVIP) {
    window.location.replace('login.html');
}

const usuarioLogueado = JSON.parse(sessionStorage.getItem('usuarioLogueado'));


// Función: Cargar Repartidores
async function cargarRepartidores() {
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
                    <td>
                        <button class="btn btn-sm btn-light border shadow-sm"><i class="bi bi-three-dots"></i></button>
                    </td>
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
    } catch (error) {
        console.error("Error al cargar los detalles del cliente", error);
        document.getElementById('nombreCliente').innerText = "Error al cargar datos";
    }
}

// Ejecutar las funciones al mismo tiempo
cargarRepartidores();
cargarClientes();
