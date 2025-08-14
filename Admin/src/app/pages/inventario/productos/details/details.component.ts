import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto } from 'src/app/Modelos/inventario/Producto.Model';
import { HttpClient } from '@angular/common/http';

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productoData'] && changes['productoData'].currentValue) {
      this.cargarDetallesSimulado(changes['productoData'].currentValue);
    }
  }

  constructor(private http: HttpClient) {}

  // Simulación de carga
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

  obtenerVendedoresPorCliente(clie_Id: number): void {
  this.http.get<any[]>(`URL_DEL_ENDPOINT/VendedoresPorCliente/${clie_Id}`)
    .subscribe({
      next: (data) => {
        this.vendedores = data;
      },
      error: (err) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los vendedores.';
      }
    });
}

  //Extra
  vendedores: any[] = [];
}
