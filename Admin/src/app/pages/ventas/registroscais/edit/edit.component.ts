import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { RegistroCAI } from 'src/app/Modelos/ventas/RegistroCAI.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';
import { DatePipe } from '@angular/common';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';


@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule, NgxMaskDirective],
  providers: [DatePipe, provideNgxMask()],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
})
export class EditComponent implements OnChanges {
  // ===== PROPIEDADES DE ENTRADA Y SALIDA =====
  @Input() RegistroCaiData: RegistroCAI | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<RegistroCAI>();

  // ===== MODELO DE DATOS =====
  registroCai: RegistroCAI = {
    regC_Id: 0,
    regC_Descripcion: '',
    sucu_Id: 0,
    puEm_Id: 0,
    nCai_Id: 0,
    regC_RangoInicial: '',
    regC_RangoFinal: '',
    regC_FechaInicialEmision: new Date(),
    regC_FechaFinalEmision: new Date(),

    usua_Creacion: 0,
    usua_Modificacion: 0,

    regC_FechaCreacion: new Date(),
    regC_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    regC_Estado: true,

    sucu_Descripcion: '',
    puEm_Codigo: '',
    nCai_Codigo: '',
    nCai_Descripcion: '',
    puEm_Descripcion: '',
  };

  // ===== PROPIEDADES PARA ALERTAS =====
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;
  RCOriginal: any = {};

  // ===== PROPIEDADES PARA VISTA PREVIA =====
  numeroFacturaFormateado: string = '';

  // Función para obtener el valor numérico sin máscara
  private getUnmaskedValue(maskedValue: string): string {
    if (!maskedValue) return '';
    // Convertir a string si no lo es y eliminar todos los caracteres no numéricos
    return maskedValue.toString().replace(/\D/g, '');
  }

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
      .subscribe((data) => {
        this.CAI = data;
        // Actualizar vista previa cuando se cargan los datos
        setTimeout(() => this.actualizarNumeroFactura(), 50);
      });
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
      .subscribe((data) => {
        this.PE = data;
        // Actualizar vista previa cuando se cargan los datos
        setTimeout(() => this.actualizarNumeroFactura(), 50);
      });

