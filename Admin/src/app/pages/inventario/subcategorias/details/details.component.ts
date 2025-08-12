import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subcategoria } from 'src/app/Modelos/inventario/SubcategoriaModel';


@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() subcategoriaData: Subcategoria | null = null;
  @Output() onClose = new EventEmitter<void>();

  subcategoriaDetalle: Subcategoria | null = null;
  cargando = false;  

  mostrarAlertaError = false;
  mensajeError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subcategoriaData'] && changes['subcategoriaData'].currentValue) {
      this.cargarDetallesSimulado(changes['subcategoriaData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Subcategoria): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.subcategoriaDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la subcategoria:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la subcategoria.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

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
}
