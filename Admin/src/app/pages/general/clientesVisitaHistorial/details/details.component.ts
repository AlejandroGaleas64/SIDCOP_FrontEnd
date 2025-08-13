import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { VisitaClientePorVendedorDto } from 'src/app/Modelos/general/VisitaClientePorVendedorDto.Model';
import { Pipe, PipeTransform } from '@angular/core';

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
  @Input() visitaData: any = null;
  @Output() onClose = new EventEmitter<void>();

  visitaDetalle: any = null;
  cargando = false;
  mostrarAlertaError = false;
  mensajeError = '';
  public imgLoaded: boolean = false;
  showDetailsForm = false;
  activeActionRow: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visitaData'] && changes['visitaData'].currentValue) {
      this.cargarDetallesSimulado(changes['visitaData'].currentValue);
    }
  }

  detalles(visita: VisitaClientePorVendedorDto): void {
    this.visitaDetalle = { ...visita };
    this.showDetailsForm = true;
    this.activeActionRow = null;
  }

  cargarDetallesSimulado(data: any): void {
    this.cargando = true;
    this.mostrarAlertaError = false;
    setTimeout(() => {
      try {
        this.visitaDetalle = { ...data };
        console.log(this.visitaDetalle);
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles de la visita:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la visita.';
        this.cargando = false;
      }
    }, 300);
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  constructor(private http: HttpClient) { }
}

