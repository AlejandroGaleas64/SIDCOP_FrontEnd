import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Vendedor } from 'src/app/Modelos/ventas/Vendedor.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,  NgxMaskDirective, NgSelectModule],
   providers: [provideNgxMask()],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnChanges {
  @Input() vendedorData: Vendedor | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Vendedor>();

 vendedor: Vendedor = {
    vend_Id: 0,
    vend_Nombres: '',
    vend_Apellidos: '',
    vend_Codigo: '',
    vend_Telefono: '',
    vend_Correo: '',
    vend_DNI: '',
    vend_Sexo: '',
    vend_Tipo: '',
    vend_DireccionExacta: '',
    vend_Supervisor: 0,
    vend_Ayudante: 0,
    vend_EsExterno: false,
    colo_Id: 0,
    sucu_Id: 0,
    vend_Estado:'',
    vend_FechaCreacion: new Date(),
    vend_FechaModificacion: new Date(),
    usua_Creacion: 0,
    usua_Modificacion: 0,
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    rutas: [],
    
  };

    sucursales: any[] = [];
    colonia: any[] = [];
    supervisores: any[] = [];
    ayudantes: any[] = [];
    modelos: any[] = [];


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

listarRutas(): void {
  this.http.get<any>(`${environment.apiBaseUrl}/Rutas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => {
      this.rutasTodas = data;
      // Recalcular opciones cuando llegan las rutas
      this.recomputarOpciones();
    });
  }

listarRutasDisponibles(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Rutas/ListarDisponibles`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => {
        this.rutasDisponibles = data;
        // Recalcular opciones cuando llegan las rutas
        this.recomputarOpciones();
      });
    }

 listarSucursales(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.sucursales = this.ordenarPorMunicipioYDepartamento(data));
    }

  listarColonias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.colonia = this.ordenarPorMunicipioYDepartamento(data));
    }

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
    }



  



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

  vendedorOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  constructor(private http: HttpClient) {
    this.listarSucursales();
    this.listarEmpleados();
    this.listarColonias();
    this.listarRutas();
    this.listarRutasDisponibles();
  }





 

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vendedorData'] && changes['vendedorData'].currentValue) {
      this.vendedor = { ...changes['vendedorData'].currentValue };
      this.vendedorOriginal = this.vendedor.vend_Codigo || '';
      this.mostrarErrores = false;

      // Normaliza rutas: puede venir como arreglo o como JSON string
      const rutasRaw: any = this.vendedor.rutas as any;
      let rutasApi: any[] = [];
      if (Array.isArray(rutasRaw)) {
        rutasApi = rutasRaw;
      } else if (typeof rutasRaw === 'string' && rutasRaw.trim().length > 0) {
        try {
          const parsed = JSON.parse(rutasRaw);
          rutasApi = Array.isArray(parsed) ? parsed : [];
        } catch {
          rutasApi = [];
        }
      } else {
        rutasApi = [];
      }

      if (rutasApi.length > 0) {
        this.rutasVendedor = rutasApi.map((r: any) => {
          const diasSel = (r.dias ?? '')
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => s !== '')
            .map((n: string) => Number(n));

          return {
            ruta_Id: (r.ruta_Id ?? r.id) != null ? Number(r.ruta_Id ?? r.id) : null,                  // aceptar ambos nombres de campo y normalizar a número
            diasSeleccionados: diasSel,     // para el ng-select de días
            veRu_Dias: diasSel.join(',')    // para enviar al backend
          };
        });
      } else {
        // si no trae rutas, deja al menos una fila vacía
        this.rutasVendedor = [{ ruta_Id: null, diasSeleccionados: [], veRu_Dias: '' }];
      }

