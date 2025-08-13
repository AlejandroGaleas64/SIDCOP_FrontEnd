import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Bodega } from 'src/app/Modelos/logistica/Bodega.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent  {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Bodega>();
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {
    this.listarSucursales();
    this.listarRegistroCai();
    this.listarVendedores();
    this.listarModelos();
  }

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

    //Variables para las listas desplegables
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

  

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.bodega = {
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
    
    // Validar campos requeridos
    if (this.bodega.bode_Descripcion.trim() &&
        this.bodega.bode_Capacidad > 0 && this.bodega.bode_Placa.trim() &&
        this.bodega.bode_TipoCamion.trim() && this.bodega.bode_VIN.trim() &&
        this.bodega.sucu_Id > 0 && this.bodega.regC_Id > 0 && this.bodega.vend_Id > 0 && this.bodega.mode_Id > 0
      
      )
      {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      const bodegaGuardar = {
        bode_Id: 0,
        bode_Descripcion: this.bodega.bode_Descripcion.trim(),
        sucu_Id: this.bodega.sucu_Id,
        regC_Id: this.bodega.regC_Id,
        vend_Id: this.bodega.vend_Id,
        mode_Id: this.bodega.mode_Id,
        bode_VIN: this.bodega.bode_VIN.trim(),
        bode_Placa: this.bodega.bode_Placa.trim(),
        bode_TipoCamion: this.bodega.bode_TipoCamion.trim(),
        bode_Capacidad: this.bodega.bode_Capacidad,
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        bode_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        numero: "", 
        bode_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      console.log('Guardando bodega:', bodegaGuardar);
      this.http.post<any>(`${environment.apiBaseUrl}/Bodega/Insertar`, bodegaGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if(response.data.code_Status === 1) {
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
          console.error('Error al guardar bodega:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el bodega. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          
          // Ocultar la alerta de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
       if(this.bodega.bode_Capacidad <= 0) {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'La capacidad de la bodega debe ser mayor a 0.';
        this.mostrarAlertaError = false;
        this.mostrarAlertaExito = false;
       }
       else{
         this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
        this.mostrarAlertaError = false;
        this.mostrarAlertaExito = false;
       }
      // Mostrar alerta de warning para campos vacíos
     
      
      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}
