import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
  IonContent, IonCard, IonCardHeader, IonCardTitle, 
  IonCardSubtitle, IonCardContent, IonBadge 
} from '@ionic/angular';

@Component({
  selector: 'app-inicio-cliente',
  templateUrl: './inicio-cliente.page.html',
  styleUrls: ['./inicio-cliente.page.scss'],
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, 
    IonContent, IonCard, IonCardHeader, IonCardTitle, 
    IonCardSubtitle, IonCardContent, IonBadge
  ]
})
export class InicioClientePage implements OnInit {
  misPedidos: any[] = [];

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    this.cargarMisPedidos();
  }

  ionViewWillEnter() {
    this.cargarMisPedidos();
  }

  cargarMisPedidos() {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/home']);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    // Petición al backend para traer solo los pedidos de este cliente
    this.http.get('http://127.0.0.1:8000/clientes/mis-pedidos', { headers }).subscribe({
      next: (datos: any) => {
        this.misPedidos = datos;
      },
      error: (err) => {
        console.error('Error al cargar mis pedidos:', err);
      }
    });
  }

  nuevoPedido() {
    // Por ahora solo es un aviso pq luego se programa
    alert('Próximamente: Pantalla para elegir cantidad y método de pago.');
  }

  // Colores del estatus
  getColorEstatus(estatus: string): string {
    switch (estatus) {
      case 'Pendiente': return 'warning';
      case 'En camino': return 'primary';
      case 'Entregado': return 'success';
      default: return 'medium';
    }
  }

  cerrarSesion() {
    localStorage.removeItem('token');
    this.router.navigate(['/home']);
  }
}