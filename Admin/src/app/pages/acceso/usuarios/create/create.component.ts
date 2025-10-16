import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Usuario } from 'src/app/Modelos/acceso/usuarios.Model';

@Component({
  selector: 'app-create-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  //Mensajes y alertas
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  //Listas para ddl
  roles: any[] = [];
  empleados: any[] = [];
  vendedores: any[] = [];

  //Para validacion de la clave
  claveDatos: number = 0;
  claveMensaje: string = '';

  //Modelo de Usuario
  usuario: Usuario = {
    secuencia: 0,
    usua_Id: 0,
    usua_Usuario: '',
    usua_Clave: '',
    role_Id: 0,
    usua_IdPersona: 0,
    usua_EsVendedor: false,
    usua_EsAdmin: false,
    usua_Imagen: 'assets/images/users/32/user-svg.svg',
    usua_TienePermisos: false,
    usua_Creacion: 0,
    usua_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    usua_FechaModificacion: new Date(),
    usua_Estado: true,
    permisosJson: '',
    role_Descripcion: '',
    nombreCompleto: '',
    code_Status: 0,
    message_Status: '',
  };

  //Inyección de HttpClient
  constructor(private http: HttpClient) {
    this.cargarRoles();
    this.cargarEmpleados();
    this.cargarVendedores();
  }

  //Cargar datos para listas de los ddl
  cargarRoles() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Roles/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.roles = data);
  }

  //Cargar datos para listas de los ddl
  cargarEmpleados() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Empleado/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.empleados = data);
  }

  //Cargar datos para listas de los ddl
  cargarVendedores() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.vendedores = data);
  }

  // Validar la fortaleza de la clave
  corroborarClave(clave: string) {
    if (clave.length === 0) {
      this.claveDatos = 0;
      this.claveMensaje = '';
      return;
    }

    const tieneLetra = /[a-zA-Z]/.test(clave);
    const tieneNumero = /\d/.test(clave);
    const tieneEspecial = /[^a-zA-Z\d]/.test(clave);
    const tipos = [tieneLetra, tieneNumero, tieneEspecial].filter(Boolean).length;

    if (clave.length < 8) {
      this.claveDatos = 1;
      this.claveMensaje = `Débil: debe tener al menos 8 caracteres.`;
      return;
    }

    if (tipos === 1) {
      this.claveDatos = 1;
      let faltantes = [];
      if (!tieneLetra) faltantes.push('una letra');
      if (!tieneNumero) faltantes.push('un número');
      if (!tieneEspecial) faltantes.push('un carácter especial');
      let faltantesMsg = faltantes.length ? ` debe tener ${faltantes.join(' y ')}.` : '';
      this.claveMensaje = `Débil:${faltantesMsg}`;
    } else if (tipos === 2) {
      this.claveDatos = 2;
      let faltantes = [];
      if (!tieneLetra) faltantes.push('una letra');
      if (!tieneNumero) faltantes.push('un número');
      if (!tieneEspecial) faltantes.push('un carácter especial');
      let faltantesMsg = faltantes.length ? ` debe tener ${faltantes.join(' y ')}.` : '';
      this.claveMensaje = `Media:${faltantesMsg}`;
    } else if (tipos === 3) {
      this.claveDatos = 3;
      this.claveMensaje = 'Fuerte';
    }
  }

  // Para la accion del boton de cancelar
  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.usuario = {
      secuencia: 0,
      usua_Id: 0,
      usua_Usuario: '',
      usua_Clave: '',
      role_Id: 0,
      usua_IdPersona: 0,
      usua_EsVendedor: false,
      usua_EsAdmin: false,
      usua_Imagen: 'assets/images/users/32/user-dummy-img.jpg',
      usua_TienePermisos: false,
      usua_Creacion: 0,
      usua_FechaCreacion: new Date(),
      usua_Modificacion: 0,
      usua_FechaModificacion: new Date(),
      usua_Estado: true,
      permisosJson: "",
      role_Descripcion: '',
      nombreCompleto: '',
      code_Status: 0,
      message_Status: '',
    };
    this.onCancel.emit();
  }

  // Cerrar las alertas
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Si es admin, deshabilitar los ddl de rol y empleado
  onAdminToggle(): void {
    if (this.usuario.usua_EsAdmin) {
      this.usuario.role_Id = 1;
      this.usuario.usua_IdPersona = 0;
    }
  }

  // Para la accion del boton de guardar
  guardar(): void {
    this.mostrarErrores = true;

    if (this.claveDatos < 3) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La contraseña debe ser de nivel fuerte.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      return;
    }
    if (this.usuario.usua_Usuario.trim() && this.usuario.usua_Clave.trim() && this.usuario.role_Id && this.usuario.usua_IdPersona) {
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      const usuarioGuardar = {
        secuencia: 0,
        usua_Id: 0,
        usua_Usuario: this.usuario.usua_Usuario.trim(),
        usua_Clave: this.usuario.usua_Clave.trim(),
        role_Id: this.usuario.role_Id,
        usua_IdPersona: this.usuario.usua_IdPersona,
        usua_EsVendedor: this.usuario.usua_EsVendedor,
        usua_EsAdmin: this.usuario.usua_EsAdmin,
        usua_Imagen: this.usuario.usua_Imagen,
        usua_TienePermisos: this.usuario.usua_TienePermisos,
        usua_Creacion: getUserId(),
        usua_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: getUserId(),
        usua_FechaModificacion: new Date().toISOString(),
        usua_Estado: true,
        permisosJson: "",
        role_Descripcion: '',
        nombreCompleto: '',
        code_Status: 0,
        message_Status: '',
      };
      this.http.post<any>(`${environment.apiBaseUrl}/Usuarios/Insertar`, usuarioGuardar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if (response.data.code_Status === 1) {
            this.mostrarErrores = false;
            this.onSave.emit(this.usuario);
            this.cancelar();
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar el usuario, ' + response.data.message_Status;
            this.mostrarAlertaExito = false;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el usuario. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }

  // Cargar y subir la imagen al servidor
  onImagenSeleccionada(event: any) {
    const file = event.target.files[0];

    if (file) {
      // Crear vista previa inmediata
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.usuario.usua_Imagen = e.target.result;
      };
      reader.readAsDataURL(file);

      // Subir imagen al servidor
      const formData = new FormData();
      formData.append('imagen', file);

      this.http.post<any>(`${environment.apiBaseUrl}/Imagen/Subir`, formData, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if (response && response.ruta) {
            // Reemplazar la vista previa con la URL del servidor
            this.usuario.usua_Imagen = `${environment.apiBaseUrl}${response.ruta}`;
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al procesar la respuesta del servidor.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        },
        error: (error) => {
          console.error('Error al subir la imagen:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al subir la imagen. Por favor, intente nuevamente.';
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    }
  }
}