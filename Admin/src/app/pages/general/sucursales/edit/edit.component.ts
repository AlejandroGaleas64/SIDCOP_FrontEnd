import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgSelectModule } from '@ng-select/ng-select';
import { Sucursales } from 'src/app/Modelos/general/Sucursales.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnInit, OnChanges {
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  ngOnInit(): void {
    // Obtener colonias igual que en crear
    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => {
      this.colonias = Array.isArray(data)
        ? data.map(c => ({ ...c, colo_Id: Number(c.colo_Id) }))
        : [];
    });
  }

  onColoniaSeleccionada(id: any) {
    this.sucursal.colo_Id = typeof id === 'object' && id !== null ? Number(id.colo_Id) : Number(id);
  }
  hayDiferencias(): boolean {
    const a = this.sucursal;
    const b: Sucursales = this.sucursalData ?? {
      sucu_Id: 0,
      secuencia: 0,
      sucu_Descripcion: '',
      colo_Id: 0,
      sucu_DireccionExacta: '',
      sucu_Telefono1: '',
      sucu_Telefono2: '',
      sucu_Codigo: '',
      sucu_Correo: '',
      usua_Creacion: 0,
      sucu_FechaCreacion: new Date(),
      sucu_Estado: true
    };
    this.cambiosDetectados = {};
    if ((a.sucu_Descripcion?.trim() || '') !== (b.sucu_Descripcion?.trim() || '')) {
      this.cambiosDetectados.descripcion = {
        anterior: b.sucu_Descripcion,
        nuevo: a.sucu_Descripcion,
        label: 'Descripción de la Sucursal'
      };
    }
    if (a.colo_Id !== b.colo_Id) {
      this.cambiosDetectados.colonia = {
        anterior: b.colo_Id,
        nuevo: a.colo_Id,
        label: 'Colonia'
      };
    }
    if ((a.sucu_DireccionExacta?.trim() || '') !== (b.sucu_DireccionExacta?.trim() || '')) {
      this.cambiosDetectados.direccion = {
        anterior: b.sucu_DireccionExacta,
        nuevo: a.sucu_DireccionExacta,
        label: 'Dirección Exacta'
      };
    }
    if ((a.sucu_Telefono1?.trim() || '') !== (b.sucu_Telefono1?.trim() || '')) {
      this.cambiosDetectados.telefono1 = {
        anterior: b.sucu_Telefono1,
        nuevo: a.sucu_Telefono1,
        label: 'Teléfono 1'
      };
    }
    if ((a.sucu_Telefono2?.trim() || '') !== (b.sucu_Telefono2?.trim() || '')) {
      this.cambiosDetectados.telefono2 = {
        anterior: b.sucu_Telefono2,
        nuevo: a.sucu_Telefono2,
        label: 'Teléfono 2'
      };
    }
    if ((a.sucu_Codigo?.trim() || '') !== (b.sucu_Codigo?.trim() || '')) {
      this.cambiosDetectados.codigo = {
        anterior: b.sucu_Codigo,
        nuevo: a.sucu_Codigo,
        label: 'Código Sucursal'
      };
    }
    if ((a.sucu_Correo?.trim() || '') !== (b.sucu_Correo?.trim() || '')) {
      this.cambiosDetectados.correo = {
        anterior: b.sucu_Correo,
        nuevo: a.sucu_Correo,
        label: 'Correo'
      };
    }
    return Object.keys(this.cambiosDetectados).length > 0;
  }
  cambiosDetectados: any = {};

  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados); 
  }
  aplicarMascaraTelefono(valor: string): string {
    valor = valor.replace(/[^\d]/g, '').slice(0, 8);
    let resultado = '';
    for (let i = 0; i < valor.length; i += 4) {
      if (resultado) resultado += '-';
      resultado += valor.substring(i, i + 4);
    }
    return resultado;
  }

  onTelefonoInput(event: Event, campo: 'sucu_Telefono1' | 'sucu_Telefono2') {
    const input = event.target as HTMLInputElement;
    if (input && input.value !== undefined) {

      let valor = input.value.replace(/[^\d]/g, '');
      if (valor.length > 8) {
        valor = valor.slice(0, 8);
        input.value = valor;
      }
      this.sucursal[campo] = this.aplicarMascaraTelefono(valor);
    }
  }

