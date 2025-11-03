import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RegistroCAI } from 'src/app/Modelos/ventas/RegistroCAI.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
//import { co } from '@fullcalendar/core/internal-common';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule, NgxMaskDirective],
  providers: [provideNgxMask()],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
})
export class CreateComponent {
  // ===== PROPIEDADES DE SALIDA =====
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<RegistroCAI>();

  // ===== PROPIEDADES PARA ALERTAS =====
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // ===== LISTAS PARA DROPDOWNS =====
  CAI: any[] = [];
  PE: any[] = [];
  Sucursales: any[] = [];

  // ===== MÉTODOS AUXILIARES =====
  searchCAI = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.nCai_Codigo?.toLowerCase().includes(term) ||
      item.nCai_Descripcion?.toLowerCase().includes(term)
    );
  };

  cargarCAI() {
    this.http
      .get<any>(`${environment.apiBaseUrl}/CaiS/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe((data) => (this.CAI = data));
  }

  searchPuntoEmision = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.puEm_Descripcion?.toLowerCase().includes(term) ||
      item.sucu_Descripcion?.toLowerCase().includes(term) ||
      item.puEm_Codigo?.toLowerCase().includes(term)
    );
  };

  cargarPE() {
    this.http
      .get<any>(`${environment.apiBaseUrl}/PuntoEmision/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe((data) => (this.PE = data));
  }

  ordenarPorMunicipioYDepartamento(sucursales: any[]): any[] {
    return sucursales.sort((a, b) => {
      if (a.depa_Descripcion < b.depa_Descripcion) return -1;
      if (a.depa_Descripcion > b.depa_Descripcion) return 1;
      if (a.muni_Descripcion < b.muni_Descripcion) return -1;
      if (a.muni_Descripcion > b.muni_Descripcion) return 1;
      return 0;
    });
  }

  searchSucursal = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.sucu_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  cargarSucursales() {
    this.http
      .get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
        headers: { 'x-api-key': environment.apiKey },
      })
      .subscribe(
        (data) =>
          (this.Sucursales = this.ordenarPorMunicipioYDepartamento(data))
      );
  }

  constructor(private http: HttpClient) {
    this.cargarCAI();
    this.cargarSucursales();
    this.cargarPE();
  }

  // ===== MÉTODOS DE VISTA PREVIA =====
  actualizarNumeroFactura(): void {
    const sucursalSeleccionada = this.Sucursales.find(s => s.sucu_Id === this.registroCai.sucu_Id);
    const puntoEmisionSeleccionado = this.PE.find(pe => pe.puEm_Id === this.registroCai.puEm_Id);
    
    let codigoSucursal = '';
    let codigoPuntoEmision = '';
    
    if (sucursalSeleccionada) {
      codigoSucursal = sucursalSeleccionada.sucu_Codigo || '___';
    } else {
      codigoSucursal = '___';
    }
    
    if (puntoEmisionSeleccionado) {
      codigoPuntoEmision = puntoEmisionSeleccionado.puEm_Codigo || '___';
    } else {
      codigoPuntoEmision = '___';
    }
    
    let formato = '';
    
    if (this.registroCai.regC_RangoInicial.trim() && this.registroCai.regC_RangoFinal.trim()) {
      // Obtener valores sin máscara y formatear con ceros a la izquierda (8 dígitos)
      const rangoInicial = this.getUnmaskedValue(this.registroCai.regC_RangoInicial).padStart(8, '0');
      const rangoFinal = this.getUnmaskedValue(this.registroCai.regC_RangoFinal).padStart(8, '0');
      
      // Número de factura inicial completo
      const facturaInicial = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - ${rangoInicial}`;
      
      // Número de factura final completo
      const facturaFinal = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - ${rangoFinal}`;
      
      formato = `${facturaInicial} al ${facturaFinal}`;
    } else {
      formato = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - 00000000 al ${codigoSucursal} - ${codigoPuntoEmision} - 01 - 00000000`;
    }
    
    this.numeroFacturaFormateado = formato;
  }

  onSucursalChange(): void {
    this.actualizarNumeroFactura();
  }

  onPuntoEmisionChange(): void {
    this.actualizarNumeroFactura();
  }

  onRangoChange(): void {
    this.actualizarNumeroFactura();
  }

  // ===== PROPIEDADES PARA VISTA PREVIA =====
  fechaInicialEmision: string = '';
  fechaFinalEmision: string = '';
  numeroFacturaFormateado: string = '';

  // Función para obtener el valor numérico sin máscara
  private getUnmaskedValue(maskedValue: string): string {
    return maskedValue ? maskedValue.replace(/\D/g, '') : '';
  }

  // ===== MODELO DE DATOS =====
  registroCai: RegistroCAI = {
    regC_Id: 0,
    regC_Descripcion: '',
    sucu_Id: 0,
    sucu_Descripcion: '',
    puEm_Id: 0,
    puEm_Codigo: '',
    puEm_Descripcion: '',
    nCai_Id: 0,
    nCai_Codigo: '',
    nCai_Descripcion: '',
    regC_RangoInicial: '',
    regC_RangoFinal: '',
    regC_FechaInicialEmision: new Date(),
    regC_FechaFinalEmision: new Date(),

    regC_Estado: true,
    usua_Creacion: 0,
    usua_Modificacion: 0,
    estado: '',
    regC_FechaCreacion: new Date(),
    regC_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
  };

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.fechaInicialEmision = '';
    this.fechaFinalEmision = '';
    this.numeroFacturaFormateado = '';
    this.registroCai = {
      regC_Id: 0,
      regC_Descripcion: '',
      sucu_Id: 0,
      sucu_Descripcion: '',
      puEm_Id: 0,
      puEm_Codigo: '',
      puEm_Descripcion: '',
      nCai_Id: 0,
      nCai_Codigo: '',
      nCai_Descripcion: '',
      regC_RangoInicial: '',
      regC_RangoFinal: '',
      regC_FechaInicialEmision: new Date(),
      regC_FechaFinalEmision: new Date(),

      usua_Creacion: 0,
      usua_Modificacion: 0,
      regC_Estado: true,

      regC_FechaCreacion: new Date(),
      regC_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
    };
    this.onCancel.emit();
  }

  // ===== MÉTODOS DE CONTROL DE FORMULARIO =====
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // ===== MÉTODOS CRUD =====
  guardar(): void {
    this.mostrarErrores = true;

     // Validar que el rango inicial no sea mayor que el rango final
    const rangoInicial = parseInt(this.getUnmaskedValue(this.registroCai.regC_RangoInicial)) || 0;
    const rangoFinal = parseInt(this.getUnmaskedValue(this.registroCai.regC_RangoFinal)) || 0;
    
    if (rangoInicial >= rangoFinal) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'El rango inicial no puede ser mayor o igual que el rango final.';
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      return;
    }

  // Validar que la fecha inicial no sea mayor que la fecha final
  if (new Date(this.fechaInicialEmision) >= new Date(this.fechaFinalEmision)) {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'La fecha inicial no puede ser mayor o igual que la fecha final.';
    setTimeout(() => {
      this.mostrarAlertaWarning = false;
      this.mensajeWarning = '';
    }, 4000);
    return;
  }

    if (
      this.registroCai.regC_Descripcion.trim() &&
      this.registroCai.sucu_Id &&
      this.registroCai.nCai_Id &&
      this.registroCai.puEm_Id &&
      this.registroCai.regC_RangoInicial.trim() &&
      this.registroCai.regC_RangoFinal.trim() &&
      this.fechaInicialEmision &&
      this.fechaFinalEmision
    ) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;

      const registroscaisGuardar = {
        regC_Id: 0,
        regC_Descripcion: this.registroCai.regC_Descripcion,
        sucu_Id: this.registroCai.sucu_Id,
        puEm_Id: this.registroCai.puEm_Id,
        nCai_Id: this.registroCai.nCai_Id,
        regC_RangoInicial: this.getUnmaskedValue(this.registroCai.regC_RangoInicial),
        regC_RangoFinal: this.getUnmaskedValue(this.registroCai.regC_RangoFinal),
        regC_FechaInicialEmision: new Date(this.fechaInicialEmision),
        regC_FechaFinalEmision: new Date(this.fechaFinalEmision),
        regC_Estado: true,
        usua_creacion: getUserId(),
        regC_FechaCreacion: new Date(),
        usua_Modificacion: 0,
        regC_FechaModificacion: new Date(),
        secuencia: 0,
        estado: '',
        usuarioCreacion: '',
        usuarioModificacion: '',
        sucu_Descripcion: '',
        puEm_Descripcion: '',
        nCai_Descripcion: '',
        puEm_Codigo: '',
        nCai_Codigo: '',
      };

      //console.log('Guardando registro:', registroscaisGuardar);

      this.http
        .post<any>(
          `${environment.apiBaseUrl}/RegistrosCaiS/Crear`,
          registroscaisGuardar,
          {
            headers: {
              'X-Api-Key': environment.apiKey,
              'Content-Type': 'application/json',
              accept: '*/*',
            },
          }
        )
        .subscribe({
          next: (response) => {
            if (response.data.code_Status === 1) {
              this.mostrarErrores = false;
              this.onSave.emit(this.registroCai);
              this.cancelar();
            } else {
              console.error(
                'Error al guardar RC:' + Error
              );
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status;
              this.mostrarAlertaExito = false;

              // Ocultar la alerta de error después de 5 segundos
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            }
          },
          error: (error) => {
            console.error('Error al guardar Registro CAI:', error);
            this.mostrarAlertaError = true;
            this.mensajeError =
              'Error al ingresar Registro CAI. Por favor, intente nuevamente.';
            this.mostrarAlertaExito = false;

            // Ocultar la alerta de error después de 5 segundos
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          },
        });
    } else {
      // Mostrar alerta de warning para campos vacíos
        //Para que el mensaje no se sobreponga
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;

      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}
