import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';

@Pipe({
  name: 'diasSemana',
  standalone: true
})
export class DiasSemanaPipe implements PipeTransform {
  private dias: { [key: string]: string } = {
    '1': 'Lunes',
    '2': 'Martes',
    '3': 'Miércoles',
    '4': 'Jueves',
    '5': 'Viernes',
    '6': 'Sábado',
    '7': 'Domingo'
  };

  transform(value: string | null | undefined): string {
    if (!value) return '';
    return value.split(',')
      .map(v => this.dias[v.trim()] || v.trim())
      .join(', ');
  }
}

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, DiasSemanaPipe],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() visitaData: any[] = [];
  @Output() onClose = new EventEmitter<void>();

  cargando = false;
  mostrarAlertaError = false;
  mensajeError = '';
  showDetailsForm = false;
  activeActionRow: number | null = null;
  visitasDetalle: any[] = [];

  // Propiedades para el carrusel
  imagenesVisita: { [visitaId: string]: any[] } = {};
  currentSlideIndex: { [visitaId: string]: number } = {};
  cargandoImagenes: { [visitaId: string]: boolean } = {};

  constructor(private http: HttpClient) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visitaData'] && changes['visitaData'].currentValue) {
      this.cargarDetallesSimulado(changes['visitaData'].currentValue);
    }
  }

  cargarDetallesSimulado(data: any): void {
    this.cargando = true;
    this.mostrarAlertaError = false;
    setTimeout(() => {
      try {
        this.visitasDetalle = Array.isArray(data) ? data : [data];
        console.log(this.visitasDetalle);

        // Cargar imágenes para cada visita
        this.visitasDetalle.forEach(visita => {
          this.cargarImagenesVisita(visita.clVi_Id);
        });

        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la visita:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la visita.';
        this.cargando = false;
      }
    }, 300);
  }

  cargarImagenesVisita(visitaId: string): void {
    if (this.cargandoImagenes[visitaId]) return;
    this.cargandoImagenes[visitaId] = true;
    this.http.post<any[]>(`${environment.apiBaseUrl}/ImagenVisita/ListarPorVisita/${visitaId}`, {}, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
        next: (imagenes) => {
          this.imagenesVisita[visitaId] = imagenes || [];
          this.currentSlideIndex[visitaId] = 0;
          this.cargandoImagenes[visitaId] = false;
        },
        error: (error) => {
          console.error(`Error al cargar imágenes para la visita ${visitaId}:`, error);
          this.imagenesVisita[visitaId] = [];
          this.cargandoImagenes[visitaId] = false;
        }
      });
  }

  // Métodos para el carrusel
  nextSlide(visitaId: string): void {
    const imagenes = this.imagenesVisita[visitaId];
    if (imagenes && imagenes.length > 1) {
      this.currentSlideIndex[visitaId] = (this.currentSlideIndex[visitaId] + 1) % imagenes.length;
    }
  }

  prevSlide(visitaId: string): void {
    const imagenes = this.imagenesVisita[visitaId];
    if (imagenes && imagenes.length > 1) {
      this.currentSlideIndex[visitaId] = this.currentSlideIndex[visitaId] === 0
        ? imagenes.length - 1
        : this.currentSlideIndex[visitaId] - 1;
    }
  }

  goToSlide(visitaId: string, index: number): void {
    const imagenes = this.imagenesVisita[visitaId];
    if (imagenes && index >= 0 && index < imagenes.length) {
      this.currentSlideIndex[visitaId] = index;
    }
  }

  getImagenesVisita(visitaId: string): any[] {
    return this.imagenesVisita[visitaId] || [];
  }

  getCurrentSlideIndex(visitaId: string): number {
    return this.currentSlideIndex[visitaId] || 0;
  }

  esCargandoImagenes(visitaId: string): boolean {
    return this.cargandoImagenes[visitaId] || false;
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }
}