aplicarmascaracodigo(valor: string): string {
  return valor.replace(/[^\d]/g, '').slice(0, 3);
}

  oncodigoinput(event: Event, campo: 'sucu_Codigo') {
    const input = event.target as HTMLInputElement;
    if (input && input.value !== undefined) {
      // Limita el valor a máximo 3 caracteres, incluso si el usuario pega más
      let valor = input.value.replace(/[^\d]/g, '');
      if (valor.length > 3) {
        valor = valor.slice(0, 3);
        input.value = valor; // Refleja el cambio en el input visualmente
      }
      this.sucursal[campo] = valor;
    }
  }

  aplicarmascaracorreo(correo: string): string {
    return correo.includes("@") && correo.trim().endsWith(".com") ? correo : '';
  }

  validarCorreo(correo: string): boolean {
    if (!correo) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(correo.trim());
  }

    

  // Overlay de carga animado
  mostrarOverlayCarga = false;
  @Input() sucursalData: Sucursales | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Sucursales>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  sucursal: Sucursales = {
    sucu_Id: 0,
    secuencia: 0,
    sucu_Descripcion: '',
    colo_Id: 0,
    sucu_DireccionExacta: '',
    sucu_Telefono1: '',
    sucu_Telefono2: '',
    sucu_Codigo: '',
    sucu_Correo: '',
    usua_Creacion: 0,
    sucu_FechaCreacion: new Date(),
    sucu_Estado: true
  };

  sucursalOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  departamentos: any[] = [];
  departamentoSeleccionado: string = '';
  municipiosAll: any[] = [];
  municipios: any[] = [];
  municipioSeleccionado: string = '';
  coloniasAll: any[] = [];
  colonias: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sucursalData'] && changes['sucursalData'].currentValue) {
      // Normalizar los campos para evitar null/undefined
      const data = { ...changes['sucursalData'].currentValue };
      this.sucursal = {
        sucu_Id: data.sucu_Id ?? 0,
        secuencia: data.secuencia ?? 0,
        sucu_Descripcion: data.sucu_Descripcion ?? '',
        colo_Id: data.colo_Id ?? 0,
        sucu_DireccionExacta: data.sucu_DireccionExacta ?? '',
        sucu_Telefono1: data.sucu_Telefono1 ?? '',
        sucu_Telefono2: data.sucu_Telefono2 ?? '',
        sucu_Codigo: data.sucu_Codigo ?? '',
        sucu_Correo: data.sucu_Correo ?? '',
        usua_Creacion: data.usua_Creacion ?? 0,
        sucu_FechaCreacion: data.sucu_FechaCreacion ? new Date(data.sucu_FechaCreacion) : new Date(),
        sucu_Estado: data.sucu_Estado ?? true
      };
      this.sucursalOriginal = this.sucursal.sucu_Descripcion || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();

      // Cargar departamentos
      this.http.get<any[]>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe(data => {
        this.departamentos = data;

        // Si ya hay una colonia seleccionada, buscar el municipio y departamento correspondiente
        this.http.get<any[]>(`${environment.apiBaseUrl}/Colonia/Listar`, {
          headers: { 'x-api-key': environment.apiKey }
        }).subscribe(coloniasData => {
          this.coloniasAll = coloniasData;
          const coloniaActual = this.coloniasAll.find(c => c.colo_Id === this.sucursal.colo_Id);
          this.municipioSeleccionado = coloniaActual ? coloniaActual.muni_Codigo : '';
          // Buscar el municipio para obtener el departamento
          this.http.get<any[]>(`${environment.apiBaseUrl}/Municipios/Listar`, {
            headers: { 'x-api-key': environment.apiKey }
          }).subscribe(munisData => {
            this.municipiosAll = munisData;
            const municipioActual = this.municipiosAll.find(m => m.muni_Codigo === this.municipioSeleccionado);
            this.departamentoSeleccionado = municipioActual ? municipioActual.depa_Codigo : '';
            this.onDepartamentoChange();
            this.onMunicipioChange();
          });
        });
      });
    }
  }

  onDepartamentoChange(): void {
    if (this.departamentoSeleccionado) {
      this.municipios = this.municipiosAll.filter(
        m => m.depa_Codigo === this.departamentoSeleccionado
      );
      // Si el municipio actual no pertenece al departamento seleccionado, limpiar selección
      if (!this.municipios.some(m => m.muni_Codigo === this.municipioSeleccionado)) {
        this.municipioSeleccionado = '';
        this.colonias = [];
        this.sucursal.colo_Id = 0;
      }
    } else {
      this.municipios = [];
      this.municipioSeleccionado = '';
      this.colonias = [];
      this.sucursal.colo_Id = 0;
    }
  }

  onMunicipioChange(): void {
    if (this.municipioSeleccionado) {
      this.colonias = this.coloniasAll.filter(
        c => c.muni_Codigo === this.municipioSeleccionado
      );
      // Si la colonia actual no pertenece al municipio seleccionado, limpiar selección
      if (!this.colonias.some(c => c.colo_Id === this.sucursal.colo_Id)) {
        this.sucursal.colo_Id = 0;
      }
    } else {
      this.colonias = [];
      this.sucursal.colo_Id = 0;
    }
  }

  cancelar(): void {
    this.cerrarAlerta();
    setTimeout(() => {
      this.onOverlayChange.emit(false);
      this.onCancel.emit();
    }, 100);
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  validarEdicion(): void {
    this.mostrarErrores = true;

    // Validar correo electrónico
    if (this.sucursal.sucu_Correo.trim() && !this.validarCorreo(this.sucursal.sucu_Correo)) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor ingrese un correo electrónico válido.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }
    // Validación estricta para sucu_Codigo
    if (!this.sucursal.sucu_Codigo || this.sucursal.sucu_Codigo.trim().length !== 3) {
      this.mostrarAlertaWarning = true;
      this.mostrarErrores = true;
      this.mensajeWarning = 'El código de sucursal debe tener 3 caracteres.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }   
    
    if (
      this.sucursal.sucu_Descripcion.trim() &&
      this.sucursal.colo_Id &&
      this.sucursal.sucu_DireccionExacta.trim() &&
      this.sucursal.sucu_Codigo &&
      this.sucursal.sucu_Codigo.trim() &&
      this.sucursal.sucu_Telefono1.trim() &&
      this.sucursal.sucu_Correo.trim() &&
      this.validarCorreo(this.sucursal.sucu_Correo)
    ) {
      if (this.hayDiferencias()) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
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
    this.guardar();
  }

  private guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
      const sucursalActualizar = {
        ...this.sucursal,
        usua_Modificacion: getUserId(),
        sucu_FechaModificacion: new Date().toISOString()
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Sucursales/Actualizar`, sucursalActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mostrarErrores = false;
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            if (response?.data?.code_Status === 1) {
              this.mensajeExito = response.data.message_Status || `Sucursal "${this.sucursal.sucu_Descripcion}" actualizada exitosamente`;
              this.mostrarAlertaExito = true;
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                setTimeout(() => {
                  this.onSave.emit(this.sucursal);
                  this.cancelar();
                }, 100);
              }, 2000);
            } else {
              this.mostrarAlertaError = true;
              this.mensajeError = response?.data?.message_Status || 'No se pudo actualizar la sucursal.';
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            }
          }, 300);
        },
        error: (error) => {
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            this.mostrarAlertaError = true;
            this.mensajeError = error?.error?.data?.message_Status || 'Error al actualizar la sucursal. Por favor, intente nuevamente.';
            this.mostrarAlertaExito = false;
            setTimeout(() => this.cerrarAlerta(), 5000);
          }, 1000);
        }
      });
  }
}