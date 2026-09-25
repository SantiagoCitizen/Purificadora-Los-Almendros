import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';

// Importar las piezas a usar
import { 
  IonContent, 
  IonCard, 
  IonCardContent, 
  IonList, 
  IonItem, 
  IonInput, 
  IonButton 
} from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    IonContent, 
    IonCard, 
    IonCardContent, 
    IonList, 
    IonItem, 
    IonInput, 
    IonButton
  ],
})
export class HomePage {
  telefono = '';
  password = '';

  constructor(private http: HttpClient, private router: Router) {}

  iniciarSesion() {
    if (!this.telefono || !this.password) {
      alert('Ingresa tu teléfono y contraseña');
      return;
    }

    // Se arma un JSON simple. 
    const payload = {
      telefono: this.telefono, 
      password: this.password
    };

    // Configuracion de los headers para enviar JSON
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Petición a la ruta exacta
    this.http.post('http://127.0.0.1:8000/login', payload, { headers }).subscribe({
      next: (res: any) => {
        // 1. Se guarda el token en la memoria del dispositivo
        localStorage.setItem('token', res.token);
        
        //console.log('Sesión guardada:', res);
        
        // 2. Pantalla de ruta
        this.router.navigate(['/ruta']);
      },
      error: (err) => {
        alert(`Error ${err.status}: Revisa la consola para más detalles`);
        console.error('Detalles del error:', err);
      }
    });
  }
}