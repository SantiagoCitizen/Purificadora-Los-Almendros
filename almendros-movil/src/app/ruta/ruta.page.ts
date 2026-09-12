import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http'; // <-- Importamos herramientas HTTP

import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonButtons, 
  IonButton, 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle, 
  IonCardContent 
} from '@ionic/angular';

@Component({
  selector: 'app-ruta',
  templateUrl: './ruta.page.html',
  styleUrls: ['./ruta.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterLink, 
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonButtons, 
    IonButton, 
    IonContent, 
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardSubtitle, 
    IonCardContent
  ]
})
export class RutaPage implements OnInit {
  // Aquí guardaremos la lista de clientes que nos mande Python
  entregas: any[] = [];

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.cargarRutaDelDia();
  }

  cargarRutaDelDia() {
    // 1. Sacamos el token de la memoria
    const token = localStorage.getItem('token_repartidor');

    if (!token) {
      alert('Tu sesión expiró. Vuelve a iniciar sesión.');
      this.router.navigate(['/home']);
      return;
    }

    // 2. Armamos el encabezado de autorización "Bearer"
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // 3. Hacemos la petición (⚠️ CAMBIA '/entregas' POR TU RUTA REAL DE FASTAPI)
    this.http.get('http://127.0.0.1:8000/entregas', { headers }).subscribe({
      next: (datos: any) => {
        this.entregas = datos; // Guardamos el JSON en nuestra variable
        console.log('Datos recibidos:', this.entregas);
      },
      error: (err) => {
        console.error('Error al cargar la ruta:', err);
        alert('No se pudo cargar la ruta del día.');
      }
    });
  }
}