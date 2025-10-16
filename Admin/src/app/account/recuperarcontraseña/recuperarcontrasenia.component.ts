import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Usuario } from 'src/app/Modelos/acceso/usuarios.Model';
import { environment } from 'src/environments/environment.prod';
import { HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-recuperarcontrasenia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './recuperarcontrasenia.component.html',
  styleUrl: './recuperarcontrasenia.component.scss'
})
export class RecuperarcontraseniaComponent {
  mostrarErroresConfirmar = false;
  // --- Confirmar contraseña screen logic ---
  mostrarPantallaConfirmar = false;
  nuevaContrasena: string = '';
  confirmarContrasena: string = '';
  mostrarPassword1: boolean = false;
  mostrarPassword2: boolean = false;

  onInputKeyUp(event: Event, idx: number, inputRef: HTMLInputElement): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    if (!/^([a-zA-Z0-9]?)$/.test(value)) {
      input.value = '';
      this.codigoIngresado[idx] = '';
      return;
    }
    // Store character or clear
    this.codigoIngresado[idx] = value;
    if (value.length === 1 && idx < 5) {
      // Move to next input using Angular template reference
      const nextInput = inputRef.parentElement?.querySelectorAll('input')[idx + 1] as HTMLInputElement;
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    }
    if (!value && idx > 0) {
      // Move to previous input using Angular template reference
      const prevInput = inputRef.parentElement?.querySelectorAll('input')[idx - 1] as HTMLInputElement;
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  }
    @Output() onCancel = new EventEmitter<void>();
  fieldTextType!: boolean;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarErrores = false;
  mostrarOverlayCarga = false;
  correo = '';

  mostrarPantallaCodigo = false;
  codigoIngresado: string[] = ['', '', '', '', '', ''];
  codigoGenerado: string = '';

  constructor(private http: HttpClient) {}
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }
  cancelar(): void {
    this.mostrarPantallaConfirmar = false;
    this.mostrarPantallaCodigo = false;
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
    this.codigoIngresado = ['', '', '', '', '', ''];
    this.correo = '';
    this.mostrarErroresConfirmar = false;
    this.onCancel.emit();
  }
  usuario: Usuario = {
    secuencia: 0,
    usua_Id: 0,
    usua_Usuario: '',
    usua_Clave: '',
    role_Id: 0,
    usua_IdPersona: 0,
    usua_EsVendedor: false,
    usua_EsAdmin: false,
    usua_Imagen: '',
    usua_TienePermisos: false,
    usua_Creacion: 0,
    usua_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    usua_FechaModificacion: new Date(),
    usua_Estado: false,

    permisosJson: '',
    role_Descripcion: '',
    nombreCompleto: '',

    code_Status: 0,
    message_Status:""
  }
    verificarusuario(): void {
      
        this.mostrarErrores = true;
        if (this.usuario.usua_Usuario.trim()) {
            this.mostrarOverlayCarga = true;
            this.http.post<any>(`${environment.apiBaseUrl}/Usuarios/VerificarUsuario`, this.usuario, {
                headers: { 
                    'X-Api-Key': environment.apiKey,
                    'Content-Type': 'application/json',
                    'accept': '*/*'
                }
            }).subscribe({
                next: (response) => {
                    //console.log('Respuesta del servidor:', response);
                    if (response.data && response.data[0] && response.data[0].correo !== null) {   
                        this.correo = response.data[0].correo;
                        this.usuario.usua_Id = response.data[0].usua_Id;
                        this.enviarcorreo();
                        //console.log('Correo enviado a:', this.correo);
                    } else {
                        this.mostrarOverlayCarga = false;
                        this.mostrarAlertaWarning = true;
                        this.mensajeWarning = 'No se encontró el usuario ingresado.';
                        setTimeout(() => {
                            this.mostrarAlertaWarning = false;
                            this.mensajeWarning = '';
                        }, 4000);
                    } 
                },
                error: (err) => {
                    this.mostrarAlertaError = true;
                    this.mostrarOverlayCarga = false;
                    this.mensajeError = 'Ocurrió un error al verificar el usuario.';
                    console.error(err);
                    setTimeout(() => {
                        this.mostrarAlertaError = false;
                        this.mensajeError = '';
                    }, 4000);
                }
            });
        } else {
              this.mostrarOverlayCarga = false
            //console.log('El campo de usuario está vacío:', this.usuario.usua_Usuario);
            this.mostrarAlertaWarning = true;
            this.mensajeWarning = 'El campo Usuario es requerido.';
            setTimeout(() => {
                this.mostrarAlertaWarning = false;
                this.mensajeWarning = '';
            }, 4000);
        }
    }
      generarCodigo(): string {
       return Math.floor(100000 + Math.random() * 900000).toString();
      }
    enviarcorreo(): void {

      this.codigoGenerado = this.generarCodigo();
      //console.log('Código generado:', this.codigoGenerado);
      const payload = {
        to_email: this.correo,
        codigo: this.codigoGenerado
      };
      this.http.post<any>(`${environment.apiBaseUrl}/Usuarios/EnviarCorreo`, payload, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          //console.log('Respuesta de envío de correo:', response);
          if (response.mensaje && response.mensaje === 'Correo enviado exitosamente') {
            this.mostrarOverlayCarga = false;
            this.mostrarAlertaExito = true;
            this.mensajeExito = '¡Correo enviado exitosamente!';
            if (!this.mostrarPantallaCodigo) {
              this.mostrarPantallaCodigo = true;
            }
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 4000);
            this.iniciarTemporizador(30); // 30 segundos
          } else {
            this.mostrarOverlayCarga = false;
            this.mostrarAlertaError = true;
            this.mensajeError = 'No se pudo enviar el correo.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 4000);
          }
        },
        error: (err) => {
          this.mostrarOverlayCarga = false;
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al enviar el correo.';
          console.error('Error al enviar el correo:', err);
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 4000);
        }
      });
    }

