import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { CurrencyMaskModule } from "ng2-currency-mask";

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, CurrencyMaskModule],
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss'
})
export class ProgressComponent implements OnInit, OnChanges {
  @Input() metaData: any = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  meta: any = null;
  vendedores: any[] = [];
  progreso: { [vendId: number]: { ingresos: number, unidades: number } } = {};

  // UI state
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  cargando = false;

  vendedorFiltro: string = '';

get vendedoresFiltrados(): any[] {
  if (!this.vendedorFiltro || this.vendedorFiltro.trim() === '') {
    return this.vendedores;
  }
  const filtro = this.vendedorFiltro.trim().toLowerCase();
  return this.vendedores.filter(v =>
    (v.Vend_NombreCompleto || `${v.vend_Nombres || ''} ${v.vend_Apellidos || ''}` || '').toLowerCase().includes(filtro)
    || String(v.Vend_Id).includes(filtro)
  );
}

  constructor(private http: HttpClient) {}

  ngOnInit(): void {

    if (!this.metaData) {
    this.metaData = {
      meta_Id: 1,
      meta_Descripcion: 'Meta de prueba',
      meta_Tipo: 'IM', // or 'IM'
      meta_FechaInicio: new Date(),
      meta_FechaFin: new Date(),
      meta_Ingresos: 10000,
      meta_Unidades: 50,
      vendedores: [
        { Vend_Id: 101, Vend_NombreCompleto: 'Juan Pérez', MeEm_ProgresoIngresos: 0, MeEm_ProgresoUnidades: 10 },
        { Vend_Id: 102, Vend_NombreCompleto: 'Ana Gómez', MeEm_ProgresoIngresos: 0, MeEm_ProgresoUnidades: 0 }
      ]
    };
  }
  this.initFromMetaData();

    this.initFromMetaData();
  }

  decrementUnidades(vendId: number): void {
  this.progreso[vendId].unidades = Math.max(0, this.progreso[vendId].unidades - 1);
  }
  decrementIngresos(vendId: number): void {
    this.progreso[vendId].ingresos = Math.max(0, this.progreso[vendId].ingresos - 1);
  }
  incrementUnidades(vendId: number): void {
    this.progreso[vendId].unidades = this.progreso[vendId].unidades + 1;
  }
  incrementIngresos(vendId: number): void {
    this.progreso[vendId].ingresos = this.progreso[vendId].ingresos + 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metaData'] && changes['metaData'].currentValue) {
      this.initFromMetaData();
    }
  }

  private initFromMetaData(): void {
    this.meta = this.metaData ? { ...this.metaData } : null;
    this.vendedores = [];
    this.progreso = {};
    if (this.meta) {
      // Parse vendedoresJson or vendedores array
      if (typeof this.meta.vendedoresJson === 'string') {
        try {
          this.vendedores = JSON.parse(this.meta.vendedoresJson);
        } catch {
          this.vendedores = [];
        }
      } else if (Array.isArray(this.meta.vendedoresJson)) {
        this.vendedores = this.meta.vendedoresJson;
      } else if (Array.isArray(this.meta.vendedores)) {
        this.vendedores = this.meta.vendedores;
      } else {
        this.vendedores = [];
      }
      // Initialize progreso for each vendedor
      for (const v of this.vendedores) {
        this.progreso[v.Vend_Id] = {
          ingresos: Number(v.MeEm_ProgresoIngresos) || 0,
          unidades: Number(v.MeEm_ProgresoUnidades) || 0
        };
      }
    }
  }

  // Only allow for CM or IM
  get isEditable(): boolean {
    return this.meta && (this.meta.meta_Tipo === 'CM' || this.meta.meta_Tipo === 'IM');
  }

  // For display
  get tipoLabel(): string {
    return this.meta?.meta_Tipo === 'CM' ? 'Cantidades Administradas Manualmente'
      : this.meta?.meta_Tipo === 'IM' ? 'Ingresos Administradas Manualmente'
      : this.meta?.meta_Tipo || '';
  }

  validar(): boolean {
    if (!this.isEditable) return false;
    if (!this.vendedores.length) return false;
    for (const v of this.vendedores) {
      const p = this.progreso[v.Vend_Id];
      if (this.meta.meta_Tipo === 'CM') {
        if (p.unidades == null || isNaN(p.unidades) || p.unidades < 0) return false;
      }
      if (this.meta.meta_Tipo === 'IM') {
        if (p.ingresos == null || isNaN(p.ingresos) || p.ingresos < 0) return false;
      }
    }
    return true;
  }

  buildDetallesXml(): string {
    let xml = '<root>';
    for (const v of this.vendedores) {
      const p = this.progreso[v.Vend_Id];
      xml += `<item>`;
      xml += `<Meta_Id>${this.meta.meta_Id}</Meta_Id>`;
      xml += `<Vend_Id>${v.Vend_Id}</Vend_Id>`;
      xml += `<MeEm_ProgresoIngresos>${this.meta.meta_Tipo === 'IM' ? (p.ingresos || 0) : 0}</MeEm_ProgresoIngresos>`;
      xml += `<MeEm_ProgresoUnidades>${this.meta.meta_Tipo === 'CM' ? (p.unidades || 0) : 0}</MeEm_ProgresoUnidades>`;
      xml += `</item>`;
    }
    xml += '</root>';
    return xml;
  }

  guardar(): void {
    this.mostrarErrores = true;
    if (!this.validar()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos y asegúrese que los valores sean válidos.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }
    this.cargando = true;
    const payload: any = {
      meta_Id: this.meta.meta_Id,
      meta_Descripcion: this.meta.meta_Descripcion,
      meta_FechaInicio: this.meta.meta_FechaInicio,
      meta_FechaFin: this.meta.meta_FechaFin,
      meta_Tipo: this.meta.meta_Tipo,
      meta_Ingresos: this.meta.meta_Ingresos,
      meta_Unidades: this.meta.meta_Unidades,
      prod_Id: this.meta.prod_Id || 0,
      cate_Id: this.meta.cate_Id || 0,
      meta_Estado: this.meta.meta_Estado,
      usua_Creacion: this.meta.usua_Creacion,
      meta_FechaCreacion: this.meta.meta_FechaCreacion,
      usua_Modificacion: environment.usua_Id || getUserId(),
      meta_FechaModificacion: new Date(),
      vendedoresXml: '', // not used here
      vendedoresJson: '', // not used here
      detallesXml: this.buildDetallesXml()
    };

    this.http.put<any>(`${environment.apiBaseUrl}/Metas/ActualizarProgreso`, payload, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        this.cargando = false;
        if (response?.data?.code_Status > 0) {
          this.mostrarAlertaExito = true;
          this.mensajeExito = 'Progreso actualizado exitosamente.';
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(payload);
            this.cancelar();
          }, 2000);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response?.data?.message_Status || 'Error al actualizar el progreso.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      },
      error: (error) => {
        this.cargando = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar el progreso. Por favor, intente nuevamente.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.cargando = false;
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
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