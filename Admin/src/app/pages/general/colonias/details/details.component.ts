import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Colonias } from 'src/app/Modelos/general/Colonias.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  constructor(private cdr: ChangeDetectorRef) {}

  @Input() coloniaData: Colonias | null = null;
  @Output() onClose = new EventEmitter<void>();

  coloniaDetalle: Colonias | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';


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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coloniaData'] && changes['coloniaData'].currentValue) {
      this.cargarDetallesSimulado(changes['coloniaData'].currentValue);
    }
  }

  
  cargarDetallesSimulado(data: Colonias): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.coloniaDetalle = { ...data };
        this.cargando = false;
        //console.log('DetailsComponent -> cargando:', this.cargando, 'coloniaDetalle:', this.coloniaDetalle);
        this.cdr.detectChanges(); // Forzar actualización del template
      } catch (error) {
        //console.error('Error al cargar detalles de la colonia:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la colonia.';
        this.cargando = false;
      }
    }, 500);
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }
}
