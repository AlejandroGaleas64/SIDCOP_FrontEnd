import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Vendedor } from 'src/app/Modelos/ventas/Vendedor.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { NgSelectModule } from '@ng-select/ng-select';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,  NgxMaskDirective, NgSelectModule],
   providers: [provideNgxMask()],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent  {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Vendedor>();
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  uploadedFiles: string[] = [];

  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) {
    this.listarSucursales();
    this.listarColonias();
    this.listarEmpleados();
    this.listarModelos();
    this.listarRutasDisponibles();
    this.cargarVendedores();
    this.listarTiposdeVendedor();
  }

  vendedor: Vendedor = {
    vend_Id: 0,
    vend_Nombres: '',
    vend_Apellidos: '',
    vend_Codigo: '',
    vend_Telefono: '',
    vend_Correo: '',
    vend_DNI: '',
    vend_Sexo: 'M',
    vend_Tipo: '',
    tiVe_Id: 0,
    tiVe_Descripcion: '',
    vend_DireccionExacta: '',
    vend_Supervisor: 0,
    vend_Ayudante: 0,
    vend_EsExterno: false,
    colo_Id: 0,
    sucu_Id: 0,
    vend_Estado:'',
    vend_Imagen:'assets/images/users/32/user-svg.svg',
    vend_FechaCreacion: new Date(),
    vend_FechaModificacion: new Date(),
    usua_Creacion: 0,
    usua_Modificacion: 0,
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
    
  };

    sucursales: any[] = [];
    colonia: any[] = [];
    supervisores: any[] = [];
    ayudantes: any[] = [];
    modelos: any[] = [];
    vendedores: any[] = [];
    tiposVendedor: any[] = [];


    searchSucursal = (term: string, item: any) => {
  term = term.toLowerCase();
  return (
    item.sucu_Descripcion?.toLowerCase().includes(term) ||
    item.muni_Descripcion?.toLowerCase().includes(term) ||
    item.depa_Descripcion?.toLowerCase().includes(term)
  );
};

 searchColonias = (term: string, item: any) => {
  term = term.toLowerCase();
  return (
    item.colo_Descripcion?.toLowerCase().includes(term) ||
    item.muni_Descripcion?.toLowerCase().includes(term) ||
    item.depa_Descripcion?.toLowerCase().includes(term)
  );
};

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

listarRutasDisponibles(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Rutas/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => {
        this.rutasDisponibles = data;
        // Recalcular opciones cuando llegan las rutas
        this.recomputarOpciones();
      });
    }

  listarTiposdeVendedor(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/TiposDeVendedor/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => {
        this.tiposVendedor = data;
        console.log(this.tiposVendedor);
      });
    }



   cargarVendedores() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {this.vendedores = data; this.vendedor.vend_Codigo = this.generarSiguienteCodigo();},
      error => {
        console.error('Error al cargar las Vendedores:', error);
      }
    );
  }

 listarSucursales(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.sucursales = this.ordenarPorMunicipioYDepartamento(data));
    };

  listarColonias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.colonia = this.ordenarPorMunicipioYDepartamento(data));
    };

  listarEmpleados(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Empleado/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => {
    if (Array.isArray(data)) {
          this.supervisores = data
        .filter((empleado: any) => empleado.carg_Id === 1)
        .map((empleado: any) => ({
          ...empleado,
          nombreCompleto: `${empleado.empl_Nombres} ${empleado.empl_Apellidos}`
        }));
      this.ayudantes = data
        .filter((empleado: any) => empleado.carg_Id !== 1)
        .map((empleado: any) => ({
          ...empleado,
          nombreCompleto: `${empleado.empl_Nombres} ${empleado.empl_Apellidos}`
        }));
    } else {
      this.supervisores = [];
      this.ayudantes = [];
    }
  });
    };



  listarModelos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Modelo/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.modelos = data);
    };



    direccionExactaInicial: string = '';

onColoniaSeleccionada(colo_Id: number) {
  const coloniaSeleccionada = this.colonia.find((c: any) => c.colo_Id === colo_Id);
  if (coloniaSeleccionada) {
    this.direccionExactaInicial = coloniaSeleccionada.colo_Descripcion;
    this.vendedor.vend_DireccionExacta = coloniaSeleccionada.colo_Descripcion;
  } else {
    this.direccionExactaInicial = '';
    this.vendedor.vend_DireccionExacta = '';
  }
}

sexos: any[] = [
  { label: 'Masculino', value: 'M', icon: 'fa-solid fa-person' },
  { label: 'Femenino', value: 'F', icon: 'fa-solid fa-person-dress' }
];

