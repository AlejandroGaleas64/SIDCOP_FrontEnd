import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Proveedor } from 'src/app/Modelos/general/Proveedor.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule, NgxMaskDirective],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
  providers: [provideNgxMask()],
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Proveedor>();

  proveedor: Proveedor = new Proveedor();
  // Catálogos para DDL dependientes
  Departamentos: any[] = [];
  TodosMunicipios: any[] = [];
  TodosColonias: any[] = [];
  Municipios: any[] = [];
  Colonias: any[] = [];
  selectedDepa: string = '';
  selectedMuni: string = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {
    this.cargarListados();
  }

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

  cargarMunicipios(codigoDepa: string): void {
    this.Municipios = this.TodosMunicipios.filter(m => m.depa_Codigo === codigoDepa);
    this.Colonias = [];
    this.selectedMuni = '';
    this.proveedor.colo_Id = 0;
  }

  cargarColonias(codigoMuni: string): void {
    this.Colonias = this.TodosColonias.filter(c => c.muni_Codigo === codigoMuni);
    this.proveedor.colo_Id = 0;
  }

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.proveedor = new Proveedor();
    this.selectedDepa = '';
    this.selectedMuni = '';
    this.Municipios = [];
    this.Colonias = [];
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
    if (this.proveedor.prov_NombreEmpresa.trim() && this.proveedor.prov_Codigo.trim() &&
        this.proveedor.prov_NombreContacto.trim() && this.proveedor.prov_Telefono.trim() &&
        this.proveedor.colo_Id > 0 && this.proveedor.prov_DireccionExacta.trim() &&
        this.proveedor.prov_Correo.trim() && this.proveedor.prov_Observaciones.trim()) {
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      const proveedorGuardar = {
        ...this.proveedor,
        usua_Creacion: getUserId(),
        prov_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        prov_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "",
        usuarioModificacion: ""
      };
      this.http.post<any>(`${environment.apiBaseUrl}/Proveedor/Insertar`, proveedorGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `Proveedor "${this.proveedor.prov_NombreEmpresa}" guardado exitosamente`;
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
          this.mensajeError = 'Error al guardar el proveedor. Por favor, intente nuevamente.';
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

  revisarCorreoValido(correo: string): boolean {
    if (!correo) return true;
    // Debe contener "@" y terminar en ".com" y aceptar cualquier dominio
    return /^[\w\.-]+@[\w\.-]+\.[cC][oO][mM]$/.test(correo.trim());
  }

   direccionExactaInicial: string = '';

  onColoniaSeleccionada(colo_Id: number) {
    const coloniaSeleccionada = this.TodosColonias.find((c: any) => c.colo_Id === colo_Id);
    if (coloniaSeleccionada) {
      this.direccionExactaInicial = coloniaSeleccionada.colo_Descripcion;
      this.proveedor.prov_DireccionExacta = coloniaSeleccionada.colo_Descripcion;
    } else {
      this.direccionExactaInicial = '';
      this.proveedor.prov_DireccionExacta = '';
    }
  }

  //Para buscar colonias en DDL
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };
}