// Recalcula listas filtradas para que no aparezcan duplicadas
      this.recomputarOpciones();
      // Guardar snapshot inicial de rutas para detección de cambios
      this.rutasVendedorSnapshot = this.serializeRutas(this.rutasVendedor);
      if(this.vendedor.vend_Ayudante != null && this.vendedor.vend_Ayudante > 0  )
      {
          this.tieneAyudante = true;
      }
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
    !this.vendedor.vend_Codigo.trim() ||
    !this.vendedor.vend_DNI.trim() ||
    !this.vendedor.vend_Nombres.trim() ||
    !this.vendedor.vend_Apellidos.trim() ||
    !this.vendedor.vend_Telefono.trim() ||
    !this.vendedor.vend_Correo.trim() ||
    !this.vendedor.vend_Sexo ||
    !this.vendedor.vend_DireccionExacta.trim() ||
    !this.vendedor.sucu_Id ||
    !this.vendedor.colo_Id ||
    !this.vendedor.vend_Tipo.trim() ||
    !this.vendedor.vend_Supervisor ||
    (this.tieneAyudante && !this.vendedor.vend_Ayudante) 
    || this.rutasVendedor.length === 0
  ) {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
    setTimeout(() => this.cerrarAlerta(), 4000);
    return;
  }

  // Detectar cambios en los campos principales
  const rutasHanCambiado = this.serializeRutas(this.rutasVendedor) !== this.rutasVendedorSnapshot;
  const cambios =
    this.vendedor.vend_Codigo.trim() !== (this.vendedorData?.vend_Codigo?.trim() ?? '') ||
  this.vendedor.vend_DNI.trim() !== (this.vendedorData?.vend_DNI?.trim() ?? '') ||
  this.vendedor.vend_Nombres.trim() !== (this.vendedorData?.vend_Nombres?.trim() ?? '') ||
  this.vendedor.vend_Apellidos.trim() !== (this.vendedorData?.vend_Apellidos?.trim() ?? '') ||
  this.vendedor.vend_Telefono.trim() !== (this.vendedorData?.vend_Telefono?.trim() ?? '') ||
  this.vendedor.vend_Correo.trim() !== (this.vendedorData?.vend_Correo?.trim() ?? '') ||
  this.vendedor.vend_Sexo !== (this.vendedorData?.vend_Sexo ?? '') ||
  this.vendedor.vend_DireccionExacta.trim() !== (this.vendedorData?.vend_DireccionExacta?.trim() ?? '') ||
  this.vendedor.sucu_Id !== (this.vendedorData?.sucu_Id ?? 0) ||
  this.vendedor.colo_Id !== (this.vendedorData?.colo_Id ?? 0) ||
  this.vendedor.vend_Tipo.trim() !== (this.vendedorData?.vend_Tipo?.trim() ?? '') ||
  this.vendedor.vend_Supervisor !== (this.vendedorData?.vend_Supervisor ?? 0) ||
  (this.tieneAyudante && this.vendedor.vend_Ayudante !== (this.vendedorData?.vend_Ayudante ?? 0)) ||
  this.vendedor.vend_EsExterno !== (this.vendedorData?.vend_EsExterno ?? false) ||
  rutasHanCambiado

  if (cambios) {
    this.mostrarConfirmacionEditar = true;
  } else {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'No se han detectado cambios.';
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

  private guardar(): void {
    this.mostrarErrores = true;

   if (this.vendedor.vend_Nombres.trim()) {

    const rutasParaEnviar = this.rutasVendedor
      .filter(rv => rv.ruta_Id != null && rv.veRu_Dias !== '')
      .map(rv => ({ ruta_Id: rv.ruta_Id as number, veRu_Dias: rv.veRu_Dias }));
  const VendedorActualizar: any = {
    vend_Id: this.vendedor.vend_Id,
    vend_Codigo: this.vendedor.vend_Codigo.trim(),
    vend_DNI: this.vendedor.vend_DNI.trim(),
    vend_Nombres: this.vendedor.vend_Nombres.trim(),
    vend_Apellidos: this.vendedor.vend_Apellidos.trim(),
    vend_Telefono: this.vendedor.vend_Telefono.trim(),
    vend_Correo: this.vendedor.vend_Correo.trim(),
    vend_Sexo: this.vendedor.vend_Sexo,
    vend_Tipo: this.vendedor.vend_Tipo.trim(),
    vend_DireccionExacta: this.vendedor.vend_DireccionExacta.trim(),
    sucu_Id: this.vendedor.sucu_Id,
    colo_Id: this.vendedor.colo_Id,
    vend_Supervisor: this.vendedor.vend_Supervisor || 0,
    vend_EsExterno: this.vendedor.vend_EsExterno || false,
    usua_Modificacion: getUserId(),
    vend_FechaModificacion: new Date().toISOString(),
    usuarioModificacion: '',
    rutas_Json: rutasParaEnviar
  };

  // Solo agregar vend_Ayudante si tieneAyudante es true
  if (this.tieneAyudante && this.vendedor.vend_Ayudante) {
    VendedorActualizar.vend_Ayudante = this.vendedor.vend_Ayudante;
  }

      this.http.put<any>(`${environment.apiBaseUrl}/Vendedores/Actualizar`, VendedorActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          this.mensajeExito = `El Vendedor "${this.vendedor.vend_Nombres}" actualizado exitosamente`;
          this.mostrarAlertaExito = true;
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.vendedor);
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          console.error('Error al actualizar la Vendedor:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la Vendedor. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  rutasDisponibles: any[] = [];
  rutasTodas: any[] = [];
rutasVendedor: { ruta_Id: number | null, diasSeleccionados: number[], veRu_Dias: string }[] = [
  { ruta_Id: null, diasSeleccionados: [], veRu_Dias: '' }
];
// Snapshot serializado de rutas para detectar cambios
private rutasVendedorSnapshot: string = '';
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
  console.log('rutasVendedor actualizadas:', this.rutasVendedor);
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

  // Asegurar que rutasDisponibles incluya las rutas actualmente asignadas al vendedor
  // aunque no estén disponibles globalmente (para edición)
  if (Array.isArray(this.rutasTodas) && Array.isArray(this.rutasDisponibles) && Array.isArray(this.rutasVendedor)) {
    const seleccionadas = new Set(
      this.rutasVendedor
        .map(rv => rv.ruta_Id)
        .filter((id): id is number => id != null)
    );

    const faltantesSeleccionadas = this.rutasTodas
      .map((r: any) => ({
        id: Number(r?.ruta_Id ?? r?.id),
        ruta_Descripcion: r?.ruta_Descripcion ?? `Ruta ${r?.ruta_Id ?? r?.id}`
      }))
      .filter((r: any) => seleccionadas.has(r.id))
      .filter((r: any) => !this.rutasDisponibles.some((d: any) => Number(d.ruta_Id) === r.id))
      .map((r: any) => ({ ruta_Id: r.id, ruta_Descripcion: r.ruta_Descripcion }));

    if (faltantesSeleccionadas.length > 0) {
      this.rutasDisponibles = [
        ...this.rutasDisponibles,
        ...faltantesSeleccionadas
      ];
    }
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


  // Serializar rutas para detección de cambios (orden estable y días ordenados)
  private serializeRutas(arr: { ruta_Id: number | null, diasSeleccionados: number[], veRu_Dias: string }[]): string {
    const norm = (arr || [])
      .map(it => ({
        ruta_Id: it.ruta_Id != null ? Number(it.ruta_Id) : null,
        dias: [...(it.diasSeleccionados || [])].map(Number).sort((a, b) => a - b)
      }))
      .sort((a, b) => {
        if (a.ruta_Id === b.ruta_Id) return 0;
        if (a.ruta_Id == null) return 1;
        if (b.ruta_Id == null) return -1;
        return (a.ruta_Id as number) - (b.ruta_Id as number);
      })
      .map(x => `${x.ruta_Id}|${x.dias.join(',')}`);
    return norm.join(';');
  }

}
