import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Proveedor } from 'src/app/Modelos/general/Proveedor.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { provideRouter } from '@angular/router';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl:'./edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnChanges {
  @Input() proveedorData: Proveedor | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Proveedor>();

  proveedor: Proveedor = new Proveedor();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  // Catálogos para DDL dependientes
  Departamentos: any[] = [];
  TodosMunicipios: any[] = [];
  TodosColonias: any[] = [];
  Municipios: any[] = [];
  Colonias: any[] = [];
  ProveedorOriginal: Proveedor = new Proveedor();
  selectedDepa: string = '';
  selectedMuni: string = '';

  constructor(private http: HttpClient) {
    this.cargarListados();
  }


//Obtiene listado de departamentos, municipios y colonias  
  cargarListados(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.Departamentos = data,
      error: (error) => console.error('Error cargando departamentos:', error)
    });

    this.http.get<any>(`${environment.apiBaseUrl}/Municipios/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.TodosMunicipios = data,
      error: (error) => console.error('Error cargando municipios:', error)
    });

    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.TodosColonias = data,
      error: (error) => console.error('Error cargando colonias:', error)
    });
  }

  // Filtra municipios y colonias según selección
  cargarMunicipios(codigoDepa: string): void {
    this.Municipios = this.TodosMunicipios.filter(m => m.depa_Codigo === codigoDepa);
    this.Colonias = [];
    this.selectedMuni = '';
    this.proveedor.colo_Id = 0;
  }

  // Filtra colonias según municipio seleccionado
  cargarColonias(codigoMuni: string): void {
    this.Colonias = this.TodosColonias.filter(c => c.muni_Codigo === codigoMuni);
    this.proveedor.colo_Id = 0;
  }

  // Detecta si se cambia el proveedor a editar
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['proveedorData'] && changes['proveedorData'].currentValue) {
      this.proveedor = { ...changes['proveedorData'].currentValue };
      this.mostrarErrores = false;
      this.ProveedorOriginal = { ...this.proveedor };


      this.cerrarAlerta();
      // Sincronizar selects dependientes
      if (this.TodosMunicipios.length && this.TodosColonias.length) {
        this.setSelectsFromProveedor();
      } else {
        // Esperar a que los catálogos estén cargados
        setTimeout(() => this.setSelectsFromProveedor(), 500);
      }
    }
  }

  setSelectsFromProveedor(): void {
    if (!this.proveedor) return;
    // Buscar municipio y departamento de la colonia seleccionada
    const colonia = this.TodosColonias.find(c => c.colo_Id === this.proveedor.colo_Id);
    if (colonia) {
      this.selectedMuni = colonia.muni_Codigo;
      const municipio = this.TodosMunicipios.find(m => m.muni_Codigo === colonia.muni_Codigo);
      if (municipio) {
        this.selectedDepa = municipio.depa_Codigo;
        this.Municipios = this.TodosMunicipios.filter(m => m.depa_Codigo === this.selectedDepa);
        this.Colonias = this.TodosColonias.filter(c => c.muni_Codigo === this.selectedMuni);
      }
    }
  }


// Valida los campos y muestra confirmación si hay cambios
  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.proveedor.prov_NombreEmpresa.trim() && this.proveedor.prov_Codigo.trim() &&
        this.proveedor.prov_NombreContacto.trim() && this.proveedor.prov_Telefono.trim() &&
        this.proveedor.colo_Id > 0 && this.proveedor.prov_DireccionExacta.trim() &&
        this.proveedor.prov_Correo.trim() && this.proveedor.prov_Observaciones.trim()) {
      if (
        this.proveedor.prov_NombreEmpresa.trim() !== this.ProveedorOriginal.prov_NombreEmpresa.trim() ||
        this.proveedor.prov_Codigo.trim() !== this.ProveedorOriginal.prov_Codigo.trim() ||
        this.proveedor.prov_NombreContacto.trim() !== this.ProveedorOriginal.prov_NombreContacto.trim() ||
        this.proveedor.prov_Telefono.trim() !== this.ProveedorOriginal.prov_Telefono.trim() ||
        this.proveedor.colo_Id !== this.ProveedorOriginal.colo_Id ||
        this.proveedor.prov_DireccionExacta.trim() !== this.ProveedorOriginal.prov_DireccionExacta.trim() ||
        this.proveedor.prov_Correo.trim() !== this.ProveedorOriginal.prov_Correo.trim() ||
        this.proveedor.prov_Observaciones.trim() !== this.ProveedorOriginal.prov_Observaciones.trim()
      ) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        console.error('No se han detectado cambios en el proveedor.');
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

//Cierra confirmación de edición
  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

//Confirma edición y llama a guardar
  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    console.log('Confirmar edición de proveedor');
    this.guardar();
  }

// Cancela edición 
  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }


  // Cierra todas las alertas
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Guarda los cambios del proveedor
  guardar(): void {
    this.mostrarErrores = true;
    if (this.proveedor.prov_NombreEmpresa.trim() && this.proveedor.prov_Codigo.trim() &&
        this.proveedor.prov_NombreContacto.trim() && this.proveedor.prov_Telefono.trim() &&
        this.proveedor.colo_Id > 0 && this.proveedor.prov_DireccionExacta.trim() &&
        this.proveedor.prov_Correo.trim() && this.proveedor.prov_Observaciones.trim()) {
      const proveedorActualizar = {
        ...this.proveedor,
        usua_Modificacion: getUserId(),
        prov_FechaModificacion: new Date().toISOString()
      };
      this.http.put<any>(`${environment.apiBaseUrl}/Proveedor/Actualizar`, proveedorActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Proveedor "${this.proveedor.prov_NombreEmpresa}" actualizado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.proveedor);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar el proveedor. Por favor, intente nuevamente.';
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
