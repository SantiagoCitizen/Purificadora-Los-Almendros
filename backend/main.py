"""
FastAPI, HTTPException: Una crea el servidor y la otra devuelve error web formales como el 404 o 500 si falla algo
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import db_conexion
from mysql.connector import Error
from pydantic import BaseModel
from typing import Optional, List
import bcrypt
import jwt
from datetime import datetime, timedelta
import os
"""
Se inicializa la aplicacion, la variable "app" es el servidor
title, description y version son leidos por FastAPI para construir automaticamente la documentacion grafica 
"""
app = FastAPI(
    title = "API Agua Los Almendros",
    description = "Backend oficial para la gestion de pedidos y repartidores de Agua Los Almendros",
    version = "1.0"
)
class DatosLogin(BaseModel):
    telefono: str
    password: str

class ActualizarTarifa(BaseModel):
    tarifa_especial: float

class NuevaColonia(BaseModel):
    nombre_colonia: str

class UpdateColonia(BaseModel):
    nombre_colonia: str

class AltaRepartidor(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None #Puede ser nulo
    telefono: str

class AsignarRutas(BaseModel):
    colonias: List[int]

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

#--------------------------- Apartado principal y login ----------------------------------

#Devuelve llos repartidores al panel web de administracion y logistica
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
                u.id_usuario,
                u.nombre AS nombre_pila,
                CONCAT(u.nombre, ' ', u.apellido_paterno) AS nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.telefono, 
                u.en_turno, 
                u.estatus_contrato,
                IF(MAX(rr.estatus_disponibilidad) = 0, 'En Ruta', 'Libre') AS estado,
                COALESCE(GROUP_CONCAT(c.nombre_colonia SEPARATOR ', '), 'Sin ruta asignada') AS ruta
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
                id_usuario,
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
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

#Login
@app.post("/login")
def login(datos: DatosLogin):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")

    try:
        cursor = conexion.cursor(dictionary=True)
        #Buscar si existe un usuario con el telefono ingresado
        #Solo se trae los datos que se necesitan, incluyendo el id_rol
        sql_query = """
            SELECT id_usuario, nombre, apellido_paterno, telefono, password_hash, id_rol
            FROM usuarios
            WHERE telefono = %s
        """
        #Ejecutar la consulta pasando el telefono que llego del forntend del login
        cursor.execute(sql_query, (datos.telefono,))
        usuario = cursor.fetchone()

        #Por si el usuario no existe
        if not usuario:
            raise HTTPException(status_code=401, detail="Telefono o contraseña incorrectos")

        #Validar la contraseña
        #Convertir ambas contraseñas en formato bytes para que la libreria bcrypt entienda
        password_ingresada = datos.password.encode('utf-8')
        password_bd = usuario['password_hash'].encode('utf-8')

        #Se compara la ingresada con la de la bd
        if not bcrypt.checkpw(password_ingresada, password_bd):
            raise HTTPException(status_code=401, detail="Telefono o contraseña incorrecta")

        #Token JWT 
        token_vip = {
            "id_usuario": usuario['id_usuario'],
            "rol": usuario['id_rol'],
            "exp": datetime.utcnow() + timedelta(hours=8)
        }
        #Firma con el secreto
        llave_secreta = os.getenv("JWT_SECRET")
        token = jwt.encode(token_vip, llave_secreta, algorithm="HS256")

        #Si pasa todas las verificaciones
        #Se borra la contraseña por seguridad
        del usuario['password_hash']
        #Enviar los datos del usuario al frontend
        return {"Mensaje": "Login exitoso", "token": token, "usuario": usuario}
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

#Boton "Ver" en dashboard principal de cliente
@app.get("/clientes/{id_usuario}")
def get_detalle_clientes(id_usuario: int):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")

    try:
        cursor = conexion.cursor(dictionary=True)
        #Consulta sql con joins
        sql_query = """
            SELECT
                u.id_usuario,
                u.nombre,
                u.apellido_paterno,
                u.apellido_materno,
                u.telefono,
                u.id_rol,
                u.razon_social,
                u.rfc,
                IFNULL(u.tarifa_especial, 26.00) AS tarifa_especial,
                dc.calle,
                dc.numero,
                dc.referencias_domicilio,
                c.nombre_colonia
            FROM usuarios u
            LEFT JOIN direcciones_clientes dc ON u.id_usuario = dc.id_usuario
            LEFT JOIN colonias c ON dc.id_colonia = c.id_colonia
            WHERE u.id_usuario = %s AND u.id_rol IN (3, 4)
        """
        #se pasa el id_usuario que viene en la url
        cursor.execute(sql_query, (id_usuario,))
        cliente = cursor.fetchone()

        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return cliente
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

#Actualizar la tarifa especial de un cliente
@app.put("/clientes/{id_usuario}/tarifa")
def actualizar_tarifa_cliente(id_usuario: int, datos: ActualizarTarifa):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")

    try:
        cursor = conexion.cursor()
        #Actualizar la tarifa del usuario especifico
        sql_query = """
            UPDATE usuarios
            SET tarifa_especial = %s
            WHERE id_usuario = %s AND id_rol IN (3, 4);
        """
        cursor.execute(sql_query, (datos.tarifa_especial, id_usuario))
        #Hacer commit para guardar los cambios (pq se hizo un update)
        conexion.commit()

        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Cliente no encontrado o la tarifa no fue modificada")
        return {"mensaje": "Tarifa actualizada correctamente"}

    except Error as e:
        conexion.rollback() #Hacer rollback por si hay un error, por seguridad y no echar a perder nada
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()
#------------------------ Fin apartado principal ----------------------------------

#------------------------ Apartado de logistica ----------------------------------
#Ver colonias ya registradas
#---Funcion get 
@app.get("/colonias")
def obtener_colonias():
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conextar con la base de datos")

    try:
        #Datos listos para JSON
        cursor = conexion.cursor(dictionary=True)
        sql_query = "SELECT id_colonia, nombre_colonia FROM colonias ORDER BY nombre_colonia ASC"
        cursor.execute(sql_query)
        colonias = cursor.fetchall()
        return colonias
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

#Agregar colonias (por si el negocio se expande y pueden repartir a colonias nuevas)
@app.post("/colonias")
def agregar_colonia(datos: NuevaColonia):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")
    
    try:
        cursor = conexion.cursor()
        #Agregar nueva colonia
        sql_query = """
            INSERT INTO colonias (nombre_colonia)
            VALUES (%s)
        """
        cursor.execute(sql_query, (datos.nombre_colonia,))
        conexion.commit()
        return {"mensaje": "Colonia registrada correctamente"}
    except Error as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

#Editar colonias
@app.put("/colonias/{id_colonia}")
def actualizar_colonia(id_colonia: int, datos: UpdateColonia):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")
    try:
        cursor = conexion.cursor()
        sql_query = "UPDATE colonias SET nombre_colonia = %s WHERE id_colonia = %s"
        cursor.execute(sql_query, (datos.nombre_colonia, id_colonia))
        conexion.commit()
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Colonia no encontrada")
        return {"mensaje": "Colonia actualizada correctamente"}
    except Error as e:
        conexion.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()


#Eliminar colonias
@app.delete("/colonias/{id_colonia}")
def eliminar_colonia(id_colonia: int):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")
    try:
        cursor = conexion.cursor()
        sql_query = "DELETE FROM colonias WHERE id_colonia = %s"
        cursor.execute(sql_query, (id_colonia,))
        conexion.commit()
        return {"mensaje": "Colonia eliminada"}
    except Exception as e:
        if conexion:
            conexion.rollback()
        mensaje_error = str(e)
        print(f"Error en el backend al borrar: {str(e)}")
        #Si sucede el error 1451 de llave foranea
        if "1451" in mensaje_error:
            raise HTTPException(status_code=400, detail="No puedes borrar esta colonia porque ya está asignada a la ruta de un repartidor o a un cliente. Contacta a Soporte")
        raise HTTPException(status_code=500, detail="Error interno del servidor al intentar borrar")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

#Dar de alta a repartidores
@app.post("/repartidores")
def crear_repartidor(datos: AltaRepartidor):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")
    try:
        cursor = conexion.cursor()
        #Hasheado de contraseña
        password_bytes = datos.telefono.encode('utf-8')
        salt = bcrypt.gensalt()
        password_hasheada = bcrypt.hashpw(password_bytes, salt).decode('utf-8')

        id_rol_repartidor = 2
        sql_query = """
            INSERT INTO usuarios
            (nombre, apellido_paterno, apellido_materno, telefono, password_hash, id_rol)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        #Todo empaquetado en la tupla en orden exacto
        valores = (
            datos.nombre,
            datos.apellido_paterno,
            datos.apellido_materno,
            datos.telefono,
            password_hasheada,
            id_rol_repartidor
        )

        cursor.execute(sql_query, valores)
        conexion.commit()

        return {"mensaje": "Repartidor registrado correctamente", "id": cursor.lastrowid}
    except Exception as e:
        if conexion:
            conexion.rollback()

        mensaje_error = str(e)
        print(f"Error en backend al crear el repartidor: {mensaje_error}")

        #Manejo del error 1062: telefono duplicado
        if "1062" in mensaje_error:
            raise HTTPException(status_code=400, detail="El número ya está registrado en el sistema")

        raise HTTPException(status_code=500, detail="Error interno del servidor al intentar guardar")

    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()

#Asignar rutas a repartidores
@app.post("/repartidores/{id_usuario}/rutas")
def guardar_rutas_repartidor(id_usuario: int, datos: AsignarRutas):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")

    try:
        cursor = conexion.cursor()
        #Borrar rutas que antes tenia el repartidor
        sql_delete = "DELETE FROM repartidores_rutas WHERE id_usuario_repartidor = %s"
        cursor.execute(sql_delete, (id_usuario,))

        #Si el arreglo trae colonias, se inserta una por una
        if len(datos.colonias) > 0:
            sql_query = """
                INSERT INTO repartidores_rutas
                (id_usuario_repartidor, id_colonia, estatus_disponibilidad)
                VALUES (%s, %s, 1)
            """
        valores = [(id_usuario, id_colonia) for id_colonia in datos.colonias]
        cursor.executemany(sql_query, valores)

        conexion.commit()
        return {"mensaje": "Rutas actualizadas correctamente"}
    except Exception as e:
        conexion.rollback()
        print(f"Error al asignar rutas: {e}")
        raise HTTPException(status_code=500, detail="Error interno al guardar las rutas")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()