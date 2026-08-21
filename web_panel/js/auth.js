//Evitar que entren al index sin logearse
function verificarAcceso() {
    if (!sessionStorage.getItem('tokenVIP')) {
        //Detecta si vamos a una pantalla dentro de la carpeta "paginas"
        if (window.location.pathname.includes('/paginas/')) {
            window.location.replace('../login.html');
        } else {
            window.location.replace('login.html')
        }
    }
}
//Revision al cargar la pagina
verificarAcceso();
//Si el usuario usa los botones de "atras o adelante" del navegador
window.addEventListener('pageshow', function(event) {
    //event.persisted es true si el navegador saco la pagina de la memoria cache
    if (event.persisted) {
        verificarAcceso();
    }
});

const usuarioLogeado = JSON.parse(sessionStorage.getItem('usuarioLogeado'));

//Funcion: Cerrar sesion
const botonSalir = document.getElementById('btnSalir');
if (botonSalir) { //If de seguridad por si el boton no existe en alguna pagina
    botonSalir.addEventListener('click', (evento) => {
        evento.preventDefault();
        sessionStorage.removeItem('tokenVIP');
        sessionStorage.removeItem('usuarioLogeado');
        window.location.replace('login.html');
    });
}