tieneAyudante: boolean = false;
  

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.vendedor = {
       vend_Id: 0,
    vend_Nombres: '',
    vend_Apellidos: '',
    vend_Codigo: '',
    vend_Telefono: '',
    vend_Correo: '',
    vend_DNI: '',
    vend_Sexo: '',
    vend_Tipo: '',
    tiVe_Id: 0,
    tiVe_Descripcion: '',
    vend_DireccionExacta: '',
    vend_Supervisor: 0,
    vend_Ayudante: 0,
    vend_EsExterno: false,
    colo_Id: 0,
    sucu_Id: 0,
    vend_Estado:'',
    vend_Imagen:'assets/images/users/32/user-svg.svg',
    vend_FechaCreacion: new Date(),
    vend_FechaModificacion: new Date(),
    usua_Creacion: 0,
    usua_Modificacion: 0,
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
    };
    this.vendedor.vend_Codigo = this.generarSiguienteCodigo();
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
   const rutasValidas = this.rutasVendedor.length > 0 &&
    this.rutasVendedor.every(rv => rv.ruta_Id != null && rv.diasSeleccionados && rv.diasSeleccionados.length > 0);

  if (
    this.vendedor.vend_Apellidos.trim() &&
    this.vendedor.vend_Nombres.trim() && this.vendedor.vend_Codigo.trim() &&
    this.vendedor.vend_Telefono.trim() && this.vendedor.vend_Correo.trim() &&
    this.esCorreoValido(this.vendedor.vend_Correo) &&
    this.vendedor.vend_DNI.trim() && this.vendedor.vend_Sexo.trim() &&
    this.vendedor.tiVe_Id > 0 && this.vendedor.vend_DireccionExacta.trim() &&
    this.vendedor.sucu_Id > 0 && this.vendedor.colo_Id > 0 && rutasValidas
  ) {
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;

    // Preparar rutas para enviar (solo ruta_Id y veRu_Dias)
    const rutasParaEnviar = this.rutasVendedor
      .filter(rv => rv.ruta_Id != null && rv.veRu_Dias !== '')
      .map(rv => ({ ruta_Id: rv.ruta_Id as number, veRu_Dias: rv.veRu_Dias }));

    
    // Construir el objeto para guardar
    const vendedorGuardar: any = {
      vend_Id: 0,
      vend_DNI: this.vendedor.vend_DNI.trim(),
      vend_Codigo: this.vendedor.vend_Codigo.trim(),
      vend_Nombres: this.vendedor.vend_Nombres.trim(),
      vend_Apellidos: this.vendedor.vend_Apellidos.trim(),
      vend_Telefono: this.vendedor.vend_Telefono.trim(),
      vend_Correo: this.vendedor.vend_Correo.trim(),
      vend_Sexo: this.vendedor.vend_Sexo.trim(),
      tiVe_Id: this.vendedor.tiVe_Id,
      vend_DireccionExacta: this.vendedor.vend_DireccionExacta.trim(),
      colo_Id: this.vendedor.colo_Id,
      sucu_Id: this.vendedor.sucu_Id,
      vend_Supervisor: this.vendedor.vend_Supervisor || 0,
      vend_EsExterno: this.vendedor.vend_EsExterno || false,
      vend_Imagen: this.vendedor.vend_Imagen,
      usua_Creacion: getUserId(),
      vend_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: 0,
      numero: "",
      vend_FechaModificacion: new Date().toISOString(),
      usuarioCreacion: "",
      usuarioModificacion: "",
      rutas_Json: rutasParaEnviar,
      rutas_Json_Actualizar: rutasParaEnviar
    };

    // Solo agregar vend_Ayudante si tieneAyudante es true
    if (this.tieneAyudante && this.vendedor.vend_Ayudante) {
      vendedorGuardar.vend_Ayudante = this.vendedor.vend_Ayudante;
    }



    this.http.post<any>(`${environment.apiBaseUrl}/Vendedores/Insertar`, vendedorGuardar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {

        this.mensajeExito = `Vendedor "${this.vendedor.vend_Nombres}  ${this.vendedor.vend_Apellidos}" guardado exitosamente`;
        this.mostrarAlertaExito = true;
        this.mostrarErrores = false;

        setTimeout(() => {
          this.mostrarAlertaExito = false;
          this.onSave.emit(this.vendedor);
          this.cancelar();
        }, 3000);
      },
      error: (error) => {
        console.error('Error al guardar Vendedor:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al guardar el Vendedor. Por favor, intente nuevamente.';
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
// Opcional: lista de rutas y días para el select
rutasDisponibles: any[] = [];
rutasVendedor: { ruta_Id: number | null, diasSeleccionados: number[], veRu_Dias: string }[] = [
  { ruta_Id: null, diasSeleccionados: [], veRu_Dias: '' }
];
// Listas precalculadas por índice para evitar funciones en el template
rutasDisponiblesFiltradas: any[][] = [[]];
diasDisponiblesFiltradas: any[][] = [[]];

diasSemana = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
  { id: 7, nombre: 'Domingo' }
];

agregarRuta() {
  this.rutasVendedor.push({ ruta_Id: null, diasSeleccionados: [], veRu_Dias: '' });
  // Expandir arreglos filtrados para el nuevo índice
  this.rutasDisponiblesFiltradas.push([]);
  this.diasDisponiblesFiltradas.push([]);
  this.recomputarOpciones();
}

eliminarRuta(idx: number) {
  this.rutasVendedor.splice(idx, 1);
  this.rutasDisponiblesFiltradas.splice(idx, 1);
  this.diasDisponiblesFiltradas.splice(idx, 1);
  this.recomputarOpciones();
}

actualizarDias(idx: number, dias: number[]) {
  this.rutasVendedor[idx].veRu_Dias = dias.join(',');
  // Recalcular días disponibles para todos los índices
  this.recomputarOpciones();
 
}

// Reaccionar al cambio de ruta en un índice
onRutaChange(idx: number): void {
  this.recomputarOpciones();
}

// Recalcular listas filtradas por índice para rutas y días
recomputarOpciones(): void {
  // Asegurar longitud de arreglos filtrados
  if (this.rutasDisponiblesFiltradas.length !== this.rutasVendedor.length) {
    this.rutasDisponiblesFiltradas = new Array(this.rutasVendedor.length).fill(0).map(() => []);
  }
  if (this.diasDisponiblesFiltradas.length !== this.rutasVendedor.length) {
    this.diasDisponiblesFiltradas = new Array(this.rutasVendedor.length).fill(0).map(() => []);
  }

  const totalRutasSeleccionadas = this.rutasVendedor.map(rv => rv.ruta_Id);
  const totalDiasSeleccionadosPorIndice = this.rutasVendedor.map(rv => rv.diasSeleccionados);

  for (let i = 0; i < this.rutasVendedor.length; i++) {
    // Rutas disponibles: excluir seleccionadas en otros índices
    const rutasSeleccionadasOtros = totalRutasSeleccionadas.filter((_, idx) => idx !== i && totalRutasSeleccionadas[idx] != null);
    this.rutasDisponiblesFiltradas[i] = (this.rutasDisponibles || []).filter(r => !rutasSeleccionadasOtros.includes(r.ruta_Id));

    // Días disponibles: excluir días elegidos en otros índices
    const diasOtros = totalDiasSeleccionadosPorIndice
      .filter((_, idx) => idx !== i)
      .flatMap(arr => arr || []);
    this.diasDisponiblesFiltradas[i] = this.diasSemana.filter(d => !diasOtros.includes(d.id));
  }
}

// Validar si una ruta ya está seleccionada
esRutaYaSeleccionada(rutaId: number, indiceActual: number): boolean {
  return this.rutasVendedor.some((rv, index) => 
    index !== indiceActual && rv.ruta_Id === rutaId
  );
}

// Validar si un día ya está seleccionado en otra ruta
esDiaYaSeleccionado(diaId: number, indiceActual: number): boolean {
  return this.rutasVendedor.some((rv, index) => 
    index !== indiceActual && rv.diasSeleccionados.includes(diaId)
  );
}

generarSiguienteCodigo(): string {
  
  // Supón que tienes un array de promociones existentes llamado promociones
  const codigos = this.vendedores
    .map(p => p.vend_Codigo)
    .filter(c => /^VEND-\d{5}$/.test(c));
  if (codigos.length === 0) return 'VEND-00001';

  // Ordena y toma el mayor
  const ultimoCodigo = codigos.sort().pop()!;
  const numero = parseInt(ultimoCodigo.split('-')[1], 10) + 1;
  return `VEND-${numero.toString().padStart(5, '0')}`;
}

  async onImagenSeleccionada(event: any) {
    const file = event.target.files[0];
    
    if (file) {
      try {
        // Subir imagen al backend
        const imagePath = await this.imageUploadService.uploadImageAsync(file);
        this.vendedor.vend_Imagen = imagePath;
        this.uploadedFiles = [imagePath];
      } catch (error) {
        console.error('Error al subir la imagen:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al subir la imagen. Por favor, intente nuevamente.';
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    }
  }

  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
  }

   esCorreoValido(correo: string): boolean {
    if (!correo) return true;
    // Debe contener "@" y terminar en ".com"
    return /^[\w\.-]+@[\w\.-]+\.[cC][oO][mM]$/.test(correo.trim());
  }

}
