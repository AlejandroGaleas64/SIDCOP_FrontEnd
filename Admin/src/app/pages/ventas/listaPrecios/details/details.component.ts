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

  /**
   * Ciclo de vida de Angular: detecta cambios en inputs del componente.
   * Cuando cambia "listaData", recarga los detalles.
   * @param changes Objeto con los cambios detectados.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['listaData']?.currentValue) {
      this.cargarDetalles(changes['listaData'].currentValue);
    }
  }

  /**
   * Carga los detalles de la lista en el estado del componente incluyendo
   * agrupación de clientes por canal y colecciones filtrables.
   * @param data Objeto de lista con metadatos y clientes.
   */
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

  /**
   * Aplica filtros de búsqueda a nivel global o por canal según la vista activa.
   */
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

  /**
   * Determina si un cliente coincide con un texto de búsqueda.
   * @param cliente Cliente evaluado.
   * @param texto Texto de búsqueda.
   * @returns true si coincide en nombre, código o negocio; de lo contrario false.
   */
  private coincideTexto(cliente: Cliente, texto: string): boolean {
    const searchText = texto.toLowerCase();
    return (
      String(cliente.nombre || '').toLowerCase().includes(searchText) ||
      String(cliente.codigo || '').toLowerCase().includes(searchText) ||
      String(cliente.negocio || '').toLowerCase().includes(searchText)
    );
  }

  /**
   * Emite el evento de cierre del componente de detalles hacia el padre.
   */
  cerrar(): void {
    this.onClose.emit();
  }

  /**
   * Oculta la alerta de error y limpia su mensaje.
   */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Formatea una fecha recibida como string o Date al locale 'es-HN'.
   * @param fecha Fecha a formatear.
   * @returns Cadena formateada o 'N/A' si es inválida.
   */
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