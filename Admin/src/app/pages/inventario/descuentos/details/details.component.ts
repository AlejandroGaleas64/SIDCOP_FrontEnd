import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Descuento } from 'src/app/Modelos/inventario/DescuentoModel';

/**
 * Componente para mostrar los detalles completos de un descuento.
 * Presenta información general, items aplicables, clientes asignados y escalas de descuento.
 */
@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() descuentoData: Descuento | null = null;
  @Output() onClose = new EventEmitter<void>();

  descuentoDetalle: Descuento | null = null;
  cargando = false;
  mostrarAlertaError = false;
  mensajeError = '';
  referenciasLista = [];
  clientesLista = [];
  referenciasNombre: any[] = [];
  ClientesNombre: any[] = [];
  escalasParsed: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['descuentoData'] && changes['descuentoData'].currentValue) {
      this.cargarDetallesSimulado(changes['descuentoData'].currentValue);
    }
  }

  /** Carga y procesa los detalles del descuento */
  cargarDetallesSimulado(data: Descuento): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.descuentoDetalle = { ...data };
        this.cargando = false;
        this.referenciasLista = JSON.parse(this.descuentoDetalle.referencias ?? '[]');
        this.clientesLista = JSON.parse(this.descuentoDetalle.clientes ?? '[]');
        this.referenciasNombre = this.referenciasLista.map((r: any) => r.nombre);
        this.ClientesNombre = this.clientesLista.map((r: any) => r.nombre);
        if (typeof this.descuentoDetalle.escalas === 'string') {
          this.escalasParsed = JSON.parse(this.descuentoDetalle.escalas);
        }
      } catch (error) {
        console.error('Error al cargar detalles del descuento:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del descuento.';
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
