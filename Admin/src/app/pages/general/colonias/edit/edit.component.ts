import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Colonias } from 'src/app/Modelos/general/Colonias.Model';
import { Municipio } from 'src/app/Modelos/general/Municipios.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnInit, OnChanges {
  // Input: datos de la colonia que se van a editar
  @Input() coloniaData: Colonias | null = null;
  // Outputs: eventos para notificar el guardado o cancelación al componente padre
  @Output() onSave = new EventEmitter<Colonias>();
  @Output() onCancel = new EventEmitter<void>();

  // Retorna un resumen de los cambios detectados (útil para mostrar en modal de confirmación)
  obtenerListaCambios() {
    const cambios: { label: string; anterior: string; nuevo: string }[] = [];

    // Comparar descripción
    if ((this.coloniaEditada.colo_Descripcion || '').trim() !== (this.coloniaOriginal || '').trim()) {
      cambios.push({
        label: 'Descripción',
        anterior: this.coloniaOriginal,
        nuevo: this.coloniaEditada.colo_Descripcion
      });
    }

    // Comparar municipio (por código) y mapear a nombres cuando estén disponibles
    const municipioOriginal = this.coloniaData?.muni_Codigo || '';
    const municipioActual = this.coloniaEditada.muni_Codigo || '';
    if (municipioActual !== municipioOriginal) {
      const municipioOriginalNombre = this.TodosMunicipios?.find((m: any) => m.muni_Codigo === municipioOriginal)?.muni_Descripcion || municipioOriginal;
      const municipioActualNombre = this.TodosMunicipios?.find((m: any) => m.muni_Codigo === municipioActual)?.muni_Descripcion || municipioActual;

      cambios.push({
        label: 'Municipio',
        anterior: municipioOriginalNombre,
        nuevo: municipioActualNombre
      });
    }

    return cambios;
  }

  // Modelo local editable (clonado desde la entrada para evitar mutaciones)
  coloniaEditada: Colonias = {
    colo_Id: 0,
    colo_Descripcion: '',
    muni_Codigo: '',
    usua_Creacion: 0,
    colo_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    colo_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    depa_Codigo: '',
    depa_Descripcion: '',
    muni_Descripcion: ''
  }

  // Flags y estados de UI
  coloniaOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  // Listados y selectores
  Municipios: any[] = [];
  selectedDepa: string = '';
  selectedMuni: string = '';
  cargando = false;
  mostrarAlerta = false;
  mensajeAlerta = '';
  TodosMunicipios: any;
  Departamentos: any;

  constructor(private http: HttpClient) { }

  // Inicializar listados al montar el componente
  ngOnInit(): void {
    this.cargarListados();
  }

  // Cuando cambia la entrada, clonar datos y preparar estado
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['coloniaData'] && changes['coloniaData'].currentValue) {
      this.coloniaEditada = { ...changes['coloniaData'].currentValue };
      this.coloniaOriginal = this.coloniaEditada.colo_Descripcion || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();
      this.cargarListados();
    }
  }

  // Cancelar edición y comunicar al padre
  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  // Reset de alertas
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Validaciones antes de enviar la actualización al backend
  validarEdicion(): void {
    this.mostrarErrores = true;

    if ((this.coloniaEditada.colo_Descripcion ?? '').trim() && (this.coloniaEditada.muni_Codigo ?? '').trim()) {
      const descripcionOriginal = (this.coloniaOriginal ?? '').trim();
      const descripcionActual = (this.coloniaEditada.colo_Descripcion ?? '').trim();
      const muniCodigoOriginal = (this.coloniaData?.muni_Codigo ?? '').trim();
      const muniCodigoActual = (this.coloniaEditada.muni_Codigo ?? '').trim();

      if (descripcionActual !== descripcionOriginal || muniCodigoActual !== muniCodigoOriginal) {
        // Si hay cambios, pedir confirmación
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
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

  // Envia la petición PUT para actualizar la colonia
  private guardar(): void {
    this.mostrarErrores = true;

    if ((this.coloniaEditada.colo_Descripcion ?? '').trim() && (this.coloniaEditada.muni_Codigo ?? '').trim()) {
      const coloniaActualizar = {
        colo_Id: this.coloniaEditada.colo_Id,
        colo_Descripcion: (this.coloniaEditada.colo_Descripcion ?? '').trim(),
        muni_Codigo: (this.coloniaEditada.muni_Codigo ?? '').trim(),
        usua_Creacion: this.coloniaEditada.usua_Creacion,
        colo_FechaCreacion: this.coloniaEditada.colo_FechaCreacion,
        usua_Modificacion: getUserId(),
        numero: this.coloniaEditada.secuencia || '',
        depa_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: '',
        usuarioModificacion: ''
      };

      this.http.put<any>(`${environment.apiBaseUrl}/Colonia/Actualizar`, coloniaActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if (response?.data?.code_Status === 1) {
            this.mensajeExito = `Colonia "${this.coloniaEditada.colo_Descripcion}" actualizada exitosamente`;
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;

            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit(this.coloniaEditada);
              this.cancelar();
            }, 3000);
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al actualizar la colonia, ' + (response?.data?.message_Status || '');
            setTimeout(() => this.cerrarAlerta(), 5000);
          }
        },
        error: () => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la colonia. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  // Cargar listados de departamentos y municipios para los selects
  cargarListados(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (departamentos) => {
        this.Departamentos = departamentos;

        this.http.get<any>(`${environment.apiBaseUrl}/Municipios/Listar`, {
          headers: { 'x-api-key': environment.apiKey }
        }).subscribe({
          next: (municipios) => {
            this.TodosMunicipios = municipios;
            this.configurarUbicacionInicial();
          }
        });
      }
    });
  }

  configurarUbicacionInicial(): void {
      const municipio = this.TodosMunicipios.find((m: any) => m.muni_Codigo === this.coloniaEditada.muni_Codigo);
      if (municipio) {
        this.selectedDepa = municipio.depa_Codigo;
        this.selectedMuni = municipio.muni_Codigo;
        this.Municipios = this.TodosMunicipios.filter((m: any) => m.depa_Codigo === this.selectedDepa);
      }
    }

  cargarMunicipios(codigoDepa: string): void {
    this.selectedMuni = '';
    this.coloniaEditada.muni_Codigo = '';
    this.Municipios = this.TodosMunicipios.filter((m: any) => m.depa_Codigo === codigoDepa);
    this.selectedMuni = '';
  }

}
