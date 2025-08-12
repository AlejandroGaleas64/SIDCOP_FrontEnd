import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class DetailsComponent implements OnChanges {
  @Input() PedidoData: Pedido | null = null;
  @Output() onClose = new EventEmitter<void>();

  PedidoDetalle: Pedido | null = null;
  productos: any[] = [];
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';
  referenciasLista = [];
  clientesLista = [];
  referenciasNombre: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['PedidoData'] && changes['PedidoData'].currentValue) {
      this.cargarDetallesSimulado(changes['PedidoData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Pedido): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.PedidoDetalle = { ...data };
        this.productos = JSON.parse(this.PedidoDetalle.detallesJson ?? '[]');
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del pedido.';
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
