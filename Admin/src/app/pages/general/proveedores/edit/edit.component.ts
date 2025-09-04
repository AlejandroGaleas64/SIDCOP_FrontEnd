import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Proveedor } from 'src/app/Modelos/general/Proveedor.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { provideRouter } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule, NgxMaskDirective],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
  providers: [provideNgxMask()],
})
export class EditComponent implements OnChanges {
  @Input() proveedorData: Proveedor | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Proveedor>();

  proveedor: Proveedor = new Proveedor();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  // Catálogos para DDL dependientes
  Departamentos: any[] = [];
  TodosMunicipios: any[] = [];
  TodosColonias: any[] = [];
  Municipios: any[] = [];
  Colonias: any[] = [];
  // proveedorOriginal: Proveedor = new Proveedor();
  selectedDepa: string = '';
  selectedMuni: string = '';

  constructor(private http: HttpClient) {
    this.cargarListados();
  }

  cargarListados(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.Departamentos = data,
      error: (error) => console.error('Error cargando departamentos:', error)
    });

    this.http.get<any>(`${environment.apiBaseUrl}/Municipios/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.TodosMunicipios = data,
      error: (error) => console.error('Error cargando municipios:', error)
    });

    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.TodosColonias = data,
      error: (error) => console.error('Error cargando colonias:', error)
    });
  }

  cargarMunicipios(codigoDepa: string): void {
    this.Municipios = this.TodosMunicipios.filter(m => m.depa_Codigo === codigoDepa);
    this.Colonias = [];
    this.selectedMuni = '';
    this.proveedor.colo_Id = 0;
  }

  cargarColonias(codigoMuni: string): void {
    this.Colonias = this.TodosColonias.filter(c => c.muni_Codigo === codigoMuni);
    this.proveedor.colo_Id = 0;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proveedorData'] && changes['proveedorData'].currentValue) {
      this.proveedor = { ...changes['proveedorData'].currentValue };
      this.mostrarErrores = false;
      this.proveedorOriginal = { ...this.proveedor, colo_Id: this.proveedor.colo_Id ?? 0 };



      this.cerrarAlerta();
      // Sincronizar selects dependientes
      if (this.TodosMunicipios.length && this.TodosColonias.length) {
        this.setSelectsFromProveedor();
      } else {
        // Esperar a que los catálogos estén cargados
        setTimeout(() => this.setSelectsFromProveedor(), 500);
      }
    }
  }

  setSelectsFromProveedor(): void {
    if (!this.proveedor) return;
    // Buscar municipio y departamento de la colonia seleccionada
    const colonia = this.TodosColonias.find(c => c.colo_Id === this.proveedor.colo_Id);
    if (colonia) {
      this.selectedMuni = colonia.muni_Codigo;
      const municipio = this.TodosMunicipios.find(m => m.muni_Codigo === colonia.muni_Codigo);
      if (municipio) {
        this.selectedDepa = municipio.depa_Codigo;
        this.Municipios = this.TodosMunicipios.filter(m => m.depa_Codigo === this.selectedDepa);
        this.Colonias = this.TodosColonias.filter(c => c.muni_Codigo === this.selectedMuni);
      }
    }
  }



  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.proveedor.prov_NombreEmpresa.trim() && this.proveedor.prov_Codigo.trim() &&
      this.proveedor.prov_NombreContacto.trim() && this.proveedor.prov_Telefono.trim() &&
      this.proveedor.colo_Id > 0 && this.proveedor.prov_DireccionExacta.trim() &&
      this.proveedor.prov_Correo.trim() && this.proveedor.prov_Observaciones.trim()) {
      if (
        this.proveedor.prov_NombreEmpresa.trim() !== this.proveedorOriginal.prov_NombreEmpresa.trim() ||
        this.proveedor.prov_Codigo.trim() !== this.proveedorOriginal.prov_Codigo.trim() ||
        this.proveedor.prov_NombreContacto.trim() !== this.proveedorOriginal.prov_NombreContacto.trim() ||
        this.proveedor.prov_Telefono.trim() !== this.proveedorOriginal.prov_Telefono.trim() ||
        this.proveedor.colo_Id !== this.proveedorOriginal.colo_Id ||
        this.proveedor.prov_DireccionExacta.trim() !== this.proveedorOriginal.prov_DireccionExacta.trim() ||
        this.proveedor.prov_Correo.trim() !== this.proveedorOriginal.prov_Correo.trim() ||
        this.proveedor.prov_Observaciones.trim() !== this.proveedorOriginal.prov_Observaciones.trim()
      ) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        console.error('No se han detectado cambios en el proveedor.');
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }


  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    console.log('Confirmar edición de proveedor');
    this.guardar();
  }


  cancelar(): void {
    this.cerrarAlerta();
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

  guardar(): void {
    this.mostrarErrores = true;
    if (this.proveedor.prov_NombreEmpresa.trim() && this.proveedor.prov_Codigo.trim() &&
      this.proveedor.prov_NombreContacto.trim() && this.proveedor.prov_Telefono.trim() &&
      this.proveedor.colo_Id > 0 && this.proveedor.prov_DireccionExacta.trim() &&
      this.proveedor.prov_Correo.trim() && this.proveedor.prov_Observaciones.trim()) {
      const proveedorActualizar = {
        ...this.proveedor,
        usua_Modificacion: getUserId(),
        prov_FechaModificacion: new Date().toISOString()
      };
      this.http.put<any>(`${environment.apiBaseUrl}/Proveedor/Actualizar`, proveedorActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Proveedor "${this.proveedor.prov_NombreEmpresa}" actualizado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.proveedor);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el proveedor. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  esCorreoValido(correo: string): boolean {
    if (!correo) return true;
    // Debe contener "@" y terminar en ".com" y aceptar cualquier dominio
    return /^[\w\.-]+@[\w\.-]+\.[cC][oO][mM]$/.test(correo.trim());
  }



  // Objeto para almacenar los cambios detectados
  cambiosDetectados: any = {};
  proveedorOriginal: any = {};

  obtenerListaCambios(): { label: string; anterior: string; nuevo: string }[] {
    const cambios: { label: string; anterior: string; nuevo: string }[] = [];

    const val = (v: any) => v == null || v === '' ? '—' : String(v);
    const trim = (s: any) => (s ?? '').toString().trim();
    const nuevo = this.proveedor as any;
    const original = this.proveedorOriginal as any;
    this.cambiosDetectados = {};

    const camposBasicos = [
      { key: 'prov_Codigo', label: 'Código' },
      { key: 'prov_NombreEmpresa', label: 'Empresa' },
      { key: 'prov_NombreContacto', label: 'Contacto' },
      { key: 'prov_Telefono', label: 'Teléfono' },
      { key: 'prov_DireccionExacta', label: 'Dirección Exacta' },
      { key: 'prov_Correo', label: 'Correo' },
      { key: 'prov_Observaciones', label: 'Observaciones' },
    ];

    console.log('=== COMPARANDO CAMPOS BÁSICOS ===');
    camposBasicos.forEach(campo => {
      const valorOriginal = original[campo.key];
      const valorNuevo = nuevo[campo.key];
      const sonDiferentes = trim(valorOriginal) !== trim(valorNuevo);

      console.log(`Campo: ${campo.key}`, {
        original: valorOriginal,
        nuevo: valorNuevo,
        sonDiferentes
      });

      if (sonDiferentes && (valorOriginal !== '' && valorOriginal != null)) {
        const item = {
          anterior: val(valorOriginal),
          nuevo: val(valorNuevo),
          label: campo.label
        };
        this.cambiosDetectados[campo.key] = item as any;
        cambios.push(item);
        console.log(`Cambio detectado en ${campo.key}:`, item);
      }
    });

    // Helper para mapeo de colonia
    const coloNombre = (id: number) => (this.TodosColonias.find(c => Number(c.colo_Id) === Number(id))?.colo_Descripcion) || `ID: ${id}`;

    // Verificar cada campo y almacenar los cambios
    if (nuevo.prov_Codigo !== original.prov_Codigo) {
      this.cambiosDetectados.codigoProveedor = {
        anterior: original.prov_Codigo,
        nuevo: nuevo.prov_Codigo,
        label: 'Código del Proveedor'
      };
    }

    if (nuevo.prov_NombreEmpresa !== original.prov_NombreEmpresa) {
      this.cambiosDetectados.empresaProveedor = {
        anterior: original.prov_NombreEmpresa,
        nuevo: nuevo.prov_NombreEmpresa,
        label: 'Nombre de la Empresa'
      };
    }

    if (nuevo.prov_NombreContacto !== original.prov_NombreContacto) {
      this.cambiosDetectados.nombreContacto = {
        anterior: original.prov_NombreContacto,
        nuevo: nuevo.prov_NombreContacto,
        label: 'Nombre de Contacto'
      };
    }

    if (nuevo.prov_Telefono !== original.prov_Telefono) {
      this.cambiosDetectados.telefono = {
        anterior: original.prov_Telefono,
        nuevo: nuevo.prov_Telefono,
        label: 'Teléfono'
      };
    }

    if (nuevo.colo_Id !== original.colo_Id) {
      const coloniaAnterior = this.TodosColonias.find(c => c.colo_Id === original.colo_Id);
      const coloniaNueva = this.TodosColonias.find(c => c.colo_Id === nuevo.colo_Id);

      const item = {
        anterior: coloniaAnterior ? `${coloniaAnterior.colo_Descripcion} - ${coloniaAnterior.muni_Descripcion} - ${coloniaAnterior.depa_Descripcion}` : 'No seleccionada',
        nuevo: coloniaNueva ? `${coloniaNueva.colo_Descripcion} - ${coloniaNueva.muni_Descripcion} - ${coloniaNueva.depa_Descripcion}` : 'No seleccionada',
        label: 'Colonia'
      };
      this.cambiosDetectados.colonia = item;
      cambios.push(item); // <-- Esto es lo que faltaba
    }

    if (nuevo.prov_DireccionExacta !== original.prov_DireccionExacta) {
      this.cambiosDetectados.direccionExacta = {
        anterior: original.prov_DireccionExacta,
        nuevo: nuevo.prov_DireccionExacta,
        label: 'Dirección Exacta'
      };
    }

    if (nuevo.prov_Correo !== original.prov_Correo) {
      this.cambiosDetectados.correo = {
        anterior: original.prov_Correo,
        nuevo: nuevo.prov_Correo,
        label: 'Correo Electrónico'
      };
    }

    if (nuevo.prov_Observaciones !== original.prov_Observaciones) {
      this.cambiosDetectados.observaciones = {
        anterior: original.prov_Observaciones,
        nuevo: nuevo.prov_Observaciones,
        label: 'Observaciones'
      };
    }

    return cambios;
  }



  direccionExactaInicial: string = '';

  onColoniaSeleccionada(colo_Id: number) {
    this.proveedor.colo_Id = colo_Id;
    const coloniaSeleccionada = this.TodosColonias.find((c: any) => c.colo_Id === colo_Id);
    if (coloniaSeleccionada) {
      this.direccionExactaInicial = coloniaSeleccionada.colo_Descripcion;
      this.proveedor.prov_DireccionExacta = coloniaSeleccionada.colo_Descripcion;
    } else {
      this.direccionExactaInicial = '';
      this.proveedor.prov_DireccionExacta = '';
    }
  }

  //Para buscar colonias en DDL
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };
}
