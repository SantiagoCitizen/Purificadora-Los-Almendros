"""
FastAPI, HTTPException: Una crea el servidor y la otra devuelve error web formales como el 404 o 500 si falla algo
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import db_conexion

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

#Devuelve las colonias en la web o panel movil.
@app.get("/colonias")
def get_colonias():
    try:
        conexion = db_conexion() #Funcion de arriba

        #Por si no conecta a la bd
        if not conexion:
            raise Exception("No se pudo conectar con la D.B")
        
        #dictionary = True convierte las filas en diccionarios JSON automaticos
        cursor = conexion.cursor(dictionary=True)

        cursor.execute("SELECT * FROM colonias;")
        resultados = cursor.fetchall()

        #Cierra la conexion por seguridad y para no saturar
        cursor.close()
        conexion.close()

        #Se devuelve un JSON limpio con el status, el conteo y los datos listos para todo el frontend
        return {
            "estado": "success",
            "total_registros": len(resultados),
            "datos": resultados
        }
    #Si sale algun error arriba, python trabaja aqui en lugar de cerrar el programa de golpe
    except Exception as e:
        #Se intercepta el fallo y respondemos al navegador o app con un codigo web 500
        #(Error interno del servidor) y el detalle exacto de que fallo para poder depurar
        raise HTTPException(status_code=500, detail=f"Error al conectar con la base de datos {e}")
