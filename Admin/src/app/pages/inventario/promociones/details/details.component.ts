import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto } from 'src/app/Modelos/inventario/Producto.Model';

/**
 * Componente para visualizar detalles de promociones en modo solo lectura.
 * Parsea y muestra información de productos y clientes asociados a la promoción.
 */
@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges{
  @Input() productoData: Producto | null = null;
  @Output() onClose = new EventEmitter<void>();

  productoDetalle: Producto | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  productosPromocion: any[] = [];

  clientesPromocion: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productoData'] && changes['productoData'].currentValue) {
      this.cargarDetallesSimulado(changes['productoData'].currentValue);

      const productosRaw = changes['productoData'].currentValue.productos ?? '[]';
      try {
        let productosJson = productosRaw;
        if (typeof productosJson === 'string') {
          productosJson = productosJson.trim();
          if (productosJson.startsWith('"') && productosJson.endsWith('"')) {
            productosJson = productosJson.slice(1, -1);
          }
          productosJson = productosJson.replace(/\\"/g, '"');
        }
        this.productosPromocion = JSON.parse(productosJson);
      } catch {
        this.productosPromocion = [];
      }

      const clientesRaw = changes['productoData'].currentValue.clientes ?? '[]';
      try {
        let clientesJson = clientesRaw;
        if (typeof clientesJson === 'string') {
          clientesJson = clientesJson.trim();
          if (clientesJson.startsWith('"') && clientesJson.endsWith('"')) {
            clientesJson = clientesJson.slice(1, -1);
          }
          clientesJson = clientesJson.replace(/\\"/g, '"');
        }
        this.clientesPromocion = JSON.parse(clientesJson);
      } catch {
        this.clientesPromocion = [];
      }
    }
  }

  cargarDetallesSimulado(data: Producto): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.productoDetalle = { ...data };
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del producto:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del producto.';
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
