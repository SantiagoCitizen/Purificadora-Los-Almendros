import mysql.connector
import os
from dotenv import load_dotenv, find_dotenv #Importar lector de variables de entorno
from mysql.connector import Error

#Cargamos las variables de entorno
load_dotenv(find_dotenv())

def test_conexion():
    try:
        #Todas las credenciales que ocupa la conexion a la bd
        conexion = mysql.connector.connect(
            host = os.getenv("DB_HOST"),
            user = os.getenv("DB_USER"),
            password = os.getenv("DB_PASSWORD"),
            database = os.getenv("DB_NAME")
        )

        if conexion.is_connected():
            print("Conectado correctamente a la B.D 'Almendros'")

            #Crear un cursor para ejecutar consultas
            #El cursor es un mensajero que viaja por la conexion para buscar datos en la bd
            cursor = conexion.cursor()

            #Consulta select (Se puede cambiar el nombre de la tabla por el de otra)
            #Execute es la orden directa que le daremos al mensajero (cursor)
            #Literalmente la consulta SQL exacta que va a ejecutarse
            cursor.execute("SELECT * FROM colonias;")

            #fetchall es "traer todo", le ordena al cursor empacar todas las filas que encontro MySQL dentro de la variable
            #resultados
            resultados = cursor.fetchall()

            print("\n--- TABLA ---")
            for fila in resultados:
                print(fila)

            print("--------------------\n")
            print("Funcionando al 100%")

    except Error as e:
        print(f"\n Error de conexion: {e}")
        print("Revisar que el servidor SQL este encendido y que el usuario/contraseña sean correctos \n")

    finally:
        #Cerrar conexion por limpieza y seguridad
        if 'conexion' in locals() and conexion.is_connected():
            cursor.close()
            conexion.close()
            print("Conexion terminada")

if __name__ == '__main__':
    test_conexion()