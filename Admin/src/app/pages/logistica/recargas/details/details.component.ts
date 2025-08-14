import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Recargas } from 'src/app/Modelos/logistica/Recargas.Model';

interface ProductosRecarga {
  prod_Codigo: string;
  prod_DescripcionCorta: string;
  reDe_Cantidad: number;
  prod_Id?: number;
  reDe_Observaciones?: string;
}

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnChanges {
  @Input() recargaData: Recargas | null = null;
  @Output() onClose = new EventEmitter<void>();

  recargaDetalle: any = null;
  cargando = false;
  mostrarAlertaError = false;
  mensajeError = '';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['recargaData'] && changes['recargaData'].currentValue) {
      this.cargarDetallesSimulado(changes['recargaData'].currentValue);
    }
  }

  // MÉTODO ACTUALIZADO PARA PROCESAR XML
  cargarDetallesSimulado(data: Recargas): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        // Crear copia de los datos
        this.recargaDetalle = { ...data };
        
        // PROCESAR XML DE PRODUCTOS
        if (data.detalleProductos) {
          console.log('XML recibido:', data.detalleProductos);
          this.recargaDetalle.productos = this.parsearXMLProductos(data.detalleProductos);
          console.log('Productos parseados:', this.recargaDetalle.productos);
        } else {
          this.recargaDetalle.productos = [];
        }
        
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la recarga:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la recarga.';
        this.cargando = false;
      }
    }, 500);
  }

  // MÉTODO NUEVO - PARSEAR XML DE PRODUCTOS
  private parsearXMLProductos(xmlString: string): ProductosRecarga[] {
    if (!xmlString) {
      return [];
    }

    try {
      // Crear parser XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      
      // Verificar errores de parsing
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        console.error('Error parsing XML:', parseError.textContent);
        return [];
      }

      // Extraer productos del XML
      const productos: ProductosRecarga[] = [];
      const productosNodes = xmlDoc.querySelectorAll('Producto');
      
      productosNodes.forEach(productoNode => {
        const producto: ProductosRecarga = {
          prod_Codigo: productoNode.getAttribute('Codigo') || '',
          prod_DescripcionCorta: productoNode.getAttribute('Descripcion') || '',
          reDe_Cantidad: parseInt(productoNode.getAttribute('Cantidad') || '0'),
          prod_Id: parseInt(productoNode.getAttribute('ProdId') || '0')
        };
        
        productos.push(producto);
      });

      return productos;
      
    } catch (error) {
      console.error('Error al parsear XML de productos:', error);
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error al procesar la información de productos.';
      return [];
    }
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

  // Métodos para el resumen de productos
  getTotalTiposProductos(): number {
    return this.recargaDetalle?.productos?.length || 0;
  }

  getTotalProductos(): number {
    if (!this.recargaDetalle?.productos) return 0;
    return this.recargaDetalle.productos.reduce((total: number, producto: ProductosRecarga) => {
      return total + (producto.reDe_Cantidad || 0);
    }, 0);
  }

  trackByProducto(index: number, producto: ProductosRecarga): any {
    return producto.prod_Id || producto.prod_Codigo || index;
  }

  // Método para obtener el estado de confirmación legible
  getEstadoConfirmacion(): string {
    if (!this.recargaDetalle?.reca_Confirmacion) return 'N/A';
    
    switch (this.recargaDetalle.reca_Confirmacion.toUpperCase()) {
      case 'A': return 'Aprobada';
      case 'R': return 'Rechazada';
      case 'P': return 'Pendiente';
      case 'C': return 'Confirmada';
      default: return this.recargaDetalle.reca_Confirmacion;
    }
  }

  // Método para obtener la clase CSS del estado
  getEstadoClase(): string {
    if (!this.recargaDetalle?.reca_Confirmacion) return 'bg-secondary';
    
    switch (this.recargaDetalle.reca_Confirmacion.toUpperCase()) {
      case 'A': return 'bg-success';
      case 'R': return 'bg-danger';
      case 'P': return 'bg-warning';
      case 'C': return 'bg-success';
      default: return 'bg-secondary';
    }
  }

  // MÉTODOS AUXILIARES PARA DEBUG (OPCIONALES)
  mostrarXMLOriginal(): void {
    if (this.recargaData?.detalleProductos) {
      console.log('XML Original:', this.recargaData.detalleProductos);
      alert('Revisa la consola para ver el XML original');
    }
  }

  // Método para obtener información adicional de la recarga
  getInfoAdicional(): any {
    return {
      totalProductos: this.getTotalProductos(),
      tiposProductos: this.getTotalTiposProductos(),
      estado: this.getEstadoConfirmacion(),
      tieneObservaciones: !!this.recargaDetalle?.reca_Observaciones
    };
  }
}