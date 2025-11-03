import { Component, Output, EventEmitter, Input, OnInit, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Meta } from 'src/app/Modelos/ventas/MetaModel';
import { CurrencyMaskModule } from "ng2-currency-mask";

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, CurrencyMaskModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnInit, OnChanges {
  @Input() metaData: Meta | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Meta>();

  // Stepper
  activeStep = 1;

  // Alerts
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Dropdown data
  categorias: any[] = [];
  productos: any[] = [];
  vendedores: any[] = [];

  // Form state
  meta: any = {
    meta_Id: 0,
    meta_Descripcion: '',
    meta_FechaInicio: new Date().toISOString().substring(0, 10),
    meta_FechaFin: new Date().toISOString().substring(0, 10),
    meta_Tipo: '',
    meta_Ingresos: 0,
    meta_Unidades: 0,
    prod_Id: null,
    cate_Id: null,
    meta_Estado: true,
    usua_Creacion: environment.usua_Id || getUserId(),
    meta_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    meta_FechaModificacion: new Date(),
    vendedoresXml: '',
    vendedoresJson: ''
  };

  // Vendedor selection
  vendedoresSeleccionados: number[] = [];
  selectAllVendedores = false;
  filtroVendedor: string = '';

  // Tipo options
  tiposMeta = [
    { value: 'IT', label: 'Ingresos Totales - Automatico' },
    { value: 'TP', label: 'Productos Vendidos Totales (Unidades) - Automatico' },
    { value: 'CN', label: 'Clientes Nuevos - Automatico' },
    { value: 'PE', label: 'Producto Específico (Unidades) - Automatico' },
    { value: 'IP', label: 'Ingresos de Producto Específico - Automatico' },
    { value: 'PC', label: 'Productos vendidos de Categoría - Automatico' },
    { value: 'CM', label: 'Cantidades Administradas Manualmente' },
    { value: 'IM', label: 'Ingresos Administradas Manualmente' }
  ];

  /**
   * Constructor del componente de edición de metas.
   * @param http Cliente HTTP para llamadas a la API.
   */
  constructor(private http: HttpClient) {}

  /**
   * Hook de inicialización: carga catálogos y pre-carga la meta cuando esté disponible.
   */
  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarProductos();
    this.cargarVendedores();
    if (this.metaData) {
      this.preloadMeta(this.metaData);
    }
  }

  /**
   * Hook de cambios: cuando metaData cambia, vuelve a precargar los datos en el formulario.
   * @param changes Cambios detectados por Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metaData'] && changes['metaData'].currentValue) {
      this.preloadMeta(changes['metaData'].currentValue);
    }
  }

  // preloadMeta(meta: any) {
  //   // Deep copy to avoid mutating input
  //   this.meta = {
  //     ...meta,
  //     meta_FechaInicio: meta.meta_FechaInicio ? meta.meta_FechaInicio.substring(0, 10) : '',
  //     meta_FechaFin: meta.meta_FechaFin ? meta.meta_FechaFin.substring(0, 10) : '',
  //   };
  //   // Preload vendedoresSeleccionados from XML/JSON or array
  //   if (meta.vendedoresSeleccionados && Array.isArray(meta.vendedoresSeleccionados)) {
  //     this.vendedoresSeleccionados = [...meta.vendedoresSeleccionados];
  //   } else if (meta.vendedores && Array.isArray(meta.vendedores)) {
  //     this.vendedoresSeleccionados = meta.vendedores.map((v: any) => v.vend_Id);
  //   } else if (meta.vendedoresXml) {
  //     // Parse XML if needed (simple parser)
  //     const matches = meta.vendedoresXml.match(/<vend_id>(\d+)<\/vend_id>/g) || [];
  //     this.vendedoresSeleccionados = matches.map((m:any) => Number(m.replace(/\D/g, '')));
  //   } else {
  //     this.vendedoresSeleccionados = [];
  //   }
  //   this.selectAllVendedores = this.vendedoresSeleccionados.length === this.vendedores.length;
  // }

  /**
   * Pre-carga el formulario a partir del input meta, normalizando fechas y selección de vendedores
   * desde vendedoresJson, vendedoresSeleccionados, vendedores o vendedoresXml.
   * @param meta Objeto meta de entrada.
   */
  preloadMeta(meta: any) {
  // Deep copy to avoid mutating input
  this.meta = {
    ...meta,
    meta_FechaInicio: meta.meta_FechaInicio ? meta.meta_FechaInicio.substring(0, 10) : '',
    meta_FechaFin: meta.meta_FechaFin ? meta.meta_FechaFin.substring(0, 10) : '',
  };

  // Preload vendedoresSeleccionados from vendedoresJson, vendedoresSeleccionados, vendedores, or vendedoresXml
  if (meta.vendedoresJson) {
    try {
      const vendArray = JSON.parse(meta.vendedoresJson);
      this.vendedoresSeleccionados = vendArray.map((v: any) => v.Vend_Id);
    } catch (e) {
      this.vendedoresSeleccionados = [];
    }
  } else if (meta.vendedoresSeleccionados && Array.isArray(meta.vendedoresSeleccionados)) {
    this.vendedoresSeleccionados = [...meta.vendedoresSeleccionados];
  } else if (meta.vendedores && Array.isArray(meta.vendedores)) {
    this.vendedoresSeleccionados = meta.vendedores.map((v: any) => v.vend_Id);
  } else if (meta.vendedoresXml) {
    const matches = meta.vendedoresXml.match(/<vend_id>(\d+)<\/vend_id>/g) || [];
    this.vendedoresSeleccionados = matches.map((m: any) => Number(m.replace(/\D/g, '')));
  } else {
    this.vendedoresSeleccionados = [];
  }
}

  /**
   * Carga categorías desde la API.
   */
  cargarCategorias(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Categorias/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.categorias = data,
      error: (error) => console.error('Error cargando categorias:', error)
    });
  }

  /**
   * Carga productos desde la API.
   */
  cargarProductos(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Productos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.productos = data,
      error: (error) => console.error('Error cargando productos:', error)
    });
  }

  // cargarVendedores(): void {
  //   this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
  //     headers: { 'x-api-key': environment.apiKey }
  //   }).subscribe({
  //     next: (data) => {
  //       this.vendedores = data;
  //       // If metaData is already loaded, update selectAllVendedores
  //       this.selectAllVendedores = this.vendedoresSeleccionados.length === data.length;
  //     },
  //     error: (error) => console.error('Error cargando vendedores:', error)
  //   });
  // }

  /**
   * Carga vendedores desde la API y recalcula selección general.
   */
  cargarVendedores(): void {
  this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
    headers: { 'x-api-key': environment.apiKey }
  }).subscribe({
    next: (data) => {
      this.vendedores = data;
      // Recalculate selectAllVendedores and update selection after loading vendedores
      if (this.metaData) {
        this.preloadMeta(this.metaData);
      }
      this.selectAllVendedores = this.vendedoresSeleccionados.length === this.vendedores.length;
    },
    error: (error) => console.error('Error cargando vendedores:', error)
  });
}

  // Stepper navigation
  /**
   * Avanza al siguiente paso del formulario de edición si es válido.
   */
  irAlSiguientePaso() {
    this.mostrarErrores = true;
    if (this.validarPasoActual()) {
      this.mostrarErrores = false;
      this.activeStep++;
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Debe completar todos los campos requeridos antes de continuar.';
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }

  /**
   * Regresa al paso anterior del formulario de edición.
   */
  irAlPasoAnterior() {
    if (this.activeStep > 1) {
      this.activeStep--;
      this.mostrarErrores = false;
    }
  }

  /**
   * Resetea campos dependientes al cambiar el tipo de meta.
   */
  onTipoChange() {
    const tipo = this.meta.meta_Tipo;
    // Reset all conditional fields
    this.meta.meta_Ingresos = 0;
    this.meta.meta_Unidades = 0;
    this.meta.prod_Id = null;
    this.meta.cate_Id = null;
  }

  /**
   * Valida el paso actual de edición según el tipo de meta y campos requeridos.
   */
  validarPasoActual(): boolean {
    if (this.activeStep === 1) {
      const tipo = this.meta.meta_Tipo;
      if (!this.meta.meta_Descripcion?.trim() || !tipo || !this.meta.meta_FechaInicio || !this.meta.meta_FechaFin) {
        return false;
      }
      if (tipo === 'IT') return this.meta.meta_Ingresos > 0;
      if (tipo === 'TP') return this.meta.meta_Unidades > 0;
      if (tipo === 'CN') return this.meta.meta_Unidades > 0;
      if (tipo === 'PE') return this.meta.meta_Unidades > 0 && !!this.meta.prod_Id;
      if (tipo === 'IP') return this.meta.meta_Ingresos > 0 && !!this.meta.prod_Id;
      if (tipo === 'PC') return this.meta.meta_Ingresos > 0 && !!this.meta.cate_Id;
      if (tipo === 'CM') return this.meta.meta_Unidades > 0;
      if (tipo === 'IM') return this.meta.meta_Ingresos > 0;
      return false;
    }
    if (this.activeStep === 2) {
      return this.vendedoresSeleccionados.length > 0;
    }
    return false;
  }

  /**
   * Determina si un vendedor está seleccionado.
   * @param vend_Id Identificador del vendedor.
   */
  isVendedorSeleccionado(vend_Id: number): boolean {
    return this.vendedoresSeleccionados.includes(vend_Id);
  }

  /**
   * Alterna la selección individual de un vendedor.
   * @param vend_Id Identificador del vendedor.
   * @param event Evento del checkbox.
   */
  toggleVendedor(vend_Id: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      if (!this.vendedoresSeleccionados.includes(vend_Id)) {
        this.vendedoresSeleccionados.push(vend_Id);
      }
    } else {
      this.vendedoresSeleccionados = this.vendedoresSeleccionados.filter(id => id !== vend_Id);
    }
    this.selectAllVendedores = this.vendedoresSeleccionados.length === this.vendedores.length;
  }

  /**
   * Selecciona o deselecciona todos los vendedores.
   * @param event Evento del checkbox maestro.
   */
  toggleSelectAllVendedores(event: any) {
    const checked = event.target.checked;
    this.selectAllVendedores = checked;
    if (checked) {
      this.vendedoresSeleccionados = this.vendedores.map(v => v.vend_Id);
    } else {
      this.vendedoresSeleccionados = [];
    }
  }

  /**
   * Genera XML con vendedores seleccionados para la API.
   */
  generateVendedoresXml(): string {
    if (!this.vendedoresSeleccionados.length) return '';
    let xml = '<root>';
    this.vendedoresSeleccionados.forEach(id => {
      xml += `<item><vend_id>${id}</vend_id></item>`;
    });
    xml += '</root>';
    return xml;
  }

  /**
   * Lista derivada de vendedores con filtro por nombre.
   */
  get vendedoresFiltrados() {
    if (!this.filtroVendedor?.trim()) return this.vendedores;
    const filtro = this.filtroVendedor.trim().toLowerCase();
    return this.vendedores.filter(v =>
      (`${v.vend_Nombres} ${v.vend_Apellidos}`.toLowerCase().includes(filtro))
    );
  }

  /**
   * Guarda los cambios de la meta editada llamando a la API y controla alertas.
   */
  guardar(): void {
    this.mostrarErrores = true;
    if (!this.validarPasoActual()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      return;
    }

    // Ensure unused fields are null for FK
    const tipo = this.meta.meta_Tipo;
    if (tipo === 'IT') { this.meta.meta_Unidades = 0; this.meta.prod_Id = null; this.meta.cate_Id = null; }
    if (tipo === 'TP') { this.meta.meta_Ingresos = 0; this.meta.prod_Id = null; this.meta.cate_Id = null; }
    if (tipo === 'CN') { this.meta.meta_Ingresos = 0; this.meta.prod_Id = null; this.meta.cate_Id = null; }
    if (tipo === 'PE') { this.meta.meta_Ingresos = 0; this.meta.cate_Id = null; }
    if (tipo === 'IP') { this.meta.meta_Unidades = 0; this.meta.cate_Id = null; }
    if (tipo === 'PC') { this.meta.meta_Unidades = 0; this.meta.prod_Id = null; }
    if (tipo === 'CM') { this.meta.meta_Ingresos = 0; this.meta.prod_Id = null; this.meta.cate_Id = null; }
    if (tipo === 'IM') { this.meta.meta_Unidades = 0; this.meta.prod_Id = null; this.meta.cate_Id = null; }

    // Prepare payload
    const payload: Meta = {
      ...this.meta,
      meta_Estado: true,
      usua_Modificacion: environment.usua_Id || getUserId(),
      usua_Creacion: environment.usua_Id || getUserId(),
      meta_FechaModificacion: new Date(),
      vendedoresXml: this.generateVendedoresXml(),
      vendedoresJson: ''
    };

    //console.log('Payload para guardar meta editada:', payload);

    this.http.post<any>(`${environment.apiBaseUrl}/Metas/ActualizarCompleto`, payload, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {

        //console.log('Respuesta al guardar meta:', response);
        if (response?.data?.code_Status > 0) {
          this.mostrarAlertaExito = true;
          this.mensajeExito = 'Meta actualizada exitosamente.';
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(payload);
            this.cancelar();
          }, 2000);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response?.data?.message_Status || 'Error al actualizar la meta.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar la meta. Por favor, intente nuevamente.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    });
  }

  /**
   * Restaura estado visual y emite cancelación al padre.
   */
  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.activeStep = 1;
    this.onCancel.emit();
  }

  /**
   * Cierra cualquier alerta visible.
   */
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }
}