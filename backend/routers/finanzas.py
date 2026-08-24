from fastapi import APIRouter, HTTPException
from database import db_conexion
from mysql.connector import Error
import datetime 

router = APIRouter(prefix="/finanzas", tags=["Finanzas"])

#Tarjetas KPIs
@router.get("/kpis")
def get_kpis_hoy():

    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la bd")

    try:
        cursor = conexion.cursor(dictionary=True)
        #Una sola consulta que traiga todos los datos de una
        sql_query = """
            SELECT
            (SELECT COUNT(*) FROM pedidos WHERE tipo_pago = 'Transferencia' AND pago_confirmado = 0) AS transferencias_pendientes,
            (SELECT COUNT(*) FROM pedidos WHERE (estatus_entrega != 'Entregado' OR notas_campo IS NOT NULL) AND DATE(fecha_hora_creacion) = CURDATE()) AS alertas,
            (SELECT COALESCE(SUM(monto_total), 0) FROM pedidos WHERE DATE(fecha_hora_creacion) = CURDATE()) AS ventas_totales,
            (SELECT COALESCE(SUM(cantidad_garrafones), 0) FROM pedidos WHERE DATE(fecha_hora_creacion) = CURDATE()) AS garrafones_totales;
        """

        cursor.execute(sql_query)
        kpis = cursor.fetchone()
        return kpis
    except Error as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conexion.close()

#Transferencias por validar
@router.get("/transferencias-pendientes")
def get_transferencias():

    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la bd")

    try:
        cursor = conexion.cursor(dictionary=True)
        #Se agrupa por separtidor y se suma el efectivo y transferencias del dia
        sql_query = """
            SELECT 
                p.id_pedido, 
                CONCAT(u.nombre, ' ', COALESCE(u.apellido_paterno, '')) AS cliente, 
                p.monto_total, 
                p.comprobante_url, 
                DATE_FORMAT(p.fecha_hora_creacion, '%H:%i hrs') AS hora_solicitud
            FROM pedidos p
            JOIN usuarios u ON p.id_cliente = u.id_usuario
            WHERE p.tipo_pago = 'Transferencia' AND p.pago_confirmado = 0
            ORDER BY p.fecha_hora_creacion DESC;
        """
        cursor.execute(sql_query)
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conexion.close()

#Resumen de venta por repartidor
@router.get("/conciliacion-hoy")
def get_conciliacion_repartidores():

    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la bd")

    try:
        cursor = conexion.cursor(dictionary=True)

        #Agrupar por repartidor, sumar efectivo y transferencias
        sql_query = """
            SELECT 
                u.id_usuario AS id_repartidor,
                CONCAT(u.nombre, ' ', COALESCE(u.apellido_paterno, '')) AS repartidor,
                COALESCE(SUM(CASE WHEN p.tipo_pago = 'Efectivo' THEN p.monto_total ELSE 0 END), 0) AS efectivo_esperado,
                COALESCE(SUM(CASE WHEN p.tipo_pago = 'Transferencia' THEN p.monto_total ELSE 0 END), 0) AS transferencias_totales,
                COALESCE(SUM(CASE WHEN p.tipo_pago = 'Transferencia' AND p.pago_confirmado = 1 THEN p.monto_total ELSE 0 END), 0) AS transferencias_validadas,
                SUM(CASE WHEN p.estatus_entrega != 'Entregado' OR p.notas_campo IS NOT NULL THEN 1 ELSE 0 END) AS incidencias
            FROM pedidos p
            JOIN usuarios u ON p.id_repartidor_asignado = u.id_usuario
            WHERE DATE(p.fecha_hora_creacion) = CURDATE()
            GROUP BY u.id_usuario;
        """
        cursor.execute(sql_query)
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conexion.close()

#Notas de campo
@router.get("/incidencias-hoy")
def get_incidencias():
    conexion = db_conexion()
    if conexion is None:
        raise HTTPException(status_code=500, detail="Error al conectar con la bd")
    try:
        cursor = conexion.cursor(dictionary=True)
        sql_query = """
            SELECT 
                p.id_pedido, 
                CONCAT(u.nombre, ' ', COALESCE(u.apellido_paterno, '')) AS repartidor, 
                p.estatus_entrega, 
                p.notas_campo 
            FROM pedidos p
            JOIN usuarios u ON p.id_repartidor_asignado = u.id_usuario
            WHERE DATE(p.fecha_hora_creacion) = CURDATE() 
            AND (p.estatus_entrega != 'Entregado' OR p.notas_campo IS NOT NULL)
            ORDER BY p.fecha_hora_creacion DESC;
        """
        cursor.execute(sql_query)
        return cursor.fetchall()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conexion.close()