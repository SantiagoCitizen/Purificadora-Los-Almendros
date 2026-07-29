async function conectarAPI(){
    try{
        //Peticion al servidor de FastApi
        const respuesta = await fetch("http://127.0.0.1:8000/colonias");
        const datosJson = await respuesta.json();

        //Buscar el tbody en el html y limpiarlo, osea se le quita el "buscando en la bd..."
        const tabla = document.querySelector('tbody');
        tabla.innerHTML = '';

        //Actualizar el mensaje de "conectando"
        //Se selecciona el h2 dentro del segundo article
        const estadoServidor = document.querySelectorAll('article h2')[1];
        estadoServidor.innerText = `En linea (${datosJson.total_registros} colonias)`;

        datosJson.datos.forEach(colonia => {
            tabla.innerHTML += `
                <tr>
                    <td>#${colonia.id_colonia}</td>
                    <td>${colonia.nombre_colonia}</td>
            `;
        });
    } catch (error) {
        console.error("Error al conectar con FastAPI:", error);
        const estadoServidor = document.querySelectorAll('article h2')[1];
        estadoServidor.innerText = "Desconectado";
    }
}
conectarAPI();