cancelarPantallaCodigo(): void {
  this.mostrarPantallaCodigo = false;
  this.codigoIngresado = ['', '', '', '', '', ''];
  this.limpiarTemporizador();
}

  confirmarCodigo(): void {
    this.mostrarOverlayCarga = true;
    const codigoFinal = this.codigoIngresado.join('');
    setTimeout(() => {
      if (codigoFinal === this.codigoGenerado) {
        this.mostrarErroresConfirmar = false;
        this.mostrarAlertaExito = true;
        this.mensajeExito = '¡Código correcto! Ahora puedes cambiar tu contraseña.';
        this.mostrarPantallaCodigo = false;
        this.mostrarPantallaConfirmar = true;
        this.mostrarOverlayCarga = false;
        setTimeout(() => {
          this.mostrarAlertaExito = false;
          this.mensajeExito = '';
        }, 4000);
      } else {
        this.mostrarOverlayCarga = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'El código ingresado es incorrecto.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 4000);
      }
    }, 1000);

  }

  regresarConfirmar(): void {
    this.mostrarPantallaConfirmar = false;
    this.mostrarPantallaCodigo = true;
    this.nuevaContrasena = '';
    this.confirmarContrasena = '';
    this.codigoIngresado = ['', '', '', '', '', ''];
  }

  confirmarNuevaContrasena(): void {
    this.mostrarErroresConfirmar = true;
    if (!this.nuevaContrasena || !this.confirmarContrasena) {
      return;
    }
    if (this.nuevaContrasena !== this.confirmarContrasena) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Las contraseñas no coinciden.';
      setTimeout(() => {
        this.mostrarAlertaError = false;
        this.mensajeError = '';
      }, 4000);
      return;
    }
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      const usuarioActualizado = {
        usua_Id: this.usuario.usua_Id,
        usua_Usuario: this.usuario.usua_Usuario || '',
        usua_Clave: this.nuevaContrasena,
        role_Id: 0,
        role_Descripcion: '',
        usua_IdPersona: 0,
        usua_EsVendedor: false,
        usua_EsAdmin: false,
        usua_Imagen: '',
        usua_Creacion: 0,
        usua_FechaCreacion: new Date(),
        usua_Modificacion: environment.usua_Id,
        usua_FechaModificacion: new Date(),
        usua_Estado: true,
        permisosJson: ''
      };
      this.http.post<any>(`${environment.apiBaseUrl}/Usuarios/RestablecerClave`, usuarioActualizado, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mostrarOverlayCarga = false;
          const codeStatus = response?.data?.code_Status;
          const messageStatus = response?.data?.message_Status || 'No se pudo actualizar la contraseña.';
          if (codeStatus === 1) {
            this.mostrarAlertaExito = true;
            this.mensajeExito = messageStatus;
            setTimeout(() => {
              this.cancelar();
              this.mostrarAlertaExito = false;
              this.mensajeExito = '';
            }, 2000);
          } else if (codeStatus === -1) {
            this.mostrarAlertaError = true;
            this.mensajeError = messageStatus;
          } else if (codeStatus === 0) {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar la contraseña.';
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = 'No se pudo actualizar la contraseña.';
          }
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.mensajeExito = '';
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 4000);
        },
        error: (err) => {
          this.mostrarOverlayCarga = false;
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la contraseña.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 4000);
        }
      });
    }, 1000);
  }

  // temporizador

  reenviarDisabled: boolean = false;
tiempoRestante: number = 0;
private intervalId: any;

        iniciarTemporizador(segundos: number): void {
        this.reenviarDisabled = true;
        this.tiempoRestante = segundos;
        this.intervalId = setInterval(() => {
          this.tiempoRestante--;
          if (this.tiempoRestante <= 0) {
            this.reenviarDisabled = false;
            clearInterval(this.intervalId);
          }
        }, 1000);
      }

      // Método para limpiar el temporizador
      limpiarTemporizador(): void {
        this.reenviarDisabled = false;
        this.tiempoRestante = 0;
        if (this.intervalId) {
          clearInterval(this.intervalId);
        }
      }
      reenviarcodigo(): void {
  if (!this.reenviarDisabled) {
    this.enviarcorreo();
  }
}
}
