"""
FastAPI, HTTPException: Una crea el servidor y la otra devuelve error web formales como el 404 o 500 si falla algo
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import db_conexion
from mysql.connector import Error

"""
Se inicializa la aplicacion, la variable "app" es el servidor
title, description y version son leidos por FastAPI para construir automaticamente la documentacion grafica 
"""
app = FastAPI(
    title = "API Agua Los Almendros",
    description = "Backend oficial para la gestion de pedidos y repartidores de Agua Los Almendros",
    version = "1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

"""
"@app.get("/")" es un decorador que le dice a la app: Cuando alguien entre a la raiz ("/") ejecuta la funcion de abajo y convierte el resultado en JSON automaticamente
"""
@app.get("/")
def raiz():
    return {"mensaje": "Agua Los Almendros En linea"}

#Devuelve llos repartidores al panel web de administracion
@app.get("/repartidores")
def get_repartidores():
    try:
        conexion = db_conexion() #Funcion de arriba

        #Por si no conecta a la bd
        if not conexion:
            raise Exception("No se pudo conectar con la D.B")
        
        #dictionary = True convierte las filas en diccionarios JSON automaticos
        cursor = conexion.cursor(dictionary=True)

        sql_query = """
            SELECT
                CONCAT(u.nombre, ' ', u.apellido_paterno) AS nombre,
                IF(MAX(rr.estatus_disponibilidad) = 1, 'Libre', 'En Ruta') AS estado,
                GROUP_CONCAT(c.nombre_colonia SEPARATOR ', ') AS ruta
            FROM usuarios u
            LEFT JOIN repartidores_rutas rr ON u.id_usuario = rr.id_usuario_repartidor
            LEFT JOIN colonias c ON rr.id_colonia = c.id_colonia
            WHERE u.id_rol = 2
            GROUP BY u.id_usuario;
        """

        cursor.execute(sql_query)
        #Selecciona todo el resultado de la consulta
        repartidores = cursor.fetchall()

        #Cierra la conexion por seguridad y para no saturar
        cursor.close()
        conexion.close()

        #Devuelve los repartidores
        return repartidores
    #Si sale algun error arriba, python trabaja aqui en lugar de cerrar el programa de golpe
    except Exception as e:
        #Se intercepta el fallo y respondemos al navegador o app con un codigo web 500
        #(Error interno del servidor) y el detalle exacto de que fallo para poder depurar
        raise HTTPException(status_code=500, detail=f"Error al conectar con la base de datos {e}")

#Obtener clientes
@app.get("/clientes")
def get_clientes():
    conexion = db_conexion()
    if conexion is None:
        return {"error": "No se pudo conectar a la base de datos"}

    try:
        cursor = conexion.cursor(dictionary=True)
        sql_query = """
            SELECT 
                CONCAT_WS(' ', nombre, apellido_paterno) AS cliente,
                CASE id_rol
                    WHEN 3 THEN 'Residencial'
                    WHEN 4 THEN 'Empresarial'
                END AS categoria,
                IFNULL(tarifa_especial, 26.00) AS tarifa
            FROM usuarios
            WHERE id_rol IN (3, 4);
        """
        cursor.execute(sql_query)
        clientes = cursor.fetchall()
        return clientes
    except Error as e:
        return {"error": str(e)}
    finally:
        cursor.close()
        conexion.close()