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

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  roles: any[] = [];
  empleados: any[] = [];
  vendedores: any[] = [];

  claveDatos: number = 0;
  claveMensaje: string = '';

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

  constructor(private http: HttpClient) {
    this.cargarRoles();
    this.cargarEmpleados();
    this.cargarVendedores();
  }

  cargarRoles() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Roles/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.roles = data);
  }

  cargarEmpleados() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Empleado/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.empleados = data);
  }

  cargarVendedores() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => this.vendedores = data);
  }

  corroborarClave(clave: string) {
    if (clave.length === 0) {
      this.claveDatos = 0;
      this.claveMensaje = '';
      return;
    }

    if (clave.length < 8) {
      this.claveDatos = 1;
      this.claveMensaje = 'Débil';
      return;
    }
    
    const tieneLetra = /[a-zA-Z]/.test(clave);
    const tieneNumero = /\d/.test(clave);
    const tieneEspecial = /[^a-zA-Z\d]/.test(clave);
    const tipos = [tieneLetra, tieneNumero, tieneEspecial].filter(Boolean).length;

    if (tipos === 1) {
      this.claveDatos = 1;
      this.claveMensaje = 'Débil';
    } else if (tipos === 2) {
      this.claveDatos = 2;
      this.claveMensaje = 'Media';
    } else if (tipos === 3) {
      this.claveDatos = 3;
      this.claveMensaje = 'Fuerte';
    }
  }

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

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  onAdminToggle(): void {
    if (this.usuario.usua_EsAdmin) {
      this.usuario.role_Id = 1;
      this.usuario.usua_IdPersona = 0;
    }
  }

  guardar(): void {
    this.mostrarErrores = true;

    if (this.claveDatos < 2) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La contraseña debe ser al menos de seguridad media (letras y números o letras y caracteres especiales).';
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

  onImagenSeleccionada(event: any) {
    // Obtenemos el archivo seleccionado desde el input tipo file
    const file = event.target.files[0];

    if (file) {
      // para enviar la imagen a Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', 'subidas_usuarios');
      //Subidas usuarios Carpeta identificadora en Cloudinary
      //dwiprwtmo es el nombre de la cuenta de Cloudinary
      const url = 'https://api.cloudinary.com/v1_1/dbt7mxrwk/upload';


      fetch(url, {
        method: 'POST',
        body: formData
      })
        .then(response => response.json())
        .then(data => {
          this.usuario.usua_Imagen = data.secure_url;
        })
        .catch(error => {
          console.error('Error al subir la imagen a Cloudinary:', error);
        });
    }
  }
}