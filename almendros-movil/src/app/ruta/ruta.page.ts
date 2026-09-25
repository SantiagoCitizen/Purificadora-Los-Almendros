import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http'; 

import { 
  IonButton, 
  IonContent, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle, 
  IonCardContent,
  IonBadge
} from '@ionic/angular';

@Component({
  selector: 'app-ruta',
  templateUrl: './ruta.page.html',
  styleUrls: ['./ruta.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonButton, 
    IonContent, 
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardSubtitle, 
    IonCardContent,
    IonBadge
  ]
})
export class RutaPage implements OnInit {
  pedidos: any[] = [];

  constructor(
    private http: HttpClient, 
    private router: Router,
    private cdr: ChangeDetectorRef // <-- Fuerza el repintado de la pantalla
  ) { }

  ngOnInit() {
    this.cargarRutaDelDia();
  }

  // Se ejecuta cada vez que Ionic entra a esta vista desde el Login
  ionViewWillEnter() {
    this.cargarRutaDelDia();
  }

  cargarRutaDelDia() {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('Tu sesión expiró. Vuelve a iniciar sesión.');
      this.router.navigate(['/home']);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get('http://127.0.0.1:8000/repartidores/entregas', { headers }).subscribe({
      next: (datos: any) => {
        // Asegura que sea un arreglo válido y obligamos a Angular a pintar el HTML
        this.pedidos = Array.isArray(datos) ? datos : [];
        console.log('Datos recibidos:', this.pedidos);
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al cargar la ruta:', err);
        alert('No se pudo cargar la ruta del día.');
      }
    });
  }

  confirmarEntrega(id_pedido: number) {
    const token = localStorage.getItem('token');
    
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.put(`http://127.0.0.1:8000/repartidores/entregas/${id_pedido}/entregado`, {}, { headers })
      .subscribe({
        next: () => {
          this.cargarRutaDelDia();
        },
        error: (error) => {
          console.error('Fallo al confirmar la entrega:', error);
        }
      });
  }
}