import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Pipe, PipeTransform } from '@angular/core';
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
  @Input() vendId: number | null = null;
  @Output() onClose = new EventEmitter<void>();

  visitas: any[] = [];
  cargando = false;
  mostrarAlertaError = false;
  mensajeError = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vendId'] && changes['vendId'].currentValue) {
      this.cargarVisitas(changes['vendId'].currentValue);
    }
  }

  cargarVisitas(vendId: number): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    this.http.get<any[]>(`${environment.apiBaseUrl}/ClientesVisitaHistorial/ListarVisitasPorVendedor`, {
      headers: { 'x-api-key': environment.apiKey },
      params: { vend_Id: vendId }
    }).subscribe({
      next: (data) => {
        this.visitas = data || [];
        this.cargando = false;
        console.log("Visitas cargadas:", this.visitas);
      },
      error: (error) => {
        console.error('Error al cargar visitas:', error);
        this.visitas = [];
        this.cargando = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar las visitas del vendedor.';
      }
    });
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }
}