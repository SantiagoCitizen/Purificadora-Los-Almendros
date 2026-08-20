from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import bcrypt
from database import db_conexion

router = APIRouter(
    prefix="/repartidores",
    tags=["Gestion de Repartidores"]
)

#Clases BaseModel
class AltaRepartidor(BaseModel):
    nombre: str
    apellido_paterno: str
    apellido_materno: Optional[str] = None #Puede ser nulo
    telefono: str

class BajaRepartidor(BaseModel):
    id_reemplazo: Optional[int] = None

class AsignarRutas(BaseModel):
    colonias: List[int]
#---------------------Panel Principal----------------------
#Ver repartidores (Tambien se ocupa en el panel de logistica)
@router.get("/")
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
                COALESCE(GROUP_CONCAT(DISTINCT c.nombre_colonia SEPARATOR ', '), 'Sin ruta asignada') AS ruta
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

#---------------------Panel de Logistica-------------------

#Dar de alta a repartidores
@router.post("/")
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

#Asignarle ruta al repartidor
@router.post("/{id_usuario}/rutas")
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

#Dar de baja a repartidor (Con traspaso de ruta)
@router.put("/{id_usuario}/baja")
def baja_repartidor(id_usuario: int, datos: BajaRepartidor):
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la base de datos")

    try:
        cursor = conexion.cursor()
        #Baja al repartidor
        sql_query = """
            UPDATE usuarios
            SET estatus_contrato = 0, en_turno = 0
            WHERE id_usuario = %s AND id_rol = 2
        """

        cursor.execute(sql_query, (id_usuario,))

        #Traspaso de ruta a otro repartidor
        if datos.id_reemplazo:
            #Evitar duplicados
            #Obtener las colonias que tiene el repartidor a dar de baja
            cursor.execute("SELECT id_colonia FROM repartidores_rutas WHERE id_usuario_repartidor = %s", (id_usuario,))
            colonias_despedido = [fila[0] for fila in cursor.fetchall()]
            #Filtrar y sacar las colonias que no tiene el repartidor a traspasar

            #Insertar las colonias que no tiene
            if colonias_despedido:
                #Obtener las colonias que ya tiene el repartidor que será el reemplazo
                cursor.execute("SELECT id_colonia FROM repartidores_rutas WHERE id_usuario_repartidor = %s", (datos.id_reemplazo,))
                colonias_reemplazo = [fila[0] for fila in cursor.fetchall()]


                colonias_traspaso = [c for c in colonias_despedido if c not in colonias_reemplazo]
                if colonias_traspaso:
                    insert = """
                        INSERT INTO repartidores_rutas (id_usuario_repartidor, id_colonia, estatus_disponibilidad)
                        VALUES (%s, %s, 1)
                    """
                    valores = [(datos.id_reemplazo, c) for c in colonias_traspaso]
                    cursor.executemany(insert, valores)
            #Limpiar 
        cursor.execute("DELETE FROM repartidores_rutas WHERE id_usuario_repartidor = %s", (id_usuario,))
        conexion.commit()
        return {"mensaje": "Repartidor dado de baja y rutas actualizadas"}

    except Exception as e:
        conexion.rollback()
        print(f"Error al dar de baja: {e}")
        raise HTTPException(status_code=500, detail="Error interno al procesar la baja del repartidor")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if conexion and conexion.is_connected():
            conexion.close()