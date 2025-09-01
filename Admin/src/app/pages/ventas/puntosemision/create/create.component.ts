import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { PuntoEmision } from 'src/app/Modelos/ventas/PuntoEmision.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
})
export class CreateComponent {
  // Valida que el código tenga exactamente 3 dígitos
  codigoValido(): boolean {
    return /^[0-9]{3}$/.test(this.puntoEmision.puEm_Codigo);
  }
 
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<PuntoEmision>();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

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
    this.cargarSucursales();
  }

   // Solo permite números en el campo Código
  soloNumeros(event: KeyboardEvent): void {
    const charCode = event.key.charCodeAt(0);
    if (charCode < 48 || charCode > 57 || this.puntoEmision.puEm_Codigo.length >= 3) {
      event.preventDefault();
    }
  }

  // Evita pegar en el campo Código
  evitarPegar(event: ClipboardEvent): void {
    event.preventDefault();
  }

  // Valida que el código siempre sean 3 dígitos numéricos
  validarCodigo(): void {
    if (!/^[0-9]{0,3}$/.test(this.puntoEmision.puEm_Codigo)) {
      this.puntoEmision.puEm_Codigo = this.puntoEmision.puEm_Codigo.replace(/[^0-9]/g, '').slice(0, 3);
    }
  }

  puntoEmision: PuntoEmision = {
    puEm_Id: 0,
    puEm_Codigo: '',
    puEm_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    sucu_Id: 0,
    sucu_Descripcion: '',
    puEm_FechaCreacion: new Date(),
    puEm_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    secuencia: 0,
    estado: '',
  };

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.puntoEmision = {
      puEm_Id: 0,
      puEm_Codigo: '',
      puEm_Descripcion: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      sucu_Id: 0,
      sucu_Descripcion: '',
      puEm_FechaCreacion: new Date(),
      puEm_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      secuencia: 0,
      estado: '',
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

    if (this.codigoValido() && this.puntoEmision.puEm_Descripcion.trim() &&
      this.puntoEmision.sucu_Id > 0) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;

      const puntoemisionGuardar = {
        puEm_Id: 0,
        puEm_Codigo: this.puntoEmision.puEm_Codigo.trim(),
        puEm_Descripcion: this.puntoEmision.puEm_Descripcion.trim(),
        usua_Creacion: getUserId(),
        puEm_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        sucu_Id: this.puntoEmision.sucu_Id,
        sucu_Descripcion: '',
        puEm_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: '',
        estado: '',
        secuencia: 0,
      };

      this.http
        .post<any>(
          `${environment.apiBaseUrl}/PuntoEmision/Insertar`,
          puntoemisionGuardar,
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
            this.mostrarErrores = false;
            this.onSave.emit(this.puntoEmision);
            this.cancelar();
          },
          error: (error) => {
            this.mostrarAlertaError = true;
            this.mensajeError =
              'Error al punto de emision. Por favor, intente nuevamente.';
            this.mostrarAlertaExito = false;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          },
        });
    } else {
      // Mostrar alerta de warning para campos vacíos o código incorrecto
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos y asegúrese que el código tenga exactamente 3 dígitos.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}
