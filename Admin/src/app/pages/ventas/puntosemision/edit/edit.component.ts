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
import { PuntoEmision } from 'src/app/Modelos/ventas/PuntoEmision.Model';
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
  @Input() PEData: PuntoEmision | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<PuntoEmision>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

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

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;
  Sucursales: any[] = [];
  PEOriginal: any = {};

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
      .subscribe((data) => {
        this.Sucursales = this.ordenarPorMunicipioYDepartamento(data);
        console.log('Sucursales', this.Sucursales);
      });
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

   codigoValido(): boolean {
    return /^[0-9]{3}$/.test(this.puntoEmision.puEm_Codigo);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['PEData'] && changes['PEData'].currentValue) {
      this.puntoEmision = { ...changes['PEData'].currentValue };
      this.PEOriginal = { ...this.PEData };
      //console.log('Punto Original', this.PEOriginal );
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
      !this.puntoEmision.puEm_Codigo.trim() ||
      !this.puntoEmision.puEm_Descripcion.trim() ||
      !this.puntoEmision.sucu_Id
    ) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    if (this.hayDiferencias()) {
      this.mostrarConfirmacionEditar = true;
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'No se han detectado cambios.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cambiosDetectados: any = {};

  hayDiferencias(): boolean {
    const a = this.puntoEmision;
    const b = this.PEOriginal;
    this.cambiosDetectados = {};

    // Verificar cada campo y almacenar los cambios
    if (a.puEm_Codigo !== b.puEm_Codigo) {
      this.cambiosDetectados.codigo = {
        anterior: b.puEm_Codigo,
        nuevo: a.puEm_Codigo,
        label: 'Código',
      };
    }

    if (a.puEm_Descripcion !== b.puEm_Descripcion) {
      this.cambiosDetectados.descripcion = {
        anterior: b.puEm_Descripcion,
        nuevo: a.puEm_Descripcion,
        label: 'Descripción',
      };
    }

    if (a.sucu_Id !== b.sucu_Id) {
      const coloniaAnterior = this.Sucursales.find(
        (c) => c.sucu_Id === b.sucu_Id
      );
      const coloniaNueva = this.Sucursales.find((c) => c.sucu_Id === a.sucu_Id);

      this.cambiosDetectados.Observaciones = {
        anterior: coloniaAnterior
          ? `${coloniaAnterior.sucu_Descripcion} - ${coloniaAnterior.muni_Descripcion} - ${coloniaAnterior.depa_Descripcion}`
          : 'No seleccionada',
        nuevo: coloniaNueva
          ? `${coloniaNueva.sucu_Descripcion} - ${coloniaNueva.muni_Descripcion} - ${coloniaNueva.depa_Descripcion}`
          : 'No seleccionada',
        label: 'Sucursal',
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

  private guardar(): void {
    this.mostrarErrores = true;

    if (
      this.puntoEmision.puEm_Descripcion.trim() &&
      this.codigoValido() &&
      this.puntoEmision.sucu_Id > 0
    ) {
      const PEActualizar = {
        puEm_Id: this.puntoEmision.puEm_Id,
        puEm_Codigo: this.puntoEmision.puEm_Codigo.trim(),
        puEm_Descripcion: this.puntoEmision.puEm_Descripcion.trim(),
        usua_Creacion: this.puntoEmision.usua_Creacion,
        puEm_FechaCreacion: this.puntoEmision.puEm_FechaCreacion,
        usua_Modificacion: getUserId(),
        sucu_Id: this.puntoEmision.sucu_Id,
        sucu_Descripcion: '',
        puEm_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: '',
        estado: '',
        secuencia: 0,
      };

      this.http
        .put<any>(
          `${environment.apiBaseUrl}/PuntoEmision/Actualizar`,
          PEActualizar,
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
            // this.mensajeExito = `Punto de Emision "${this.puntoEmision.puEm_Descripcion}" actualizado exitosamente`;
            this.mostrarErrores = false;
            this.onSave.emit(this.puntoEmision);
            this.cancelar();
          },
          error: (error) => {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar el punto de emision';
            this.mostrarAlertaExito = false;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          },
        });
    } else {
      console.log('Entro al else');
      this.mostrarAlertaWarning = true;
      this.mensajeWarning =
        'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }
}
