import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Bodega } from 'src/app/Modelos/logistica/Bodega.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnChanges {
  @Input() bodegaData: Bodega | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Bodega>();

  bodega: Bodega = {
    bode_Id: 0,
    bode_Descripcion: '',
    bode_Capacidad: 0,
    bode_Placa: '',
    bode_TipoCamion: '',
    bode_VIN: '',
    mode_Id: 0,
    regC_Id: 0,
    sucu_Id: 0,
    vend_Id: 0,
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    bode_FechaCreacion: new Date(),
    bode_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  bodegaOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  constructor(private http: HttpClient) {
    this.listarSucursales();
    this.listarRegistroCai();
    this.listarVendedores();
    this.listarModelos();
  }


  // Variables para las listas desplegables
   sucursales: any[] = [];
    registroCais: any[] = [];
    vendedores: any[] = [];
    modelos: any[] = [];


    // Métodos para obtener las listas desplegables desde el backend


  listarSucursales(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => this.sucursales = data);
  };

  listarRegistroCai(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/RegistrosCaiS/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => this.registroCais = data);
  };

  listarVendedores(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => this.vendedores = data);
  };

  listarModelos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Modelo/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => this.modelos = data);
  };


  ngOnChanges(changes: SimpleChanges): void {
    if (changes['bodegaData'] && changes['bodegaData'].currentValue) {
      this.bodega = { ...changes['bodegaData'].currentValue };
      this.bodegaOriginal = this.bodega.bode_Descripcion || '';
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

  // Validar campos requeridos
    if (
      !this.bodega.bode_Descripcion.trim() ||
      !this.bodega.bode_VIN.trim() ||
      !this.bodega.bode_Placa.trim() ||
      !this.bodega.bode_TipoCamion.trim() ||
      !this.bodega.bode_Capacidad ||
      !this.bodega.sucu_Id ||
      !this.bodega.vend_Id ||
      !this.bodega.mode_Id ||
      !this.bodega.regC_Id
    ) {
      
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    // Detectar cambios en los campos principales
    const cambios =
      (this.bodega.bode_Descripcion.trim() !== (this.bodegaData?.bode_Descripcion?.trim() ?? '') ||
      this.bodega.bode_VIN.trim() !== (this.bodegaData?.bode_VIN?.trim() ?? '') ||
      this.bodega.bode_Placa.trim() !== (this.bodegaData?.bode_Placa?.trim() ?? '') ||
      this.bodega.bode_TipoCamion.trim() !== (this.bodegaData?.bode_TipoCamion?.trim() ?? '') ||
      this.bodega.bode_Capacidad !== (this.bodegaData?.bode_Capacidad ?? 0) ||
      this.bodega.sucu_Id !== (this.bodegaData?.sucu_Id ?? 0) ||
      this.bodega.vend_Id !== (this.bodegaData?.vend_Id ?? 0) ||
      this.bodega.mode_Id !== (this.bodegaData?.mode_Id ?? 0) ||
      this.bodega.regC_Id !== (this.bodegaData?.regC_Id ?? 0) ) &&
      this.bodega.bode_Capacidad > 0;

    if (cambios) {
      this.mostrarConfirmacionEditar = true;
    } else {
      if(this.bodega.bode_Capacidad <= 0) {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'La capacidad de la bodega debe ser mayor a 0.';
        this.mostrarAlertaError = false;
        this.mostrarAlertaExito = false;
        return;
       }
       else
       {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
       }
      
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

    if (this.bodega.bode_Descripcion.trim()) {
      const bodegaActualizar = {
        bode_Id: this.bodega.bode_Id,
        bode_Descripcion: this.bodega.bode_Descripcion.trim(),
        sucu_Id: this.bodega.sucu_Id,
        regC_Id: this.bodega.regC_Id,
        vend_Id: this.bodega.vend_Id,
        mode_Id: this.bodega.mode_Id,
        bode_VIN: this.bodega.bode_VIN.trim(),
        bode_Placa: this.bodega.bode_Placa.trim(),
        bode_TipoCamion: this.bodega.bode_TipoCamion.trim(),
        bode_Capacidad: this.bodega.bode_Capacidad,
        usua_Creacion: this.bodega.usua_Creacion,
        bode_FechaCreacion: this.bodega.bode_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.bodega.secuencia || '',
        bode_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };
       
       
      this.http.put<any>(`${environment.apiBaseUrl}/Bodega/Actualizar`, bodegaActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if(response.data.code_Status ===1){
            this.mostrarErrores = false;
            this.onSave.emit(this.bodega);
            this.cancelar();
          }else{
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar la bodega, ' + response.data.message_Status;
            this.mostrarAlertaExito = false;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        },
        error: (error) => {
          console.error('Error al actualizar la bodega:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la bodega. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}
