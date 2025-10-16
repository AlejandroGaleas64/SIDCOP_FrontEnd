import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
// import { NgbPaginationModule } from '@ng-bootstrap/ng-bootstrap';

// Define structured types
type Cliente = {
  codigo: string;
  nombre: string;
  negocio: string;
  canal?: string;
};

type Canal = {
  nombre: string;
  clientes: Cliente[];
  clientesFiltrados: Cliente[];
  filterText: string;
  currentPage: number;
};

type ListaDetalle = {
  descripcion: string;
  usuarioCreacion: string;
  fechaCreacion: Date;
  usuarioModificacion?: string;
  fechaModificacion?: Date;
  clientes: Cliente[];
};

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss']
})
export class DetailsComponent implements OnChanges {
  @Input() listaData: ListaDetalle | null = null;
  @Output() onClose = new EventEmitter<void>();

  descuentoDetalle: ListaDetalle | null = null;
  cargando = false;
  filterText = '';
  showByCanal = false;
  currentPage = 1;
  itemsPerPage = 10;
  mostrarAlertaError = false;
  mensajeError = '';

  // Typed arrays
  clientesData: Cliente[] = [];
  canales: Canal[] = [];
  clientesFiltrados: Cliente[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listaData']?.currentValue) {
      this.cargarDetalles(changes['listaData'].currentValue);
    }
  }

  cargarDetalles(data: ListaDetalle): void {
    this.cargando = true;
    setTimeout(() => {
      try {
        this.descuentoDetalle = { ...data };
        
        // Process clients data
        this.clientesData = Array.isArray(data.clientes) ? [...data.clientes] : [];
        this.clientesFiltrados = [...this.clientesData];
        
        // Group by canal
        const canalesUnicos = [...new Set(this.clientesData.map(c => c.canal || 'Sin Canal'))];
        this.canales = canalesUnicos.map(canalNombre => ({
          nombre: canalNombre,
          clientes: this.clientesData.filter(c => (c.canal || 'Sin Canal') === canalNombre),
          clientesFiltrados: this.clientesData.filter(c => (c.canal || 'Sin Canal') === canalNombre),
          filterText: '',
          currentPage: 1
        }));

        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles.';
        this.cargando = false;
      }
    }, 500);
  }

  filtrarClientes(): void {
    if (this.showByCanal) {
      this.canales.forEach(canal => {
        canal.clientesFiltrados = canal.clientes.filter((cliente: Cliente) => 
          this.coincideTexto(cliente, canal.filterText)
        );
      });
    } else {
      this.clientesFiltrados = this.clientesData.filter(cliente => 
        this.coincideTexto(cliente, this.filterText)
      );
    }
  }

  private coincideTexto(cliente: Cliente, texto: string): boolean {
    const searchText = texto.toLowerCase();
    return (
      String(cliente.nombre || '').toLowerCase().includes(searchText) ||
      String(cliente.codigo || '').toLowerCase().includes(searchText) ||
      String(cliente.negocio || '').toLowerCase().includes(searchText)
    );
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