    //.log('Puntos Emision', this.PE);
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
        (data) => {
          this.Sucursales = this.ordenarPorMunicipioYDepartamento(data);
          // Actualizar vista previa cuando se cargan los datos
          setTimeout(() => this.actualizarNumeroFactura(), 50);
        }
      );
  }

  constructor(private http: HttpClient, private datePipe: DatePipe) {
    this.cargarCAI();
    this.cargarSucursales();
    this.cargarPE();
  }

  // ===== MÉTODOS DE VISTA PREVIA =====
  actualizarNumeroFactura(): void {
    try {
      // Verificar que las listas estén cargadas antes de proceder
      if (!this.Sucursales || !this.PE || this.Sucursales.length === 0 || this.PE.length === 0) {
        this.numeroFacturaFormateado = '--- - --- - 01 - 00000000 al --- - --- - 01 - 00000000';
        return;
      }

      const sucursalSeleccionada = this.Sucursales.find(s => s.sucu_Id === this.registroCai.sucu_Id);
      const puntoEmisionSeleccionado = this.PE.find(pe => pe.puEm_Id === this.registroCai.puEm_Id);
      
      // Usar valores por defecto más seguros
      const codigoSucursal = sucursalSeleccionada?.sucu_Codigo || '___';
      const codigoPuntoEmision = puntoEmisionSeleccionado?.puEm_Codigo || '___';
      
      let formato = '';
      
      // Verificar que los rangos existan y no sean nulos/undefined
      const rangoInicialTexto = this.registroCai.regC_RangoInicial?.toString() || '';
      const rangoFinalTexto = this.registroCai.regC_RangoFinal?.toString() || '';
      
      if (rangoInicialTexto.trim() && rangoFinalTexto.trim()) {
        // Obtener valores sin máscara y formatear con ceros a la izquierda (8 dígitos)
        const rangoInicial = this.getUnmaskedValue(rangoInicialTexto).padStart(8, '0');
        const rangoFinal = this.getUnmaskedValue(rangoFinalTexto).padStart(8, '0');
        
        // Número de factura inicial completo
        const facturaInicial = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - ${rangoInicial}`;
        
        // Número de factura final completo
        const facturaFinal = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - ${rangoFinal}`;
        
        formato = `${facturaInicial} al ${facturaFinal}`;
      } else {
        formato = `${codigoSucursal} - ${codigoPuntoEmision} - 01 - 00000000 al ${codigoSucursal} - ${codigoPuntoEmision} - 01 - 00000000`;
      }
      
      this.numeroFacturaFormateado = formato;
    } catch (error) {
      // En caso de error, mostrar formato por defecto
      console.warn('Error al actualizar número de factura:', error);
      this.numeroFacturaFormateado = '--- - --- - 01 - 00000000 al --- - --- - 01 - 00000000';
    }
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

  // ===== CICLO DE VIDA DEL COMPONENTE =====
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['RegistroCaiData'] && changes['RegistroCaiData'].currentValue) {
      this.registroCai = { ...changes['RegistroCaiData'].currentValue };
      this.RCOriginal = { ...this.RegistroCaiData };
      this.mostrarErrores = false;
      this.cerrarAlerta();
      
      // Actualizar vista previa después de cargar los datos con un delay más largo
      // para asegurar que todas las listas estén cargadas
      setTimeout(() => {
        this.actualizarNumeroFactura();
      }, 200);
    }
  }

  cancelar(): void {
    this.cerrarAlerta();
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

  validarEdicion(): void {
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
    if (new Date(this.registroCai.regC_FechaInicialEmision) >= new Date(this.registroCai.regC_FechaFinalEmision)) {
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
      this.registroCai.regC_FechaInicialEmision &&
      this.registroCai.regC_FechaFinalEmision
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
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  // ===== DETECCIÓN DE CAMBIOS =====
  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cambiosDetectados: any = {};

  hayDiferencias(): boolean {
    const a = this.registroCai;
    const b = this.RCOriginal;
    this.cambiosDetectados = {};

    // Verificar cada campo y almacenar los cambios
    if (a.regC_Descripcion !== b.regC_Descripcion) {
      this.cambiosDetectados.Descripción = {
        anterior: b.regC_Descripcion,
        nuevo: a.regC_Descripcion,
        label: 'Descripción',
      };
    }

    if (a.sucu_Id !== b.sucu_Id) {
      const sucursalAnterior = this.Sucursales.find(
        (c) => c.sucu_Id === b.sucu_Id
      );
      const sucursalNueva = this.Sucursales.find(
        (c) => c.sucu_Id === a.sucu_Id
      );

      this.cambiosDetectados.Observaciones = {
        anterior: sucursalAnterior
          ? `${sucursalAnterior.sucu_Descripcion} - ${sucursalAnterior.muni_Descripcion} - ${sucursalAnterior.depa_Descripcion}`
          : 'No seleccionada',
        nuevo: sucursalNueva
          ? `${sucursalNueva.sucu_Descripcion} - ${sucursalNueva.muni_Descripcion} - ${sucursalNueva.depa_Descripcion}`
          : 'No seleccionada',
        label: 'Sucursal',
      };
    }

    if (a.nCai_Id !== b.nCai_Id) {
      const caiAnterior = this.CAI.find((c) => c.nCai_Id === b.nCai_Id);
      const caiNueva = this.CAI.find((c) => c.nCai_Id === a.nCai_Id);

      this.cambiosDetectados.Observaciones = {
        anterior: caiAnterior
          ? `${caiAnterior.nCai_Codigo} - ${caiAnterior.nCai_Descripcion}`
          : 'No seleccionada',
        nuevo: caiNueva
          ? `${caiNueva.nCai_Codigo} - ${caiNueva.nCai_Descripcion}`
          : 'No seleccionada',
        label: 'CAI',
      };
    }

    if (a.puEm_Id !== b.puEm_Id) {
      const peAnterior = this.PE.find((c) => c.puEm_Id === b.puEm_Id);
      const peNueva = this.PE.find((c) => c.puEm_Id === a.puEm_Id);

      this.cambiosDetectados.Observaciones = {
        anterior: peAnterior
          ? `${peAnterior.puEm_Codigo} - ${peAnterior.puEm_Descripcion} - ${peAnterior.sucu_Descripcion}`
          : 'No seleccionada',
        nuevo: peNueva
          ? `${peNueva.puEm_Codigo} - ${peNueva.puEm_Descripcion} - ${peNueva.sucu_Descripcion}`
          : 'No seleccionada',
        label: 'Punto de Emision',
      };
    }

    if (this.getUnmaskedValue(a.regC_RangoInicial) !== this.getUnmaskedValue(b.regC_RangoInicial)) {
      this.cambiosDetectados.RangoInicial = {
        anterior: this.getUnmaskedValue(b.regC_RangoInicial),
        nuevo: this.getUnmaskedValue(a.regC_RangoInicial),
        label: 'Rango Inicial',
      };
    }

    if (this.getUnmaskedValue(a.regC_RangoFinal) !== this.getUnmaskedValue(b.regC_RangoFinal)) {
      this.cambiosDetectados.RangoFinal = {
        anterior: this.getUnmaskedValue(b.regC_RangoFinal),
        nuevo: this.getUnmaskedValue(a.regC_RangoFinal),
        label: 'Rango Final',
      };
    }

   if (a.regC_FechaInicialEmision !== b.regC_FechaInicialEmision) {
  this.cambiosDetectados.FechaInical = {
    anterior: this.datePipe.transform(b.regC_FechaInicialEmision, 'dd/MM/yyyy'),
    nuevo: this.datePipe.transform(a.regC_FechaInicialEmision, 'dd/MM/yyyy'),
    label: 'Fecha Inicial',
  };
}

if (a.regC_FechaFinalEmision !== b.regC_FechaFinalEmision) {
  this.cambiosDetectados.FechaFinal = {
    anterior: this.datePipe.transform(b.regC_FechaFinalEmision, 'dd/MM/yyyy'),
    nuevo: this.datePipe.transform(a.regC_FechaFinalEmision, 'dd/MM/yyyy'),
    label: 'Fecha Final',
  };
}


    return Object.keys(this.cambiosDetectados).length > 0;
  }

  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  // ===== GETTERS Y SETTERS =====
  get fechaInicioFormato(): string {
    return new Date(this.registroCai.regC_FechaInicialEmision)
      .toISOString()
      .split('T')[0];
  }

  set fechaInicioFormato(value: string) {
    this.registroCai.regC_FechaInicialEmision = new Date(value);
  }

  get fechaFinFormato(): string {
    return new Date(this.registroCai.regC_FechaFinalEmision)
      .toISOString()
      .split('T')[0];
  }

  set fechaFinFormato(value: string) {
    this.registroCai.regC_FechaFinalEmision = new Date(value);
  }

  // ===== MÉTODOS PRIVADOS =====
  private guardar(): void {
    this.mostrarErrores = true;

    if (this.registroCai.regC_Descripcion.trim() &&
        this.registroCai.sucu_Id && 
        this.registroCai.nCai_Id && 
        this.registroCai.puEm_Id &&
        this.registroCai.regC_RangoInicial.trim() &&
        this.registroCai.regC_RangoFinal.trim() &&
        this.registroCai.regC_FechaInicialEmision &&
        this.registroCai.regC_FechaFinalEmision) {
      const registroCAIActualizar = {
        regC_Id: this.registroCai.regC_Id,
        regC_Descripcion: this.registroCai.regC_Descripcion,
        sucu_Id: this.registroCai.sucu_Id,
        puEm_Id: this.registroCai.puEm_Id,
        nCai_Id: this.registroCai.nCai_Id,
        regC_RangoInicial: this.getUnmaskedValue(this.registroCai.regC_RangoInicial),
        regC_RangoFinal: this.getUnmaskedValue(this.registroCai.regC_RangoFinal),
        regC_FechaInicialEmision: this.registroCai.regC_FechaInicialEmision,
        regC_FechaFinalEmision: this.registroCai.regC_FechaFinalEmision,
        regC_Estado: true,
        usua_Modificacion: getUserId(),
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

      this.http
        .put<any>(
          `${environment.apiBaseUrl}/RegistrosCaiS/Modificar`,
          registroCAIActualizar,
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
        
            this.mostrarAlertaError = true;
            this.mensajeError = 'Por favor, intente nuevamente.';
            setTimeout(() => this.cerrarAlerta(), 5000);
          },
        });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}
