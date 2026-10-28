# AGENTS.md

## Resumen
Es un sistema integral de logistica y ventas para la purificadora los almendros, funciona a traves de una aplicacion movil hecha con capacitor, ionic y angular, la aplicacion movil tiene 2 interfaces validadas por roles, cliente y repartidor, el repartidor ve los pedidos hechos por los clientes y el cliente hace los pedidos y ve su historial, el panel web es para la administracion en gerencia, donde se aprueban pedidos por transferencia y se ve un resumen de ventas por repartidor.

## Stack
Frontend: HTML, CSS, Ionic, Angular, TS, JS
Backend: Python (FastAPI, MySQLConnector)

## Estructura del proyecto
`web_panel` -> es la carpeta donde se almacena todo el frontend del panel web junto con los archivos de JS
`web_panel/login.html` -> Frontend de la pagina principal de la pagina web para gerencia
`web_panel/index.html` -> Frontend del login de la pagina web para gerencia
`web_panel/paginas` -> Carpeta donde se encuentran todos los archivos frontend html para la pagina de gerencia
`web_panel/js` -> Carpeta donde se encuentran todos los archivos JS referentes al frontend html para la pagina de gerencia
`web_panel/components` -> Carpeta donde se encuentra el archivo html de la barra lateral del frontend para la pagina de gerencia
`database` -> Carpeta donde se encuentra el archivo .sql del esquema completo de la base de datos
`backend/routers` -> Carpeta donde se encuentran todos los archivos del backend de la pagina web para gerencia y aplicacion movil
`almendros-movil/src/app` -> Carpeta con subcarpetas donde se encuentran todos los archivos de diseño y logica para la aplicacion movil

## No hacer
- No instalar dependencias nuevas sin avisar
- En ningun momento puedes modificar archivos existentes, solo leeras los archivos y mostraras los cambios sugeridos de la instruccion que se te pida mostrando el codigo anterior y el nuevo codigo remarcando las partes de los cambios
- No modificar migraciones existentes
- No tocar la rama main

## Que si hacer
- Puedes crear archivos de texto .md o .txt en la carpeta `archivos` cuando se te solicite
