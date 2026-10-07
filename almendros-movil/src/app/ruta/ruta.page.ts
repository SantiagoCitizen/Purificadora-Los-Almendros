import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router'; 
import { HttpClient, HttpHeaders } from '@angular/common/http'; 
import { environment } from '../../environments/environment'; 

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
    IonCardContent,
    IonBadge
  ]
})
export class RutaPage implements OnInit, OnDestroy {
  pedidos: any[] = [];
  
  // Variables para el auto-actualizado y detección de pedidos nuevos
  private intervaloPolling: any;
  private idsConocidos: Set<number> = new Set();
  private primeraCarga: boolean = true;

  constructor(
    private http: HttpClient, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.cargarRutaDelDia();
    this.iniciarAutoActualizacion(); // Garantiza que el reloj arranque aunque recargues con F5
  }

  // Se activa cada vez que el repartidor entra a la pantalla
  ionViewWillEnter() {
    this.cargarRutaDelDia();
    this.iniciarAutoActualizacion();
  }

  // Se apaga al ir a Ajustes o Salir para no gastar recursos
  ionViewWillLeave() {
    this.detenerAutoActualizacion();
  }

  ngOnDestroy() {
    this.detenerAutoActualizacion();
  }

  iniciarAutoActualizacion() {
    this.detenerAutoActualizacion();
    // Consulta silenciosamente cada 10 segundos (10000 ms)
    this.intervaloPolling = setInterval(() => {
      this.cargarRutaDelDia(true);
    }, 10000);
  }

  detenerAutoActualizacion() {
    if (this.intervaloPolling) {
      clearInterval(this.intervaloPolling);
      this.intervaloPolling = null;
    }
  }

  cargarRutaDelDia(esRevisionAutomatica: boolean = false) {
    const token = localStorage.getItem('token');

    if (!token) {
      this.detenerAutoActualizacion();
      if (!esRevisionAutomatica) {
        alert('Tu sesión expiró. Vuelve a iniciar sesión.');
      }
      this.router.navigate(['/home']);
      return;
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    this.http.get(`${environment.apiUrl}/repartidores/entregas`, { headers }).subscribe({
      next: (datos: any) => {
        const listaRecibida = Array.isArray(datos) ? datos : [];

        // Verificar si llegó algún pedido cuyo ID no tenía registrado
        const hayPedidoNuevo = listaRecibida.some(
          (p: any) => !this.idsConocidos.has(p.id_pedido)
        );

        // Si no es la primera vez que abre la pantalla y hay un ID nuevo, suena la alerta
        if (!this.primeraCarga && hayPedidoNuevo) {
          console.log('🔔 ¡Nuevo pedido detectado! Reproduciendo alerta...');
          this.reproducirSonidoAlerta();
        }

        // Actualiza el registro de IDs conocidos
        this.idsConocidos = new Set(listaRecibida.map((p: any) => p.id_pedido));
        this.primeraCarga = false;

        this.pedidos = listaRecibida;
        console.log('🔄 Revisión de pedidos (cada 10s):', this.pedidos);
        this.cdr.detectChanges(); 
      },
      error: (err) => {
        console.error('Error al cargar la ruta:', err);
        if (!esRevisionAutomatica) {
          alert('No se pudo cargar la ruta del día.');
        }
      }
    });
  }

  // Genera un timbre doble tipo "Ding-Dong" sin requerir archivos externos
  reproducirSonidoAlerta() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();

      // Primer tono (Ding)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // Nota Re (D5)
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Segundo tono más agudo (Dong)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.18); // Nota La (A5)
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.18);
      osc2.stop(ctx.currentTime + 0.65);
    } catch (e) {
      console.warn('El navegador bloqueó el audio automático:', e);
    }
  }

  actualizarEstatus(id_pedido: number, nuevoEstatus: string) {
    const token = localStorage.getItem('token');
    
    if (!token) return;

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    const body = { estatus: nuevoEstatus };

    this.http.put(`${environment.apiUrl}/repartidores/entregas/${id_pedido}/estatus`, body, { headers })
      .subscribe({
        next: () => {
          // Recargam la lista para actualizar los botones en la interfaz
          this.cargarRutaDelDia(true);
        },
        error: (error) => {
          // Si FastAPI devuelve un error 400 (el candado se activó), lo mostramos en un alert
          if (error.status === 400 && error.error && error.error.detail) {
            alert(error.error.detail);
          } else {
            console.error('Fallo al actualizar el estatus:', error);
            alert('Ocurrió un error al actualizar el pedido.');
          }
        }
      });
  }

  irAAjustes() {
    this.router.navigate(['/ajustes']);
  }

  cerrarSesion() {
    this.detenerAutoActualizacion();
    localStorage.removeItem('token');
    this.pedidos = [];
    this.idsConocidos.clear();
    this.primeraCarga = true;
    this.router.navigate(['/home']);
  }
}