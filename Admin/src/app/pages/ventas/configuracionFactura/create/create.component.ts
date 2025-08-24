import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule, 
    NgSelectModule,
    NgxMaskDirective
  ],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
  providers: [provideNgxMask()]
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  // Estados de alerta
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Modelo
  configFactura = {
    coFa_Id: 0,
    coFa_NombreEmpresa: '',
    coFa_DireccionEmpresa: '',
    coFa_RTN: '',
    coFa_Correo: '',
    coFa_Telefono1: '',
    coFa_Telefono2: '',
    coFa_Logo: '',
    colo_Id: 0
  };

  // Catálogos
  colonia: any[] = [];

  constructor(private http: HttpClient) {
    this.listarColonias();
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

  // Validación de correo electrónico
  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Verificar si RTN tiene exactamente 14 dígitos
  isValidRTN(rtn: string): boolean {
    return rtn.length === 14 && /^\d{14}$/.test(rtn);
  }

  // Función de búsqueda para colonias
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  // Función para ordenar por municipio y departamento
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

  // Cargar colonias
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

  // Método cuando se selecciona una colonia
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
        this.configFactura.coFa_Logo = data.secure_url;
      })
      .catch(error => {
        console.error('Error al subir la imagen a Cloudinary:', error);
      });
    }
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;
    this.mensajeExito = '';
    this.mensajeWarning = '';
    this.mensajeError = '';
  }

  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
    this.recargarPagina();
  }

  // Método para validar todos los campos obligatorios
  private validarCampos(): boolean {
    const errores: string[] = [];

    // Validar campos obligatorios básicos
    if (!this.configFactura.coFa_NombreEmpresa.trim()) {
      errores.push('Nombre de la empresa');
    }

    if (!this.configFactura.coFa_DireccionEmpresa.trim()) {
      errores.push('Dirección de la empresa');
    }

    // Validar RTN
    if (!this.configFactura.coFa_RTN.trim()) {
      errores.push('RTN');
    } else if (!this.isValidRTN(this.configFactura.coFa_RTN)) {
      errores.push('RTN debe tener exactamente 14 dígitos');
    }

    // Validar correo
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
      this.mensajeWarning = `Por favor complete o corrija los siguientes campos: ${errores.join(', ')}`;
      this.mostrarAlertaWarning = true;
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      
      // Ocultar la alerta de warning después de 5 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 5000);
      
      return false;
    }

    return true;
  }

  guardar(): void {
    this.mostrarErrores = true;
    this.cerrarAlerta(); // Cierra alertas previas

    // Validar campos obligatorios
    if (!this.validarCampos()) {
      return;
    }

    const body = {
      ...this.configFactura,
      usua_Creacion: getUserId(),
      coFa_FechaCreacion: new Date().toISOString()
    };

    console.log('Enviando body:', body);

    this.http.post<any>(`${environment.apiBaseUrl}/ConfiguracionFactura/Insertar`, body, {
      headers: {
        'x-api-key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      },
      observe: 'response'
    }).subscribe({
      next: (response) => {
        this.debugResponse(response, false);
        
        try {
          // Verifica si la petición fue exitosa por status HTTP
          if (response.status >= 200 && response.status < 300) {
            let codeStatus, messageStatus;
            const responseBody = response.body;
            
            // Maneja diferentes estructuras de respuesta
            if (responseBody && typeof responseBody === 'object') {
              if (responseBody.data) {
                codeStatus = responseBody.data.code_Status;
                messageStatus = responseBody.data.message_Status;
              } else if (responseBody.code_Status !== undefined) {
                codeStatus = responseBody.code_Status;
                messageStatus = responseBody.message_Status;
              } else if (responseBody.success !== undefined) {
                codeStatus = responseBody.success ? 1 : 0;
                messageStatus = responseBody.message || 'Operación completada';
              } else {
                // Si no hay estructura esperada, asume éxito por el status HTTP
                codeStatus = 1;
                messageStatus = 'Operación exitosa';
              }
            } else {
              // Si no hay body o no es objeto, asume éxito
              codeStatus = 1;
              messageStatus = 'Operación exitosa';
            }
            
            console.log('Code Status determinado:', codeStatus);
            console.log('Message Status:', messageStatus);
            
            if (codeStatus === 1 || codeStatus === true) {
              this.mensajeExito = 'Configuración guardada exitosamente';
              this.mostrarAlertaExito = true;
              this.mostrarErrores = false;
              
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.onSave.emit();
                this.recargarPagina();
              }, 3000);
            } else {
              this.mensajeError = messageStatus || 'Error al guardar la configuración';
              this.mostrarAlertaError = true;
              this.mostrarAlertaExito = false;
              
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
                this.recargarPagina();
              }, 5000);
            }
          } else {
            this.mensajeError = `Error en la respuesta del servidor (Status: ${response.status})`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        } catch (error) {
          console.error('Error procesando respuesta:', error);
          this.mensajeError = 'Error procesando la respuesta del servidor';
          this.mostrarAlertaError = true;
          this.mostrarAlertaExito = false;
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      },
      error: (error) => {
        this.debugResponse(error, true);
        
        try {
          // Maneja diferentes tipos de errores
          if (error.status === 200 || error.status === 201) {
            // A veces Angular considera 200/201 como error si la respuesta no es JSON válido
            this.mensajeExito = 'Configuración guardada exitosamente';
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;
            
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit();
              this.recargarPagina();
            }, 3000);
          } else if (error.status === 0) {
            this.mensajeError = 'Error de conexión. Verifique su conexión a internet.';
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          } else if (error.status >= 400 && error.status < 500) {
            this.mensajeError = `Error del cliente (${error.status}). Verifique los datos enviados.`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          } else if (error.status >= 500) {
            this.mensajeError = `Error del servidor (${error.status}). Intente nuevamente más tarde.`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          } else {
            this.mensajeError = `Error al guardar la configuración. Status: ${error.status}`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          }
          
          // Ocultar alertas de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        } catch (processingError) {
          console.error('Error procesando error:', processingError);
          this.mensajeError = 'Error inesperado al procesar la respuesta';
          this.mostrarAlertaError = true;
          this.mostrarAlertaExito = false;
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      }
    });
  }

  private debugResponse(response: any, isError: boolean): void {
    console.log(isError ? 'Error Response:' : 'Success Response:', response);
    if (response && response.body) {
      console.log('Response Body:', response.body);
    }
    if (response && response.status) {
      console.log('Response Status:', response.status);
    }
  }

  private recargarPagina(): void {
    window.location.reload();
  }
}