from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import db_conexion
from mysql.connector import Error

router = APIRouter(
    prefix="/clientes",
    tags=["Gestion de Clientes"]
)

#Clases BaseModel
class ActualizarTarifa(BaseModel):
    tarifa_especial: float

#------Panel Principal------
#Obtener clientes
@router.get("/")
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
                IFNULL(tarifa_especial, (SELECT precio_garrafon FROM configuracion WHERE id = 1)) AS tarifa
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

#Boton "Ver" en dashboard principal de cliente
@router.get("/{id_usuario}")
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
                IFNULL(u.tarifa_especial, (SELECT precio_garrafon FROM configuracion WHERE id = 1)) AS tarifa_especial,
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
@router.put("/{id_usuario}/tarifa")
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