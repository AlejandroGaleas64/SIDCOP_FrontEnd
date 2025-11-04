import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { FormsModule } from '@angular/forms'; // AGREGAR ESTO

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
  imports: [CommonModule, DiasSemanaPipe, FormsModule],
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
  visitasDetalleOriginal: any[] = []; // NUEVO: guardar datos originales
  visitasDetalleAll: any[] = [];

    // NUEVO: Propiedades para el filtro
  diaSeleccionado: string = 'todos';

    // Mensaje cuando no hay visitas después de filtrar
  mensajeNoVisitas = '';
  mostrarMensajeNoVisitas = false;

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
        // guardar todas las visitas para filtrado
        this.visitasDetalleAll = Array.isArray(data) ? [...data] : [data];

        // Si la API ya trae clie_DiaVisita no necesitamos inferir; construir DDL y aplicar filtro
        this.buildDiasDisponiblesFromData();+        this.filtrarPorDia();

        // Cargar imágenes sólo de las visitas mostradas (o cambiar por visitasDetalleAll si se desea)
        this.visitasDetalle.forEach(visita => {
          this.cargarImagenesVisita(visita.clVi_Id);
        });

        this.cargando = false;
      } catch (error) {
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
          

          imagenes.forEach((imagen: any) => {
            imagen.imVi_Imagen = imagen.imVi_Imagen.includes("http") ? imagen.imVi_Imagen : environment.apiBaseUrl + imagen.imVi_Imagen;
          });

          this.imagenesVisita[visitaId] = imagenes || [];
          this.currentSlideIndex[visitaId] = 0;
          this.cargandoImagenes[visitaId] = false;
        },
        error: (error) => {
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

  private DIAS_MAP: Record<string, string> = {
    '1': 'Lunes',
    '2': 'Martes',
    '3': 'Miércoles',
    '4': 'Jueves',
    '5': 'Viernes',
    '6': 'Sábado',
    '7': 'Domingo'
  };
  private DIAS_MAP_REVERSE: Record<string, string> = Object.entries(this.DIAS_MAP)
    .reduce((acc, [k, v]) => (acc[v.toLowerCase()] = k, acc), {} as Record<string,string>);
  // NUEVO: Extraer días únicos de las visitas
  // extraerDiasDisponibles(): void {
  //   const diasSet = new Set<string>();
  //   const diasMap: { [key: string]: string } = {
  //     '1': 'Lunes',
  //     '2': 'Martes',
  //     '3': 'Miércoles',
  //     '4': 'Jueves',
  //     '5': 'Viernes',
  //     '6': 'Sábado',
  //     '7': 'Domingo'
  //   };

  //   this.visitasDetalleOriginal.forEach(visita => {
  //     if (visita.clie_DiaVisita) {
  //       const dias = visita.clie_DiaVisita.split(',');
  //       dias.forEach((dia: string) => {
  //         const diaTrimmed = dia.trim();
  //         if (diasMap[diaTrimmed]) {
  //           diasSet.add(diasMap[diaTrimmed]);
  //         }
  //       });
  //     }
  //   });
  // }

   // Llamar cuando recibes las visitas desde el backend
   onVisitasCargadas(res: any[]) {
    this.visitasDetalleAll = res ? [...res] : [];
    // construir días disponibles solo si quieres mostrar los que aparecen en datos
    this.buildDiasDisponiblesFromData();
    // aplicar filtro inicial (todos)
    this.filtrarPorDia();
    console.log('[Details] visitas cargadas:', this.visitasDetalleAll.length);
  }

  // NUEVO: Método para filtrar por día
  filtrarPorDia(): void {
    console.log('[Details] filtrarPorDia seleccionado:', this.diaSeleccionado);
    if (!this.visitasDetalleAll || this.visitasDetalleAll.length === 0) {
      this.visitasDetalle = [];
      this.mostrarMensajeNoVisitas = true;
      this.mensajeNoVisitas = this.diaSeleccionado === 'todos'
        ? 'No hay visitas registradas aún'
        : `No hay visitas registradas los días ${this.getSelectedDayNombre()} aún`;
      return;
    }
    if (this.diaSeleccionado === 'todos') {
      this.visitasDetalle = [...this.visitasDetalleAll];
      this.mostrarMensajeNoVisitas = this.visitasDetalle.length === 0;
      this.mensajeNoVisitas = this.mostrarMensajeNoVisitas ? 'No hay visitas registradas aún' : '';
      return;
    }

    // si usuario seleccionó por nombre accidentalmente, convertir a id
    let seleccionadoId = String(this.diaSeleccionado);
    if (isNaN(Number(seleccionadoId))) {
      const lookup = this.DIAS_MAP_REVERSE[seleccionadoId.toLowerCase()];
      if (lookup) seleccionadoId = lookup;
    }

    // Filtrar exclusivamente por clie_DiaVisita (string CSV | número | array)
    this.visitasDetalle = this.visitasDetalleAll.filter(v => {
      const raw = v.clie_DiaVisita;
      if (raw === null || raw === undefined || raw === '') return false;
      if (typeof raw === 'number') return String(raw) === seleccionadoId;
      if (typeof raw === 'string') {
        const txt = raw.trim();
        if (txt === seleccionadoId) return true;
        if (txt.includes(',')) {
          return txt.split(',').map(s => s.trim()).includes(seleccionadoId);
        }
        return false;
      }
      if (Array.isArray(raw)) return raw.map(String).includes(seleccionadoId);
      return false;
    });
    this.mostrarMensajeNoVisitas = this.visitasDetalle.length === 0;
    if (this.mostrarMensajeNoVisitas) {
      const dayName = this.getSelectedDayNombre();
      this.mensajeNoVisitas = dayName
        ? `No hay visitas registradas los días ${dayName} aún`
        : 'No hay visitas registradas aún';
    } else {
      this.mensajeNoVisitas = '';
    }

    console.log('[Details] visitas tras filtrar:', this.visitasDetalle.length);
  }

private getSelectedDayNombre(): string {
    if (!this.diaSeleccionado || this.diaSeleccionado === 'todos') return '';
    const id = String(this.diaSeleccionado);
    if (this.DIAS_MAP[id]) return this.DIAS_MAP[id];
    // si el usuario pasó el nombre (ej. 'jueves'), intentar normalizar
    const lookup = this.DIAS_MAP_REVERSE[id.toLowerCase()];
    if (lookup && this.DIAS_MAP[lookup]) return this.DIAS_MAP[lookup];
    return String(this.diaSeleccionado);
  }

    // opciones del select (usamos ids como strings para comparación sencilla)
  diasDisponibles = [
    { id: 'todos', nombre: '📅 Todos los días' },
    { id: '1', nombre: 'Lunes' },
    { id: '2', nombre: 'Martes' },
    { id: '3', nombre: 'Miércoles' },
    { id: '4', nombre: 'Jueves' },
    { id: '5', nombre: 'Viernes' },
    { id: '6', nombre: 'Sábado' },
    { id: '7', nombre: 'Domingo' }
  ];

   private buildDiasDisponiblesFromData(): void {
  const present = new Set<string>();
  for (const v of this.visitasDetalleAll || []) {
    const raw = v.clie_DiaVisita ?? v.clie_Dia ?? v.veRu_Dias ?? v.veRuDias ?? '';
    if (raw === null || raw === undefined) continue;
    const ids: string[] = typeof raw === 'number'
      ? [String(raw)]
      : typeof raw === 'string'
        ? raw.split(',').map(s => s.trim()).filter(Boolean)
        : Array.isArray(raw) ? raw.map(String) : [];
    ids.forEach(id => {
      if (this.DIAS_MAP[id]) present.add(id);
    });
  }
  const order = ['1','2','3','4','5','6','7'];
  const list = [{ id: 'todos', nombre: '📅 Todos los días' }];
  for (const id of order) {
    if (present.has(id)) list.push({ id, nombre: this.DIAS_MAP[id] });
  }
  // si no hay datos, dejar la lista completa (opcional)
  const full = [
    { id: 'todos', nombre: '📅 Todos los días' },
    { id: '1', nombre: 'Lunes' }, { id: '2', nombre: 'Martes' },
    { id: '3', nombre: 'Miércoles' }, { id: '4', nombre: 'Jueves' },
    { id: '5', nombre: 'Viernes' }, { id: '6', nombre: 'Sábado' },
    { id: '7', nombre: 'Domingo' }
  ];
  this.diasDisponibles = list.length > 1 ? list : full;

  // asegurar que la selección actual exista en la lista; si no, reset a 'todos'
  const exists = this.diasDisponibles.some(d => String(d.id) === String(this.diaSeleccionado));
  if (!exists) {
    this.diaSeleccionado = 'todos';
  }

  console.log('[Details] diasDisponibles built:', this.diasDisponibles, 'selected:', this.diaSeleccionado);
}
}