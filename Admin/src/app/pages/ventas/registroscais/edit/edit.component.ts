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

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss',
})
export class EditComponent implements OnChanges {
  @Input() RegistroCaiData: RegistroCAI | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<RegistroCAI>();

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

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;
  RCOriginal: any = {};

  CAI: any[] = [];
  PE: any[] = [];
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

    console.log('Puntos Emision', this.PE);
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

  Sucursales: any[] = [];

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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['RegistroCaiData'] && changes['RegistroCaiData'].currentValue) {
      this.registroCai = { ...changes['RegistroCaiData'].currentValue };
      this.RCOriginal = { ...this.RegistroCaiData };
      this.mostrarErrores = false;
      this.cerrarAlerta();
    }
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

  validarEdicion(): void {
    this.mostrarErrores = true;

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

    if (a.regC_RangoInicial !== b.regC_RangoInicial) {
      this.cambiosDetectados.RangoInicial = {
        anterior: b.regC_RangoInicial,
        nuevo: a.regC_RangoInicial,
        label: 'Rango Inicial',
      };
    }

    if (a.regC_RangoFinal !== b.regC_RangoFinal) {
      this.cambiosDetectados.RangoFinal = {
        anterior: b.regC_RangoFinal,
        nuevo: a.regC_RangoFinal,
        label: 'Rango Final',
      };
    }

    if (a.regC_FechaInicialEmision !== b.regC_FechaInicialEmision) {
      this.cambiosDetectados.FechaInical = {
        anterior: b.regC_FechaInicialEmision,
        nuevo: a.regC_FechaInicialEmision,
        label: 'Fecha Inicial',
      };
    }

    if (a.regC_FechaFinalEmision !== b.regC_FechaFinalEmision) {
      this.cambiosDetectados.FechaFinal = {
        anterior: b.regC_FechaFinalEmision,
        nuevo: a.regC_FechaFinalEmision,
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
        regC_RangoInicial: this.registroCai.regC_RangoInicial,
        regC_RangoFinal: this.registroCai.regC_RangoFinal,
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
            console.error('Error al actualizar el Registro CAI:', error);
            //console.log('Atualizar el Registro CAI:', RegistroCAIActualizar);
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
