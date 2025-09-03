import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
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
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgxMaskDirective, NgSelectModule],
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
    vend_Estado: '',
    vend_Imagen: '',
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
    this.http.get<any>(`${environment.apiBaseUrl}/Rutas/Listar`, {
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

  vendedorOriginal: Vendedor = {
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
    vend_Estado: '',
    vend_Imagen: '',
    vend_FechaCreacion: new Date(),
    vend_FechaModificacion: new Date(),
    usua_Creacion: 0,
    usua_Modificacion: 0,
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    rutas: []
  };
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  uploadedFiles: string[] = [];

  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) {
    this.listarSucursales();
    this.listarEmpleados();
    this.listarColonias();
    this.listarRutas();
    this.listarRutasDisponibles();
  }







  ngOnChanges(changes: SimpleChanges): void {
    if (changes['vendedorData'] && changes['vendedorData'].currentValue) {
      this.vendedor = { ...changes['vendedorData'].currentValue };
      // Create a deep copy of the vendedor object for comparison
      this.vendedorOriginal = JSON.parse(JSON.stringify(this.vendedor));

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
      if (this.vendedor.vend_Ayudante != null && this.vendedor.vend_Ayudante > 0) {
        this.tieneAyudante = true;
      }

      // Configurar imagen existente para preview
      if (this.vendedor.vend_Imagen) {
        this.uploadedFiles = [this.vendedor.vend_Imagen];
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
      !this.esCorreoValido(this.vendedor.vend_Correo) ||
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
      this.vendedor.vend_Codigo.trim() !== (this.vendedorOriginal?.vend_Codigo?.trim() ?? '') ||
      this.vendedor.vend_DNI.trim() !== (this.vendedorOriginal?.vend_DNI?.trim() ?? '') ||
      this.vendedor.vend_Nombres.trim() !== (this.vendedorOriginal?.vend_Nombres?.trim() ?? '') ||
      this.vendedor.vend_Apellidos.trim() !== (this.vendedorOriginal?.vend_Apellidos?.trim() ?? '') ||
      this.vendedor.vend_Telefono.trim() !== (this.vendedorOriginal?.vend_Telefono?.trim() ?? '') ||
      this.vendedor.vend_Correo.trim() !== (this.vendedorOriginal?.vend_Correo?.trim() ?? '') ||
      this.vendedor.vend_Sexo !== (this.vendedorOriginal?.vend_Sexo ?? '') ||
      this.vendedor.vend_Tipo.trim() !== (this.vendedorOriginal?.vend_Tipo?.trim() ?? '') ||
      this.vendedor.vend_DireccionExacta.trim() !== (this.vendedorOriginal?.vend_DireccionExacta?.trim() ?? '') ||
      this.vendedor.sucu_Id !== (this.vendedorOriginal?.sucu_Id ?? 0) ||
      this.vendedor.colo_Id !== (this.vendedorOriginal?.colo_Id ?? 0) ||
      this.vendedor.vend_Supervisor !== (this.vendedorOriginal?.vend_Supervisor ?? 0) ||
      (this.tieneAyudante && this.vendedor.vend_Ayudante !== (this.vendedorOriginal?.vend_Ayudante ?? 0)) ||
      this.vendedor.vend_EsExterno !== (this.vendedorOriginal?.vend_EsExterno ?? false) ||
      this.vendedor.vend_Imagen !== (this.vendedorOriginal?.vend_Imagen ?? '') ||
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
        vend_Imagen: this.vendedor.vend_Imagen || 'assets/images/users/32/user-svg.svg',
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

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/user-dummy-img.jpg';
  }
  cambiosDetectados: any = {};

  obtenerListaCambios(): { label: string; anterior: string; nuevo: string }[] {
    // Genera la lista de cambios en tiempo real (como en descuentos/promociones)
    const cambios: { label: string; anterior: string; nuevo: string }[] = [];



    const val = (v: any) => v == null || v === '' ? '—' : String(v);
    const trim = (s: any) => (s ?? '').toString().trim();
    const nuevo = this.vendedor as any;
    const original = this.vendedorOriginal as any;
    this.cambiosDetectados = {};

    console.log('=== INICIO DETECCIÓN CAMBIOS ===');
    console.log('Vendedor actual:', JSON.parse(JSON.stringify(nuevo)));
    console.log('Vendedor original:', JSON.parse(JSON.stringify(original)));

    // Verificar campos básicos del vendedor (solo campos de texto/valor directo)
    // Excluimos ddl/relacionales e imagen para tratarlos aparte (sucursal, colonia, supervisor, ayudante, sexo, imagen)
    const camposBasicos = [
      { key: 'vend_DNI', label: 'DNI' },
      { key: 'vend_Nombres', label: 'Nombres' },
      { key: 'vend_Apellidos', label: 'Apellidos' },
      { key: 'vend_Telefono', label: 'Teléfono' },
      { key: 'vend_Correo', label: 'Correo' },
      { key: 'vend_DireccionExacta', label: 'Dirección Exacta' },
      { key: 'vend_Tipo', label: 'Tipo de Vendedor' },
      { key: 'vend_EsExterno', label: 'Es Contratista' }
    ];

    console.log('=== COMPARANDO CAMPOS BÁSICOS ===');
    camposBasicos.forEach(campo => {
      const valorOriginal = original[campo.key];
      const valorNuevo = nuevo[campo.key];
      const sonDiferentes = valorOriginal !== valorNuevo;

      console.log(`Campo: ${campo.key}`, {
        original: valorOriginal,
        nuevo: valorNuevo,
        sonDiferentes
      });

      if (sonDiferentes) {
        const item = {
          anterior: val(valorOriginal),
          nuevo: val(valorNuevo),
          label: campo.label
        };
        this.cambiosDetectados[campo.key] = item as any;
        cambios.push(item);
        console.log(`Cambio detectado en ${campo.key}:`, item);
      }
    });

    console.log('Cambios detectados hasta ahora:', Object.keys(this.cambiosDetectados).length > 0 ? this.cambiosDetectados : 'Ninguno');

    // Verificar tipo de vendedor (mapeado legible)
    if (nuevo.vend_Tipo !== original.vend_Tipo) {
      const tipos = { 'P': 'Preventista', 'V': 'Venta Directa', 'F': 'Entregador' } as const;
      const tipoOriginal = (tipos as any)[original.vend_Tipo] || original.vend_Tipo || '—';
      const tipoNuevo = (tipos as any)[nuevo.vend_Tipo] || nuevo.vend_Tipo || '—';
      const item = { anterior: tipoOriginal, nuevo: tipoNuevo, label: 'Tipo de Vendedor' };
      this.cambiosDetectados.tipo = item as any;
      cambios.push(item);
    }

    // Verificar si es contratista
    if (nuevo.vend_EsExterno !== original.vend_EsExterno) {
      const item = {
        anterior: original.vend_EsExterno ? 'Sí' : 'No',
        nuevo: nuevo.vend_EsExterno ? 'Sí' : 'No',
        label: 'Es Contratista'
      };
      this.cambiosDetectados.contratista = item as any;
      cambios.push(item);
    }

    // Helpers para mapeos
    const sucuNombre = (id: number) => (this.sucursales.find(s => Number(s.sucu_Id) === Number(id))?.sucu_Descripcion) || `ID: ${id}`;
    const coloNombre = (id: number) => (this.colonia.find(c => Number(c.colo_Id) === Number(id))?.colo_Descripcion) || `ID: ${id}`;
    const empleadoNombre = (id: number) => (
      this.supervisores.find(e => Number(e.empl_Id) === Number(id))?.nombreCompleto ||
      this.ayudantes.find(e => Number(e.empl_Id) === Number(id))?.nombreCompleto ||
      `ID: ${id}`
    );
    const sexoNombre = (v: string) => v === 'M' ? 'Masculino' : v === 'F' ? 'Femenino' : val(v);

    // Verificar sexo
    if (nuevo.vend_Sexo !== original.vend_Sexo) {
      const item = { anterior: sexoNombre(original.vend_Sexo), nuevo: sexoNombre(nuevo.vend_Sexo), label: 'Sexo' };
      this.cambiosDetectados.vend_Sexo = item as any;
      cambios.push(item);
    }

    // Verificar sucursal
    if (nuevo.sucu_Id !== original.sucu_Id) {
      const item = { anterior: sucuNombre(original.sucu_Id), nuevo: sucuNombre(nuevo.sucu_Id), label: 'Sucursal' };
      this.cambiosDetectados.sucursal = item as any;
      cambios.push(item);
    }

    // Verificar colonia
    if (nuevo.colo_Id !== original.colo_Id) {
      const item = { anterior: coloNombre(original.colo_Id), nuevo: coloNombre(nuevo.colo_Id), label: 'Colonia' };
      this.cambiosDetectados.colonia = item as any;
      cambios.push(item);
    }

    // Verificar imagen (solo para vista previa, no agregar a la lista de cambios)
    if (nuevo.vend_Imagen !== original.vend_Imagen) {
      this.cambiosDetectados.imagen = {
        anterior: original.vend_Imagen ? 'Imagen actual' : 'Sin imagen',
        nuevo: nuevo.vend_Imagen ? 'Nueva imagen' : 'Sin imagen',
        label: 'Imagen del Vendedor'
      } as any;
    }

    // Verificar Supervisor
    if (nuevo.vend_Supervisor !== original.vend_Supervisor) {
      const item = { anterior: empleadoNombre(original.vend_Supervisor), nuevo: empleadoNombre(nuevo.vend_Supervisor), label: 'Supervisor' };
      this.cambiosDetectados.vend_Supervisor = item as any;
      cambios.push(item);
    }

    // Verificar Ayudante si aplica
    if (this.tieneAyudante && (nuevo.vend_Ayudante !== original.vend_Ayudante)) {
      const item = { anterior: empleadoNombre(original.vend_Ayudante), nuevo: empleadoNombre(nuevo.vend_Ayudante), label: 'Ayudante' };
      this.cambiosDetectados.vend_Ayudante = item as any;
      cambios.push(item);
    }

    // Verificar rutas y días
    // Normalizar rutas originales desde vendedorOriginal.rutas
    const rutasOriginales = Array.isArray(original.rutas) ? original.rutas : [];
    // Construir rutas nuevas desde this.rutasVendedor (estado actual en UI)
    const rutasNuevas = (this.rutasVendedor || []).map(rv => ({
      ruta_Id: rv.ruta_Id as number,
      ruta_Descripcion: (this.rutasTodas || this.rutasDisponibles || []).find((r: any) => Number(r.ruta_Id ?? r.id) === Number(rv.ruta_Id))?.ruta_Descripcion,
      diasSeleccionados: Array.isArray(rv.diasSeleccionados) ? rv.diasSeleccionados : (rv.veRu_Dias ? String(rv.veRu_Dias).split(',').map((x: string) => Number(x)).filter(n => !isNaN(n)) : [])
    }));

    // Función para formatear los días
    const formatearDias = (dias: any[]): string => {
      if (!dias || !dias.length) return 'Sin días';
      const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return dias.map(d => {
        if (typeof d === 'object' && d !== null && 'nombre' in d) {
          return (d as any).nombre;
        }
        return diasSemana[Number(d)] || d;
      }).join(', ');
    };

    // Definir tipos para las rutas
    interface Ruta {
      ruta_Id: number;
      ruta_Descripcion?: string;
      diasSeleccionados?: any[];
    }

    // Verificar cambios en rutas
    const rutasCambiadas: Array<{
      accion: string;
      ruta: string;
      dias?: string;
      diasAnteriores?: string;
      diasNuevos?: string;
    }> = [];

    // Normalizar rutas originales a estructura Ruta
    const rutasOriginalesNorm: Ruta[] = (rutasOriginales as any[]).map((r: any) => ({
      ruta_Id: Number(r.ruta_Id ?? r.id),
      ruta_Descripcion: r.ruta_Descripcion,
      diasSeleccionados: Array.isArray(r.diasSeleccionados)
        ? r.diasSeleccionados
        : (r.veRu_Dias || r.dias ? String(r.veRu_Dias || r.dias).split(',').map((x: string) => Number(x)).filter((n: number) => !isNaN(n)) : [])
    }));

    const rutasOriginalesMap = new Map<number, Ruta>(
      rutasOriginalesNorm.map((r: Ruta) => [r.ruta_Id, r] as [number, Ruta])
    );

    // Buscar rutas modificadas o nuevas
    for (const rutaNueva of rutasNuevas as Ruta[]) {
      const rutaOriginal = rutasOriginalesMap.get(rutaNueva.ruta_Id);

      if (!rutaOriginal) {
        // Ruta nueva
        rutasCambiadas.push({
          accion: 'Agregada',
          ruta: rutaNueva.ruta_Descripcion || `Ruta ${rutaNueva.ruta_Id}`,
          dias: formatearDias(rutaNueva.diasSeleccionados || [])
        });
      } else {
        // Verificar si los días cambiaron
        const diasOriginales = Array.isArray(rutaOriginal.diasSeleccionados)
          ? [...rutaOriginal.diasSeleccionados].sort()
          : [];
        const diasNuevos = Array.isArray(rutaNueva.diasSeleccionados)
          ? [...rutaNueva.diasSeleccionados].sort()
          : [];

        if (JSON.stringify(diasOriginales) !== JSON.stringify(diasNuevos)) {
          rutasCambiadas.push({
            accion: 'Modificada',
            ruta: rutaNueva.ruta_Descripcion || `Ruta ${rutaNueva.ruta_Id}`,
            diasAnteriores: formatearDias(diasOriginales),
            diasNuevos: formatearDias(diasNuevos)
          });
        }
      }
    }

    // Buscar rutas eliminadas
    const rutasNuevasIds = new Set((rutasNuevas as Ruta[]).map(r => r.ruta_Id));
    for (const rutaOriginal of rutasOriginales as Ruta[]) {
      if (!rutasNuevasIds.has(rutaOriginal.ruta_Id)) {
        rutasCambiadas.push({
          accion: 'Eliminada',
          ruta: rutaOriginal.ruta_Descripcion || `Ruta ${rutaOriginal.ruta_Id}`,
          dias: formatearDias(rutaOriginal.diasSeleccionados || [])
        });
      }
    }

    // Si hay cambios en las rutas, agregarlos a los cambios detectados
    if (rutasCambiadas.length > 0) {
      this.cambiosDetectados.rutas = {
        anterior: '—',
        nuevo: `${rutasCambiadas.length} cambio(s)`,
        label: 'Cambios en Rutas',
        detalle: rutasCambiadas
      } as any;
    }

    // Devolver solo la lista curada (sin incluir imagen/URL u otros internos)
    return cambios;

  }

  esCorreoValido(correo: string): boolean {
    if (!correo) return true;
    // Debe contener "@" y terminar en ".com"
    return /^[\w\.-]+@[\w\.-]+\.[cC][oO][mM]$/.test(correo.trim());
  }
}
