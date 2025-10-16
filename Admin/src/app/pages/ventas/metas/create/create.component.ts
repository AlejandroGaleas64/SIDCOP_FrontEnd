import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Meta } from 'src/app/Modelos/ventas/MetaModel';
import { CurrencyMaskModule } from "ng2-currency-mask";

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, CurrencyMaskModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent implements OnInit {
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
  meta : any = {
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

  // Tipo options (updated)
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

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarCategorias();
    this.cargarProductos();
    this.cargarVendedores();
  }

  cargarCategorias(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Categorias/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.categorias = data,
      error: (error) => console.error('Error cargando categorias:', error)
    });
  }

  cargarProductos(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Productos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.productos = data,
      error: (error) => console.error('Error cargando productos:', error)
    });
  }

  cargarVendedores(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.vendedores = data,
      error: (error) => console.error('Error cargando vendedores:', error)
    });
  }

  // Stepper navigation
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

  irAlPasoAnterior() {
    if (this.activeStep > 1) {
      this.activeStep--;
      this.mostrarErrores = false;
    }
  }

  // --- ADDED: Reset fields on tipo change ---
  onTipoChange() {
    const tipo = this.meta.meta_Tipo;

    // Reset all conditional fields
    this.meta.meta_Ingresos = 0;
    this.meta.meta_Unidades = 0;
    this.meta.prod_Id = null;
    this.meta.cate_Id = null;

    // Set only the needed fields for each tipo
    // (No need to set values here, just reset unused fields)
    // If you want to set defaults for some tipos, do it here
  }

  // --- CHANGED: Validation logic per tipo ---
  validarPasoActual(): boolean {
    if (this.activeStep === 1) {
      const tipo = this.meta.meta_Tipo;
      if (!this.meta.meta_Descripcion?.trim() || !tipo || !this.meta.meta_FechaInicio || !this.meta.meta_FechaFin) {
        return false;
      }
      // IT — Ingresos Totales
      if (tipo === 'IT') {
        return this.meta.meta_Ingresos > 0;
      }
      // TP — Total Productos (Cantidad)
      if (tipo === 'TP') {
        return this.meta.meta_Unidades > 0;
      }
      // CN — Clientes Nuevos
      if (tipo === 'CN') {
        return this.meta.meta_Unidades > 0;
      }
      // PE — Producto Específico (Cantidad)
      if (tipo === 'PE') {
        return this.meta.meta_Unidades > 0 && !!this.meta.prod_Id;
      }
      // IP — Ingresos de Producto Específico
      if (tipo === 'IP') {
        return this.meta.meta_Ingresos > 0 && !!this.meta.prod_Id;
      }
      // PC — Productos de Categoría (Ingresos)
      if (tipo === 'PC') {
        return this.meta.meta_Ingresos > 0 && !!this.meta.cate_Id;
      }
      // CM — Cantidades Manuales
      if (tipo === 'CM') {
        return this.meta.meta_Unidades > 0;
      }
      // IM — Ingresos Manuales
      if (tipo === 'IM') {
        return this.meta.meta_Ingresos > 0;
      }
      return false;
    }
    if (this.activeStep === 2) {
      return this.vendedoresSeleccionados.length > 0;
    }
    return false;
  }

  isVendedorSeleccionado(vend_Id: number): boolean {
    return this.vendedoresSeleccionados.includes(vend_Id);
  }

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

  toggleSelectAllVendedores(event: any) {
    const checked = event.target.checked;
    this.selectAllVendedores = checked;
    if (checked) {
      this.vendedoresSeleccionados = this.vendedores.map(v => v.vend_Id);
    } else {
      this.vendedoresSeleccionados = [];
    }
  }

  // XML generation for vendedores
  generateVendedoresXml(): string {
    if (!this.vendedoresSeleccionados.length) return '';
    let xml = '<root>';
    this.vendedoresSeleccionados.forEach(id => {
      xml += `<item><vend_id>${id}</vend_id></item>`;
    });
    xml += '</root>';
    return xml;
  }

  get vendedoresFiltrados() {
    if (!this.filtroVendedor?.trim()) return this.vendedores;
    const filtro = this.filtroVendedor.trim().toLowerCase();
    return this.vendedores.filter(v =>
      (`${v.vend_Nombres} ${v.vend_Apellidos}`.toLowerCase().includes(filtro))
    );
  }

  // --- CHANGED: Ensure unused fields are null before saving ---
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
    // IT — Ingresos Totales
    if (tipo === 'IT') {
      this.meta.meta_Unidades = 0;
      this.meta.prod_Id = null;
      this.meta.cate_Id = null;
    }
    // TP — Total Productos (Cantidad)
    if (tipo === 'TP') {
      this.meta.meta_Ingresos = 0;
      this.meta.prod_Id = null;
      this.meta.cate_Id = null;
    }
    // CN — Clientes Nuevos
    if (tipo === 'CN') {
      this.meta.meta_Ingresos = 0;
      this.meta.prod_Id = null;
      this.meta.cate_Id = null;
    }
    // PE — Producto Específico (Cantidad)
    if (tipo === 'PE') {
      this.meta.meta_Ingresos = 0;
      this.meta.cate_Id = null;
    }
    // IP — Ingresos de Producto Específico
    if (tipo === 'IP') {
      this.meta.meta_Unidades = 0;
      this.meta.cate_Id = null;
    }
    // PC — Productos de Categoría (Ingresos)
    if (tipo === 'PC') {
      this.meta.meta_Unidades = 0;
      this.meta.prod_Id = null;
    }
    // CM — Cantidades Manuales
    if (tipo === 'CM') {
      this.meta.meta_Ingresos = 0;
      this.meta.prod_Id = null;
      this.meta.cate_Id = null;
    }
    // IM — Ingresos Manuales
    if (tipo === 'IM') {
      this.meta.meta_Unidades = 0;
      this.meta.prod_Id = null;
      this.meta.cate_Id = null;
    }

    // Prepare payload
    const payload: Meta = {
      ...this.meta,
      meta_Id: 0,
      meta_Estado: true,
      usua_Creacion: environment.usua_Id || getUserId(),
      meta_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      meta_FechaModificacion: new Date(),
      vendedoresXml: this.generateVendedoresXml(),
      vendedoresJson: '' 
    };

    //console.log('Payload to be sent:', payload);

    this.http.post<any>(`${environment.apiBaseUrl}/Metas/InsertarCompleto`, payload, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        if (response?.data?.code_Status > 0) {
          this.mostrarAlertaExito = true;
          this.mensajeExito = 'Meta guardada exitosamente.';
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(payload);
            this.cancelar();
          }, 2000);
        } else {
          this.mostrarAlertaError = true;
          this.mensajeError = response?.data?.message_Status || 'Error al guardar la meta.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al guardar la meta. Por favor, intente nuevamente.';
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
    this.meta = {
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
    this.vendedoresSeleccionados = [];
    this.activeStep = 1;
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
}