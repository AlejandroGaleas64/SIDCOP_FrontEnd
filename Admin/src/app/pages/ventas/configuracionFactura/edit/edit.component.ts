import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-edit-config-factura',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule, 
    NgSelectModule,
    NgxMaskDirective
  ],
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
  providers: [provideNgxMask()]
})
export class EditConfigFacturaComponent implements OnChanges {
  @Input() configFacturaData: any | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  configFactura: any = {
    coFa_Id: 0,
    coFa_NombreEmpresa: '',
    coFa_DireccionEmpresa: '',
    coFa_RTN: '',
    coFa_Correo: '',
    coFa_Telefono1: '',
    coFa_Telefono2: '',
    coFa_Logo: '',
    colo_Id: 0,
    usua_Creacion: 0,
    usua_Modificacion: 0,
    coFa_FechaCreacion: new Date(),
    coFa_FechaModificacion: new Date()
  };

  configFacturaOriginal: any = {};
  
  // Catálogos
  colonia: any[] = [];
  
  logoSeleccionado = false;

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mostrarAlertaError = false;
  mostrarAlertaWarning = false;
  mostrarConfirmacionEditar = false;

  mensajeExito = '';
  mensajeError = '';
  mensajeWarning = '';

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['configFacturaData']?.currentValue) {
      this.configFactura = { ...this.configFacturaData };
      this.configFacturaOriginal = { ...this.configFacturaData };
      this.logoSeleccionado = !!this.configFactura.coFa_Logo;
      this.mostrarErrores = false;
      this.cerrarAlerta();
      this.listarColonias();
    }
  }

  // Función de búsqueda para colonias (igual que en crear)
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  // Función para ordenar por municipio y departamento (igual que en crear)
  ordenarPorMunicipioYDepartamento(colonias: any[]): any[] {
    return colonias.sort((a, b) => {
      // Primero por departamento
      if (a.depa_Descripcion < b.depa_Descripcion) return -1;
      if (a.depa_Descripcion > b.depa_Descripcion) return 1;
      // Luego por municipio
      if (a.muni_Descripcion < b.muni_Descripcion) return -1;
      if (a.muni_Descripcion > b.muni_Descripcion) return 1;
      return 0;
    });
  }

  // Cargar colonias (igual que en crear)
  listarColonias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.colonia = this.ordenarPorMunicipioYDepartamento(data),
      error: (error) => console.error('Error cargando colonias:', error)
    });
  }

  // Variable para dirección inicial
  direccionExactaInicial: string = '';

  // Método cuando se selecciona una colonia (igual que en crear)
  onColoniaSeleccionada(colo_Id: number) {
    const coloniaSeleccionada = this.colonia.find((c: any) => c.colo_Id === colo_Id);

    if (coloniaSeleccionada) {
      this.direccionExactaInicial = coloniaSeleccionada.colo_Descripcion;
      this.configFactura.coFa_DireccionEmpresa = coloniaSeleccionada.colo_Descripcion;
    } else {
      this.direccionExactaInicial = '';
      this.configFactura.coFa_DireccionEmpresa = '';
    }
  }

  onImagenSeleccionada(event: any) {
    // Obtenemos el archivo seleccionado desde el input tipo file
    const file = event.target.files[0];

    if (file) {
      // para enviar la imagen a Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'configuracion_empresa');
      //Subidas usuarios Carpeta identificadora en Cloudinary
      //dbt7mxrwk es el nombre de la cuenta de Cloudinary
      const url = 'https://api.cloudinary.com/v1_1/dbt7mxrwk/upload';

      fetch(url, {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        console.log('Imagen subida a Cloudinary:', data);
        this.configFactura.coFa_Logo = data.secure_url;
      })
      .catch(error => {
        console.error('Error al subir la imagen a Cloudinary:', error);
      });
    }
  }

  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.validarCampos()) {
      if (this.hayDiferencias()) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      // El mensaje de error ya se establece en validarCampos()
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  // Método para validar todos los campos obligatorios - MEJORADO
  private validarCampos(): boolean {
    const errores: string[] = [];

    // Validar campos básicos requeridos
    if (!this.configFactura.coFa_NombreEmpresa.trim()) {
      errores.push('Nombre de la empresa');
    }

    if (!this.configFactura.coFa_DireccionEmpresa.trim()) {
      errores.push('Dirección de la empresa');
    }

    if (!this.configFactura.coFa_RTN.trim()) {
      errores.push('RTN');
    } else if (!this.isValidRTN(this.configFactura.coFa_RTN)) {
      errores.push('RTN debe tener exactamente 14 dígitos');
    }

    if (!this.configFactura.coFa_Correo.trim()) {
      errores.push('Correo electrónico');
    } else if (!this.isValidEmail(this.configFactura.coFa_Correo)) {
      errores.push('Correo electrónico debe tener un formato válido');
    }

    if (!this.configFactura.coFa_Telefono1.trim()) {
      errores.push('Teléfono principal');
    }

    if (!this.configFactura.coFa_Logo) {
      errores.push('Logo');
    }

    if (this.configFactura.colo_Id === 0) {
      errores.push('Colonia');
    }

    if (errores.length > 0) {
      this.mensajeWarning = `Por favor corrija los siguientes campos: ${errores.join(', ')}`;
      this.mostrarAlertaWarning = true;
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      return false;
    }

    return true;
  }

  // Validación RTN - solo números y máximo 14 dígitos
  onRTNInput(event: any): void {
    let value = event.target.value;
    // Remover todo lo que no sean números
    value = value.replace(/\D/g, '');
    // Limitar a 14 dígitos
    if (value.length > 14) {
      value = value.substring(0, 14);
    }
    this.configFactura.coFa_RTN = value;
    event.target.value = value;
  }

  // Validación de correo electrónico - MEJORADA
  isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  // Verificar si RTN tiene exactamente 14 dígitos - MEJORADA
  isValidRTN(rtn: string): boolean {
    if (!rtn || rtn.trim() === '') return false;
    return rtn.length === 14 && /^\d{14}$/.test(rtn);
  }

  // Método para validar RTN en tiempo real
  getRTNValidationClass(): string {
    if (!this.mostrarErrores) return '';
    return this.isValidRTN(this.configFactura.coFa_RTN) ? 'is-valid' : 'is-invalid';
  }

  // Método para validar email en tiempo real
  getEmailValidationClass(): string {
    if (!this.mostrarErrores) return '';
    return this.isValidEmail(this.configFactura.coFa_Correo) ? 'is-valid' : 'is-invalid';
  }

  // Objeto para almacenar los cambios detectados
  cambiosDetectados: any = {};

  hayDiferencias(): boolean {
    const a = this.configFactura;
    const b = this.configFacturaOriginal;
    this.cambiosDetectados = {};

    // Verificar cada campo y almacenar los cambios
    if (a.coFa_NombreEmpresa !== b.coFa_NombreEmpresa) {
      this.cambiosDetectados.nombreEmpresa = {
        anterior: b.coFa_NombreEmpresa,
        nuevo: a.coFa_NombreEmpresa,
        label: 'Nombre de la Empresa'
      };
    }

    if (a.coFa_DireccionEmpresa !== b.coFa_DireccionEmpresa) {
      this.cambiosDetectados.direccion = {
        anterior: b.coFa_DireccionEmpresa,
        nuevo: a.coFa_DireccionEmpresa,
        label: 'Dirección'
      };
    }

    if (a.coFa_RTN !== b.coFa_RTN) {
      this.cambiosDetectados.rtn = {
        anterior: b.coFa_RTN,
        nuevo: a.coFa_RTN,
        label: 'RTN'
      };
    }

    if (a.coFa_Correo !== b.coFa_Correo) {
      this.cambiosDetectados.correo = {
        anterior: b.coFa_Correo,
        nuevo: a.coFa_Correo,
        label: 'Correo Electrónico'
      };
    }

    if (a.coFa_Telefono1 !== b.coFa_Telefono1) {
      this.cambiosDetectados.telefono1 = {
        anterior: b.coFa_Telefono1,
        nuevo: a.coFa_Telefono1,
        label: 'Teléfono Principal'
      };
    }

    if (a.coFa_Telefono2 !== b.coFa_Telefono2) {
      this.cambiosDetectados.telefono2 = {
        anterior: b.coFa_Telefono2 || 'Sin teléfono',
        nuevo: a.coFa_Telefono2 || 'Sin teléfono',
        label: 'Teléfono Secundario'
      };
    }

    if (a.colo_Id !== b.colo_Id) {
      const coloniaAnterior = this.colonia.find(c => c.colo_Id === b.colo_Id);
      const coloniaNueva = this.colonia.find(c => c.colo_Id === a.colo_Id);
      
      this.cambiosDetectados.colonia = {
        anterior: coloniaAnterior ? `${coloniaAnterior.colo_Descripcion} - ${coloniaAnterior.muni_Descripcion} - ${coloniaAnterior.depa_Descripcion}` : 'No seleccionada',
        nuevo: coloniaNueva ? `${coloniaNueva.colo_Descripcion} - ${coloniaNueva.muni_Descripcion} - ${coloniaNueva.depa_Descripcion}` : 'No seleccionada',
        label: 'Colonia'
      };
    }

    if (a.coFa_Logo !== b.coFa_Logo) {
      this.cambiosDetectados.logo = {
        anterior: b.coFa_Logo ? 'Logo actual' : 'Sin logo',
        nuevo: a.coFa_Logo ? 'Nuevo logo' : 'Sin logo',
        label: 'Logo de la Empresa'
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  
  // Método para obtener la lista de cambios como array
  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  private guardar(): void {
    // Validación final antes de guardar
    if (!this.validarCampos()) {
      return;
    }

    const body = {
      ...this.configFactura,
      usua_Modificacion: getUserId(),
      coFa_FechaModificacion: new Date().toISOString()
    };

    this.http.put<any>(`${environment.apiBaseUrl}/ConfiguracionFactura/Actualizar`, body, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: () => {
        this.mostrarAlertaExito = true;
        this.mensajeExito = 'Configuración actualizada exitosamente.';
        this.mostrarErrores = false;
        setTimeout(() => {
          this.onSave.emit(this.configFactura);
          this.cancelar();
        }, 3000);
      },
      error: (error) => {
        console.error('Error al actualizar:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar. Intente de nuevo.';
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
  }

  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeWarning = '';
  }
}