import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Usuario } from 'src/app/Modelos/acceso/usuarios.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent {
  @Input() usuarioData: Usuario | null = null;
  @Output() onClose = new EventEmitter<void>();

  usuarioDetalle: Usuario | null = null;
  cargando = false;

  // Manejo de errores
  mostrarAlertaError = false;
  mensajeError = '';

  // Detectar cambios en el input
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['usuarioData'] && changes['usuarioData'].currentValue) {
      this.cargarDetallesSimulado(changes['usuarioData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Usuario): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.usuarioDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del usuario:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del usuario.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  // Cerrar el componente
  cerrar(): void {
    this.onClose.emit();
  }

  // Cerrar alerta de error
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  // Formatear fechas
  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Manejar error al cargar la imagen
  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/user-dummy-img.jpg';
  }
}
