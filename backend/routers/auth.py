from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from mysql.connector import Error
import bcrypt
import jwt
from datetime import datetime, timedelta
import os
from database import db_conexion

router = APIRouter(
    tags=["Autenticacion"]
)

#Clase BaseModel
class DatosLogin(BaseModel):
    telefono: str
    password: str

#Login
@router.post("/login")
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