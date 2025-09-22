import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { NgSelectModule } from '@ng-select/ng-select';
import { Descuento } from 'src/app/Modelos/inventario/DescuentoModel';
import { DescuentoDetalle } from 'src/app/Modelos/inventario/DescuentoDetalleModel';
import { DescuentoPorCliente } from 'src/app/Modelos/inventario/DescuentoPorClienteModel';
import { DescuentoPorEscala } from 'src/app/Modelos/inventario/DescuentoPorEscalaModel';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { NgStepperModule } from 'angular-ng-stepper';
import { ViewChild } from '@angular/core';
import { CdkStepper } from '@angular/cdk/stepper';
import { CurrencyMaskModule } from "ng2-currency-mask";
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,  NgxMaskDirective, NgSelectModule, CdkStepperModule, NgStepperModule,CurrencyMaskModule],
   providers: [provideNgxMask()],
  templateUrl: './edit.component.html',
  styleUrl: './edit.component.scss'
})
export class EditComponent implements OnChanges {
  @Input()descuentoData: Descuento | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Descuento>();
seccionVisible: string | null = null;
  filtro: string = '';
  seleccionados: number[] = [];
  clientesAgrupados: { canal: string, clientes: any[], filtro: string, collapsed: boolean }[] = [];
clientesSeleccionados: number[] = [];
descuentosExistentes: any[] = [];
activeTab: number = 1;

 @ViewChild('cdkStepper') cdkStepper!: CdkStepper;

    tabActiva: string = 'productos';
change(event: any) {
  }

get itemsDisponibles(): any[] {
  switch (this.seccionVisible) {
    case 'productos': return this.productos;
    case 'categorias': return this.categorias;
    case 'subcategorias': return this.subcategorias;
    case 'marcas': return this.marcas;
    default: return [];
  }
}

getId(item: any): number {
  if (this.seccionVisible === 'productos') return item.prod_Id;
  if (this.seccionVisible === 'categorias') return item.cate_Id;
  if (this.seccionVisible === 'subcategorias') return item.subc_Id;
  if (this.seccionVisible === 'marcas') return item.marc_Id;
  return 0;
}

getNombre(item: any): string {
  if (this.seccionVisible === 'productos') return item.prod_DescripcionCorta;
  if (this.seccionVisible === 'categorias') return item.cate_Descripcion;
  if (this.seccionVisible === 'subcategorias') return item.subc_Descripcion;
  if (this.seccionVisible === 'marcas') return item.marc_Descripcion;
  return '';
}

  // Opciones dinámicas para currencyMask
  opcionesMontoFijo: any = {
    prefix: 'L. ',
    suffix: '',
    thousands: ',',
    decimal: '.',
    precision: 2,
    allowNegative: false,
    align: 'right'
  };

  opcionesPorcentaje: any = {
    prefix: '',
    suffix: ' %',
    thousands: ',',
    decimal: '.',
    precision: 2,
    allowNegative: false,
    align: 'right'
  };

mostrarSeccion(seccion: string) {
  this.seccionVisible = seccion;
  this.filtro = '';
  this.seleccionados = []; // Limpiar al cambiar sección
  this.descuentoDetalle.idReferencias = []; // También limpiar la propiedad relacionada
  this.tabActiva = seccion;

  switch (seccion) {
    case 'productos':
      this.descuento.desc_Aplicar = 'P';
      break;
    case 'categorias':
      this.descuento.desc_Aplicar = 'C';
      break;
    case 'subcategorias':
      this.descuento.desc_Aplicar = 'S';
      break;
    case 'marcas':
      this.descuento.desc_Aplicar = 'M';
      break;
  }
  // Revalidar clientes y recalcular/clamp de escalas al cambiar el ámbito de aplicación
  this.validarClientesSeleccionadosAlLlegarATab();
  this.reclampEscalasSegunMax();
}

getItemsFiltrados() {
  return this.itemsDisponibles.filter(item =>
    this.getNombre(item).toLowerCase().includes(this.filtro.toLowerCase())
  );
}

alternarSeleccion(id: number) {
  const index = this.seleccionados.indexOf(id);
  if (index > -1) {
    this.seleccionados.splice(index, 1);
  } else {
    this.seleccionados.push(id);
  }
  this.descuentoDetalle.idReferencias = [...this.seleccionados]; // actualizar modelo
  // Al cambiar referencias, revalidar clientes y ajustar escalas si aplica monto fijo
  this.validarClientesSeleccionadosAlLlegarATab();
  this.reclampEscalasSegunMax();
}

todosSeleccionados(): boolean {
  const items = this.getItemsFiltrados();
  return items.length > 0 && items.every(item => this.seleccionados.includes(this.getId(item)));
}

seleccionarTodos(event: any) {
  const items = this.getItemsFiltrados();
  if (event.target.checked) {
    this.seleccionados = items.map(item => this.getId(item));
  } else {
    this.seleccionados = [];
  }
  this.descuentoDetalle.idReferencias = [...this.seleccionados];
  // Revalidar clientes y ajustar escalas según el nuevo máximo
  this.validarClientesSeleccionadosAlLlegarATab();
  this.reclampEscalasSegunMax();
}

hoy: string;

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) {
    this.listarcategorias();
    this.listarmarcass();
    this.listarPorductos();
    this.listarSubcategorias();
    this.listarClientes();
    this.listarDescuentos();
    const today = new Date();
    this.hoy = today.toISOString().split('T')[0]; // "YYYY-MM-DD"
    this.mostrarSeccion('productos');
    this.activeTab = 1;

    
  }



  descuento: Descuento = {
    desc_Id:  0,
  desc_Descripcion:  '',
  desc_Tipo: false, 
  desc_Aplicar:  '',
  desc_FechaInicio:  new Date(),
  desc_FechaFin: new Date(),
  desc_Observaciones:  '',
  usua_Creacion:  0,
  desc_FechaCreacion:  new Date(),
  usua_Modificacion: 0,
  desc_FechaModificacion: new Date(),
  desc_Estado: false,
  usuarioCreacion:  '',
  usuarioModificacion: '',
  code_Status:  0,
  message_Status:'',
  clientes: '',
  referencias: '',
  escalas: '',
  desc_TipoFactura: '',
  }

  descuentoDetalle: DescuentoDetalle = {
    desc_Id:  0,
  desD_Id:  0,
  desD_IdReferencia: 0, 
  idReferencias: [],
  usua_Creacion:  0,
  desD_FechaCreacion:  new Date(),
  usua_Modificacion: 0,
  desD_FechaModificacion: new Date(),
  desD_Estado: false,
  usuarioCreacion:  '',
  usuarioModificacion: '',
  code_Status:  0,
  message_Status:''
  }

  descuentoPorCliente: DescuentoPorCliente = {
    desc_Id:  0,
  deCl_Id:  0,
  clie_Id: 0, 
  idClientes: [],
  usua_Creacion:  0,
  deEs_FechaCreacion:  new Date(),
  usua_Modificacion: 0,
  deEs_FechaModificacion: new Date(),
  deCl_Estado: false,
  usuarioCreacion:  '',
  usuarioModificacion: '',
  code_Status:  0,
  message_Status:''
  }

  descuentoPorEscala: DescuentoPorEscala = {
    desc_Id:  0,
  deEs_Id:  0,
  deEs_InicioEscala: 0, 
  deEs_FinEscala: 0, 
  deEs_Valor: 0, 
  escalas_JSON: '',
  escalas: [],
  usua_Creacion:  0,
  deEs_FechaCreacion:  new Date(),
  usua_Modificacion: 0,
  deEs_FechaModificacion: new Date(),
  deEs_Estado: false,
  usuarioCreacion:  '',
  usuarioModificacion: '',
  code_Status:  0,
  message_Status:''
  }

    categorias: any[] = [];
    marcas: any[] = [];
    productos: any[] = [];
    subcategorias: any[] = [];
    clientes: any[] = [];


    

 listarcategorias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Categorias/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.categorias = data);
    };

  listarmarcass(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Marcas/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.marcas = data);
    };

  listarPorductos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.productos = data);
    };



  listarSubcategorias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Subcategoria/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.subcategorias = data);
    };

   listarClientes(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Cliente/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => {
    const agrupados: { [canal: string]: any[] } = {};

    for (const cliente of data) {
      const canal = cliente.cana_Descripcion || 'Sin canal';
      if (!agrupados[canal]) {
        agrupados[canal] = [];
      }
      agrupados[canal].push(cliente);
    }

    this.clientesAgrupados = Object.keys(agrupados).map(canal => ({
      canal,
      filtro: '', // Se agrega filtro para el buscador individual
      clientes: agrupados[canal],
      collapsed: true // Inicialmente todos los canales están expandidos
    }));
  });
}

// Helpers: obtener nombres legibles para IDs
private getNombreClientePorId(id: number): string {
  for (const grupo of this.clientesAgrupados || []) {
    const c = (grupo.clientes || []).find((x: any) => Number(x.clie_Id) === Number(id));
    if (c) return c.clie_NombreNegocio || c.clie_NombreComercial || c.clie_NombreCompleto || String(id);
  }
  return String(id);
}

private getNombreReferenciaPorId(id: number, aplicar: string): string {
  switch (aplicar) {
    case 'P': {
      const p = (this.productos || []).find((x: any) => Number(x.prod_Id) === Number(id));
      return p?.prod_DescripcionCorta || p?.prod_Descripcion || String(id);
    }
    case 'C': {
      const c = (this.categorias || []).find((x: any) => Number(x.cate_Id) === Number(id));
      return c?.cate_Descripcion || String(id);
    }
    case 'S': {
      const s = (this.subcategorias || []).find((x: any) => Number(x.subc_Id) === Number(id));
      return s?.subc_Descripcion || String(id);
    }
    case 'M': {
      const m = (this.marcas || []).find((x: any) => Number(x.marc_Id) === Number(id));
      return m?.marc_Descripcion || String(id);
    }
    default:
      return String(id);
  }
}

listarDescuentos(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Descuentos/Listar`, {
    headers: {
      'X-Api-Key': environment.apiKey
    }
  }).subscribe(res => {
    this.descuentosExistentes = res;
  });
    };

escalas: {
  deEs_InicioEscala: number;
  deEs_FinEscala: number;
  deEs_Valor: number;
}[] = [
  {
    deEs_InicioEscala: 0,
    deEs_FinEscala: 0,
    deEs_Valor: 0
  }
];

agregarEscala() {
  this.escalas.push({
    deEs_InicioEscala: 0,
    deEs_FinEscala: 0,
    deEs_Valor: 0
  });
}

eliminarEscala(index: number) {
  this.escalas.splice(index, 1);
}

getClientesFiltrados(grupo: any): any[] {
  if (!grupo.filtro) return grupo.clientes;
  return grupo.clientes.filter((c: any) => {
    const searchText = (
      c.clie_NombreNegocio || 
      c.clie_NombreComercial || 
      c.clie_NombreCompleto || 
      ''
    ).toLowerCase();
    return searchText.includes(grupo.filtro.toLowerCase());
  });
}

alternarCliente(clienteId: number, checked: boolean): void {
 if (checked) {
    const conflicto = this.hayConflicto(clienteId);
    
    if (conflicto) {
      this.mostrarPopup("El cliente ya tiene un descuento vigente en alguno de los ítems seleccionados.");
      // Para forzar refresco del checkbox, ejecuta fuera del flujo actual:
      setTimeout(() => {
        this.clientesSeleccionados = this.clientesSeleccionados.filter(id => id !== clienteId);
      }, 0);
      return;
    }

    this.clientesSeleccionados.push(clienteId);
  } else {
    this.clientesSeleccionados = this.clientesSeleccionados.filter(id => id !== clienteId);
  }
}

onClickCheckbox(event: MouseEvent, clienteId: number) {
  const input = event.target as HTMLInputElement;
  const isChecked = input.checked;

  if (isChecked) {
    const conflicto = this.hayConflicto(clienteId);

    if (conflicto) {
      this.mostrarPopup("El cliente ya tiene un descuento vigente en alguno de los ítems seleccionados.");

      // Aquí revertimos el cambio visual con setTimeout
      setTimeout(() => {
        input.checked = false;  // Desmarca el checkbox
      }, 0);

      // También no agregamos al array
      return;
    }

    this.clientesSeleccionados.push(clienteId);
  } else {
    // Si estaba desmarcando, solo actualizar modelo
    this.clientesSeleccionados = this.clientesSeleccionados.filter(id => id !== clienteId);
  }
}


hayConflicto(clienteId: number): boolean {
  const hoy = new Date();
   let referenciasSeleccionadas: number[] = [];

  // Asignamos según el tipo de descuento
   switch (this.descuento.desc_Aplicar) {
    case 'P': // Productos
    case 'C': // Categorías
    case 'M': // Marcas
    case 'S': // Subcategorías
      referenciasSeleccionadas = this.seleccionados;
      break;
    default:
      return false;
  }

  // Filtrar descuentos del mismo tipo (P, C, M o S) y excluir el descuento actual en modo edición
  const descuentosMismoTipo = this.descuentosExistentes.filter(
    d => d.desc_Aplicar === this.descuento.desc_Aplicar && d.desc_Id !== this.descuento.desc_Id
  );

  // Verificar conflicto
  return descuentosMismoTipo.some(descuento => {
    const clientes: { id: number }[] = JSON.parse(descuento.clientes || '[]');
    const referencias: { id: number }[] = JSON.parse(descuento.referencias || '[]');

    const clienteIncluido = clientes.some(c => c.id === clienteId);
    const fechaInicio = new Date(descuento.desc_FechaInicio);
    const fechaFin = new Date(descuento.desc_FechaFin);
    const descuentoVigente = hoy >= fechaInicio && hoy <= fechaFin;

    if (!clienteIncluido || !descuentoVigente) return false;

    // Verificar si hay alguna referencia en común
    return referencias.some(ref => referenciasSeleccionadas.includes(ref.id));
  });
}

mostrarPopup(mensaje: string): void {
  this.mostrarAlertaWarning = true;
          this.mensajeWarning = mensaje || 'cliente utilizado en otro descuento';
          
          setTimeout(() => {
            this.mostrarAlertaWarning = false;
            this.mensajeWarning = '';
          }, 5000);
}

// Verificar si todos los clientes de un canal están seleccionados
estanTodosSeleccionados(grupo: any): boolean {
  return grupo.clientes.every((c: { clie_Id: number; }) => this.clientesSeleccionados.includes(c.clie_Id));
}

// Seleccionar/deseleccionar todos los clientes de un canal
seleccionarTodosClientes(grupo: any, seleccionar: boolean): void {
  grupo.clientes.forEach((cliente: { clie_Id: number; }) => {
    this.alternarCliente(cliente.clie_Id, seleccionar);
  });
}

// Alternar el estado colapsado/expandido de un canal
toggleCanal(grupo: any): void {
  grupo.collapsed = !grupo.collapsed;
}

// Obtener el precio más bajo de todos los items seleccionados
getPrecioMinimoSeleccionados(): number {
  if (!this.descuento.desc_Tipo) { // Si es porcentaje, no hay límite de precio
    return Infinity;
  }

  // Validaciones defensivas
  if (!Array.isArray(this.productos)) {
    return Infinity;
  }
  let seleccionadosIds: number[] = (this.seleccionados || [])
    .map((id: any) => Number(id))
    .filter((n: number) => !isNaN(n));

  // Fallback: si aún no se han poblado 'seleccionados' pero existen referencias en el descuento, úsalas
  if ((!seleccionadosIds || seleccionadosIds.length === 0) && typeof this.descuento?.referencias === 'string') {
    try {
      const refs = JSON.parse(this.descuento.referencias || '[]');
      if (Array.isArray(refs)) {
        seleccionadosIds = refs
          .map((r: any) => Number(r?.id))
          .filter((n: number) => !isNaN(n));
      }
    } catch { /* noop */ }
  }

  let precios: number[] = [];

  // Determinar el tipo de aplicación efectivo: usar desc_Aplicar si existe, de lo contrario derivar de seccionVisible
  const aplicarEfectivo: 'P' | 'C' | 'S' | 'M' | '' = ((): any => {
    const a = (this.descuento?.desc_Aplicar || '').trim();
    if (a === 'P' || a === 'C' || a === 'S' || a === 'M') return a as any;
    const sv = (this.seccionVisible || '').toLowerCase();
    if (sv === 'productos') return 'P';
    if (sv === 'categorias') return 'C';
    if (sv === 'subcategorias') return 'S';
    if (sv === 'marcas') return 'M';
    return '';
  })();

  switch (aplicarEfectivo) {
    case 'P': // Productos
      precios = this.productos
        .filter(p => seleccionadosIds.includes(Number(p.prod_Id)))
        .map(p => Number(p.prod_PrecioUnitario) || 0)
        .filter(precio => precio > 0);
      break;

    case 'C': // Categorías
      const productosDeCategoriasSeleccionadas = this.productos
        .filter(p => seleccionadosIds.includes(Number(p.cate_Id)))
        .map(p => Number(p.prod_PrecioUnitario) || 0)
        .filter(precio => precio > 0);
      precios = productosDeCategoriasSeleccionadas;
      break;

    case 'S': // Subcategorías
      const productosDeSubcategoriasSeleccionadas = this.productos
        .filter(p => seleccionadosIds.includes(Number(p.subc_Id)))
        .map(p => Number(p.prod_PrecioUnitario) || 0)
        .filter(precio => precio > 0);
      precios = productosDeSubcategoriasSeleccionadas;
      break;

    case 'M': // Marcas
      const productosDeMarcasSeleccionadas = this.productos
        .filter(p => seleccionadosIds.includes(Number(p.marc_Id)))
        .map(p => Number(p.prod_PrecioUnitario) || 0)
        .filter(precio => precio > 0);
      precios = productosDeMarcasSeleccionadas;
      break;

    default:
      return Infinity;
  }

  if (precios.length === 0) {
    return Infinity; // No hay precios válidos
  }

  return Math.min(...precios);
}


get valorMaximoPermitido(): string {
  if (!this.descuento.desc_Tipo) {
    return '100%'; // Para porcentajes
  }
  // Si hay selecciones (en memoria o en JSON) pero aún no se han cargado productos, mostrar estado de carga
  let seleccionadosIds: number[] = (this.seleccionados || [])
    .map((id: any) => Number(id))
    .filter((n: number) => !isNaN(n));
  if ((!seleccionadosIds || seleccionadosIds.length === 0) && typeof this.descuento?.referencias === 'string') {
    try {
      const refs = JSON.parse(this.descuento.referencias || '[]');
      if (Array.isArray(refs)) {
        seleccionadosIds = refs
          .map((r: any) => Number(r?.id))
          .filter((n: number) => !isNaN(n));
      }
    } catch { /* noop */ }
  }
  if (seleccionadosIds.length > 0 && (!Array.isArray(this.productos) || this.productos.length === 0)) {
    return 'Calculando precios...';
  }

  const precioMinimo = this.getPrecioMinimoSeleccionados();
  if (precioMinimo === Infinity) {
    return 'Sin límite (seleccione items primero)';
  }
  
  return `L. ${precioMinimo.toFixed(2)}`;
}

// Obtener el valor máximo permitido como número para comparaciones
get valorMaximoNumerico(): number {
  if (!this.descuento.desc_Tipo) {
    return 100; // Para porcentajes
  }
  
  return this.getPrecioMinimoSeleccionados();
}

// Normaliza escalas a números y elimina propiedades extra para comparaciones/validaciones
private normalizarEscalas(escalas: any[]): { deEs_InicioEscala: number; deEs_FinEscala: number; deEs_Valor: number }[] {
  if (!Array.isArray(escalas)) return [];
  return escalas.map((e: any) => ({
    deEs_InicioEscala: Number(e?.deEs_InicioEscala) || 0,
    deEs_FinEscala: Number(e?.deEs_FinEscala) || 0,
    deEs_Valor: Number(e?.deEs_Valor) || 0,
  }));
}

// Reajusta valores de escalas según el máximo actual (porcentaje 100 o precio mínimo)
private reclampEscalasSegunMax(): void {
  const max = this.valorMaximoNumerico;
  if (!Array.isArray(this.escalas)) return;
  this.escalas = this.escalas.map(e => {
    const copia = { ...e };
    copia.deEs_InicioEscala = Number(copia.deEs_InicioEscala) || 0;
    copia.deEs_FinEscala = Number(copia.deEs_FinEscala) || 0;
    copia.deEs_Valor = Number(copia.deEs_Valor) || 0;
    if (isFinite(max) && copia.deEs_Valor > max) {
      copia.deEs_Valor = max;
    }
    return copia;
  });
}

get fechaInicioFormato(): string {
  return new Date(this.descuento.desc_FechaInicio).toISOString().split('T')[0];
}

set fechaInicioFormato(value: string) {
  this.descuento.desc_FechaInicio = new Date(value);
}

get fechaFinFormato(): string {
  return new Date(this.descuento.desc_FechaFin).toISOString().split('T')[0];
}

set fechaFinFormato(value: string) {
  this.descuento.desc_FechaFin = new Date(value);
}

 seleccionContado: boolean = false;
seleccionCredito: boolean = false;
formaPago: string = ''; // Aquí se guardará "CO", "CR" o "AM"

actualizarFormaPago(): void {
  if (this.seleccionContado && this.seleccionCredito) {
    this.formaPago = 'AM'; // Ambos
  } else if (this.seleccionContado) {
    this.formaPago = 'CO'; // Solo contado
  } else if (this.seleccionCredito) {
    this.formaPago = 'CR'; // Solo crédito
  } else {
    this.formaPago = ''; // Ninguno seleccionado
  }


}


tieneAyudante: boolean = false;
  


  descuentoOriginal = '';
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

// Snapshot para detectar diferencias del descuento
private originalDescuentoSnapshot: {
  desc_Descripcion: string;
  desc_Tipo: boolean;
  desc_Aplicar: string;
  desc_FechaInicio: string; // ISO solo fecha
  desc_FechaFin: string; // ISO solo fecha
  desc_Observaciones: string;
  desc_TipoFactura: string;
  clientesIds: number[];
  referenciasIds: number[];
  escalas: { deEs_InicioEscala: number; deEs_FinEscala: number; deEs_Valor: number }[];
} | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['descuentoData'] && changes['descuentoData'].currentValue) {
      this.descuento = { ...changes['descuentoData'].currentValue };
      // Normalizar campos que pueden venir como string desde la API
      // Asegura que desc_Tipo sea booleano: true = monto fijo, false = porcentaje
      (this.descuento as any).desc_Tipo = String((this.descuento as any).desc_Tipo) === 'true';
      const clientesLista = JSON.parse(this.descuento.clientes ?? '[]');
      const referenciasLista = JSON.parse(this.descuento.referencias ?? '[]');
      const escalasLista = JSON.parse(this.descuento.escalas ?? '[]');

      // Si solo necesitas los IDs
      const clientesIds = clientesLista.map((c: any) => c.id);
      const referenciasIds = referenciasLista.map((r: any) => r.id);
      this.escalas = this.normalizarEscalas(escalasLista);
      this.clientesSeleccionados = clientesIds;
      this.seleccionados = referenciasIds;
      this.formaPago = this.descuento.desc_TipoFactura

      switch (this.formaPago) {
        case 'CO':
          this.seleccionContado = true;
          break;
        case 'CR':
          this.seleccionCredito = true;
          break;
        case 'AM':
          this.seleccionCredito = true;
          this.seleccionContado = true;
          break;
        default:
          this.seleccionCredito = false;
          this.seleccionContado = false;
          break;
      }

      switch (this.descuento.desc_Aplicar) {
        case 'P':
          this.seccionVisible = 'productos';
          this.tabActiva = 'productos';
          break;
        case 'C':
          this.seccionVisible = 'categorias';
          this.tabActiva = 'categorias';

          break;
        case 'S':
          this.seccionVisible = 'subcategorias';
          this.tabActiva = 'subcategorias';

          break;
        case 'M':
          this.seccionVisible = 'marcas';
          this.tabActiva = 'marcas';

          break;
      }
      this.descuento.desc_FechaInicio = new Date(this.descuento.desc_FechaInicio);
      this.descuento.desc_FechaFin = new Date(this.descuento.desc_FechaFin);
      this.descuentoOriginal = this.descuento.desc_Descripcion || '';
      this.mostrarErrores = false;
      this.cerrarAlerta();

      // Asegurar que datos necesarios estén cargados para calcular precios mínimos
      if (!Array.isArray(this.productos) || this.productos.length === 0) {
        this.listarPorductos();
      }
      // Guardar snapshot original del descuento para comparación
      this.originalDescuentoSnapshot = {
        desc_Descripcion: (this.descuento.desc_Descripcion || '').trim(),
        desc_Tipo: !!this.descuento.desc_Tipo,
        desc_Aplicar: (this.descuento.desc_Aplicar || '').trim(),
        desc_FechaInicio: new Date(this.descuento.desc_FechaInicio).toISOString().split('T')[0],
        desc_FechaFin: new Date(this.descuento.desc_FechaFin).toISOString().split('T')[0],
        desc_Observaciones: (this.descuento.desc_Observaciones || '').trim(),
        desc_TipoFactura: (this.descuento.desc_TipoFactura || '').trim(),
        clientesIds: [...clientesIds].sort((a,b)=>a-b),
        referenciasIds: [...referenciasIds].sort((a,b)=>a-b),
        escalas: this.normalizarEscalas(this.escalas),
      };
      // Ajustar escalas según el máximo vigente (en caso de que el JSON traiga valores fuera de rango)
      this.reclampEscalasSegunMax();

    }
  }



  // Compara el estado actual del descuento contra el snapshot original
  private hayDiferenciasDescuento(): boolean {
    if (!this.originalDescuentoSnapshot) return true;
    const snap = this.originalDescuentoSnapshot;

    const iso = (d: Date | string) => new Date(d).toISOString().split('T')[0];
    const arrEq = (a: number[], b: number[]) => {
      const aa = [...(a || [])].map(Number).filter(n => !isNaN(n)).sort((x,y)=>x-y);
      const bb = [...(b || [])].map(Number).filter(n => !isNaN(n)).sort((x,y)=>x-y);
      return JSON.stringify(aa) === JSON.stringify(bb);
    };
    const escEq = (
      a: { deEs_InicioEscala: number; deEs_FinEscala: number; deEs_Valor: number }[],
      b: { deEs_InicioEscala: number; deEs_FinEscala: number; deEs_Valor: number }[],
    ) => JSON.stringify(this.normalizarEscalas(a)) === JSON.stringify(this.normalizarEscalas(b));

    const actual = {
      desc_Descripcion: (this.descuento.desc_Descripcion || '').trim(),
      desc_Tipo: !!this.descuento.desc_Tipo,
      desc_Aplicar: (this.descuento.desc_Aplicar || '').trim(),
      desc_FechaInicio: iso(this.descuento.desc_FechaInicio),
      desc_FechaFin: iso(this.descuento.desc_FechaFin),
      desc_Observaciones: (this.descuento.desc_Observaciones || '').trim(),
      desc_TipoFactura: (this.formaPago || this.descuento.desc_TipoFactura || '').trim(),
      clientesIds: this.clientesSeleccionados,
      referenciasIds: this.seleccionados,
      escalas: this.escalas,
    };

    if (actual.desc_Descripcion !== snap.desc_Descripcion) return true;
    if (actual.desc_Tipo !== snap.desc_Tipo) return true;
    if (actual.desc_Aplicar !== snap.desc_Aplicar) return true;
    if (actual.desc_FechaInicio !== snap.desc_FechaInicio) return true;
    if (actual.desc_FechaFin !== snap.desc_FechaFin) return true;
    if (actual.desc_Observaciones !== snap.desc_Observaciones) return true;
    if ((actual.desc_TipoFactura || '') !== (snap.desc_TipoFactura || '')) return true;
    if (!arrEq(actual.clientesIds as any, snap.clientesIds as any)) return true;
    if (!arrEq(actual.referenciasIds as any, snap.referenciasIds as any)) return true;
    if (!escEq(actual.escalas as any, snap.escalas as any)) return true;

    return false;
  }

  cancelar(): void {
    this.cerrarAlerta();
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.descuento = {
       desc_Id:  0,
  desc_Descripcion:  '',
  desc_Tipo: false, 
  desc_Aplicar:  '',
  desc_FechaInicio:  new Date(),
  desc_FechaFin: new Date(),
  desc_Observaciones:  '',
  usua_Creacion:  0,
  desc_FechaCreacion:  new Date(),
  usua_Modificacion: 0,
  desc_FechaModificacion: new Date(),
  desc_Estado: false,
  usuarioCreacion:  '',
  usuarioModificacion: '',
  code_Status:  0,
  message_Status:'',
  desc_TipoFactura:'',

    };
    this.activeTab = 1;
    this.seleccionados = [];
    this.clientesSeleccionados = [];
    this.escalas = [];
    this.onCancel.emit();
  }

  // Disparado al cambiar el tipo (porcentaje/monto fijo) en el DDL
  onTipoCambio(valor: any): void {
    // Normalizar a booleano
    const nuevoTipo = String(valor) === 'true';
    this.descuento.desc_Tipo = nuevoTipo;

    // Si es monto fijo y aún no hay productos cargados, cargarlos para calcular el máximo
    if (this.descuento.desc_Tipo === true) {
      if (!Array.isArray(this.productos) || this.productos.length === 0) {
        this.listarPorductos();
      }
    }

    // Recalcular/clamp de escalas según el tipo actual
    const max = this.valorMaximoNumerico; // 100 para porcentaje, precio mínimo para monto fijo (o Infinity)
    this.escalas = (this.escalas || []).map(e => {
      const copia = { ...e };
      if (copia.deEs_Valor == null || isNaN(copia.deEs_Valor as any)) return copia;
      if (isFinite(max) && copia.deEs_Valor > max) {
        copia.deEs_Valor = max;
      }
      return copia;
    });

    // Forzar refresco de mensajes/UI
    this.validado = true;
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
    !this.descuento.desc_Descripcion.trim() ||
    !this.descuento.desc_Aplicar.trim() ||
    !this.descuento.desc_FechaInicio ||
    !this.descuento.desc_FechaFin ||
    !this.puedeAgregarNuevaEscala()

  ) {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
    setTimeout(() => this.cerrarAlerta(), 4000);
    return;
  }
  // Detectar cambios considerando todos los campos relevantes, clientes, referencias y escalas
  if (this.hayDiferenciasDescuento()) {
    this.mostrarConfirmacionEditar = true;
  } else {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'No se han detectado cambios.';
    setTimeout(() => this.cerrarAlerta(), 4000);
  }
  }

  // Genera una lista de cambios legible para la UI de confirmación (similar a promociones)
  obtenerListaCambios(): { label: string; anterior: string; nuevo: string }[] {
    if (!this.originalDescuentoSnapshot) return [];

    const cambios: { label: string; anterior: string; nuevo: string }[] = [];
    const snap = this.originalDescuentoSnapshot;

    const iso = (d: Date | string) => new Date(d).toISOString().split('T')[0];
    const join = (arr: any[]) => (arr || []).join(', ');
    const normIds = (arr: number[]) => [...(arr || [])].map(Number).filter(n => !isNaN(n)).sort((a,b)=>a-b);
    const equalArr = (a: number[], b: number[]) => JSON.stringify(normIds(a)) === JSON.stringify(normIds(b));
    const escToStr = (es: any[]) => {
      const esNorm = this.normalizarEscalas(es || []);
      const unidad = this.descuento.desc_Tipo ? '' : '%'; // true: monto fijo (sin símbolo), false: porcentaje
      return esNorm
        .map(e => {
          const v = Number(e.deEs_Valor) || 0;
          const valorStr = this.descuento.desc_Tipo ? v.toFixed(2) : v.toFixed(2) + unidad;
          return `Desde ${e.deEs_InicioEscala} hasta ${e.deEs_FinEscala}: ${valorStr}`;
        })
        .join(' | ');
    };

    const actual = {
      desc_Descripcion: (this.descuento.desc_Descripcion || '').trim(),
      desc_Tipo: !!this.descuento.desc_Tipo,
      desc_Aplicar: (this.descuento.desc_Aplicar || '').trim(),
      desc_FechaInicio: iso(this.descuento.desc_FechaInicio),
      desc_FechaFin: iso(this.descuento.desc_FechaFin),
      desc_Observaciones: (this.descuento.desc_Observaciones || '').trim(),
      desc_TipoFactura: (this.formaPago || this.descuento.desc_TipoFactura || '').trim(),
      clientesIds: this.clientesSeleccionados,
      referenciasIds: this.seleccionados,
      escalas: this.escalas,
    };

    if (actual.desc_Descripcion !== snap.desc_Descripcion) {
      cambios.push({ label: 'Descripción', anterior: snap.desc_Descripcion || '—', nuevo: actual.desc_Descripcion || '—' });
    }
    if (actual.desc_Tipo !== snap.desc_Tipo) {
      cambios.push({ label: 'Tipo de descuento', anterior: snap.desc_Tipo ? 'Monto fijo' : 'Porcentaje', nuevo: actual.desc_Tipo ? 'Monto fijo' : 'Porcentaje' });
    }
    if (actual.desc_Aplicar !== snap.desc_Aplicar) {
      const mapA = (v: string) => ({ P:'Productos', C:'Categorias', S:'Subcategorias', M:'Marcas' } as any)[v] || v || '—';
      cambios.push({ label: 'Aplicar a', anterior: mapA(snap.desc_Aplicar), nuevo: mapA(actual.desc_Aplicar) });
    }
    if (actual.desc_FechaInicio !== snap.desc_FechaInicio) {
      cambios.push({ label: 'Fecha inicio', anterior: snap.desc_FechaInicio || '—', nuevo: actual.desc_FechaInicio || '—' });
    }
    if (actual.desc_FechaFin !== snap.desc_FechaFin) {
      cambios.push({ label: 'Fecha fin', anterior: snap.desc_FechaFin || '—', nuevo: actual.desc_FechaFin || '—' });
    }
    if (actual.desc_Observaciones !== snap.desc_Observaciones) {
      cambios.push({ label: 'Observaciones', anterior: snap.desc_Observaciones || '—', nuevo: actual.desc_Observaciones || '—' });
    }
    if ((actual.desc_TipoFactura || '') !== (snap.desc_TipoFactura || '')) {
      const mapTP = (v: string) => ({ CO: 'Contado', CR: 'Crédito', AM: 'Ambos' } as any)[v] || '—';
      cambios.push({ label: 'Tipo de factura', anterior: mapTP(snap.desc_TipoFactura), nuevo: mapTP(actual.desc_TipoFactura) });
    }
    if (!equalArr(actual.clientesIds as any, snap.clientesIds as any)) {
      const anterior = normIds(snap.clientesIds).map(id => this.getNombreClientePorId(id)).join(', ') || 'Sin clientes';
      const nuevo = normIds(actual.clientesIds as any).map((id: number) => this.getNombreClientePorId(id)).join(', ') || 'Sin clientes';
      cambios.push({ label: 'Clientes', anterior, nuevo });
    }
    if (!equalArr(actual.referenciasIds as any, snap.referenciasIds as any)) {
      const aplicar = actual.desc_Aplicar;
      const anterior = normIds(snap.referenciasIds).map(id => this.getNombreReferenciaPorId(id, aplicar)).join(', ') || 'Sin referencias';
      const nuevo = normIds(actual.referenciasIds as any).map((id: number) => this.getNombreReferenciaPorId(id, aplicar)).join(', ') || 'Sin referencias';
      // Etiqueta dinámica según el tipo de aplicación
      const etiqueta = ({ P: 'Productos', C: 'Categorías', S: 'Subcategorías', M: 'Marcas' } as any)[aplicar] || 'Referencias';
      cambios.push({ label: etiqueta, anterior, nuevo });
    }
    if (escToStr(actual.escalas as any) !== escToStr(snap.escalas as any)) {
      cambios.push({ label: 'Escalas', anterior: escToStr(snap.escalas), nuevo: escToStr(actual.escalas as any) });
    }

    return cambios;
  }

  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }
  mostrarOverlayCarga = false;


  async confirmarEdicion(): Promise<void> {
  try {
    // 1. Activar overlay
    this.mostrarOverlayCarga = true;
    this.cdr.detectChanges();

    // 2. Esperar a que se pinte el overlay
    await new Promise(resolve => setTimeout(resolve, 0));

    // 3. Cerrar modal
    this.mostrarConfirmacionEditar = false;
    this.cdr.detectChanges();

    // 4. Esperar otro tick para asegurar que el DOM se actualice
    await new Promise(resolve => setTimeout(resolve, 0));

    // 5. Ejecutar el guardado
    await this.guardar();
  } catch (error) {
    console.error('Error en edición:', error);
    this.mostrarOverlayCarga = false;
    this.cdr.detectChanges();
  }
}
  public guardar(): Promise<void> {
    return new Promise((resolve, reject) => {
    this.mostrarErrores = true;

   if (this.descuento.desc_Aplicar.trim()) {
    
  const descuentoActualizar: any = {
    desc_Id: this.descuento.desc_Id,
    desc_Descripcion: this.descuento.desc_Descripcion.trim(),
    desc_Tipo: String(this.descuento.desc_Tipo) === 'true',
    desc_Aplicar: this.descuento.desc_Aplicar,
    desc_FechaInicio: new Date(this.descuento.desc_FechaInicio),
    desc_FechaFin: new Date(this.descuento.desc_FechaFin),
    desc_Observaciones: 'N/A',
    usua_Creacion: this.descuento.usua_Creacion,
    desc_FechaCreacion: new Date(this.descuento.desc_FechaCreacion),
    usua_Modificacion: getUserId(),
    desc_FechaModificacion: new Date(),
    desc_Estado: false,
    idClientes: this.clientesSeleccionados,
    idReferencias: this.seleccionados,
    escalas: '',
    clientes: '',
    referencias: '',
    escalas_Json: this.escalas,
    desc_TipoFactura: this.formaPago
    

  };
  
  if (this.descuento.desc_Observaciones) {
      descuentoActualizar.desc_Observaciones = this.descuento.desc_Observaciones;
    }




      this.http.put<any>(`${environment.apiBaseUrl}/Descuentos/Actualizar`, descuentoActualizar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
     
          this.mostrarErrores = false;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.descuento);
             this.mostrarOverlayCarga = false;
            this.cdr.detectChanges();
            resolve();
            this.cancelar();
          }, 3000);
        },
        error: (error) => {
          this.mostrarOverlayCarga = false;
          this.cdr.detectChanges();
          reject(error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al actualizar la Descuento. Por favor, intente nuevamente.';
          setTimeout(() => this.cerrarAlerta(), 5000);
        }
      });
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
    });
  }

  validarPasoActual(): boolean {
  switch (this.activeTab) {
    case 1: // Información general
      return this.validarPasoInformacionGeneral();
    case 2: // Aplica para
      return this.seleccionados.length > 0;
    case 3: // Clientes
      return this.clientesSeleccionados.length > 0;
    case 4: // Escalas
      return this.validarEscalas();
    default:
      return false;
  }
  
}

validarPasoInformacionGeneral(): boolean {
  const d = this.descuento;

  return !!d.desc_Descripcion && d.desc_Descripcion.trim() !== '' &&
         d.desc_Tipo !== null &&
         !!d.desc_FechaInicio &&
         !!d.desc_FechaFin;
}

validarEscalas(): boolean {
  return this.escalas.every(e =>
    e.deEs_InicioEscala != null &&
    e.deEs_FinEscala != null &&
    e.deEs_Valor != null
  );
}

irAlSiguientePaso() {
  this.mostrarErrores = true;

  if (this.validarPasoActual()) {
    this.mostrarErrores = false;
    this.activeTab ++;
    
    // Si acabamos de navegar al tab de clientes (activeTab === 3), validar clientes seleccionados
    if (this.activeTab === 3) {
      this.validarClientesSeleccionadosAlLlegarATab();
    }
  } else {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning= 'Debe Completar todos los campos'

    setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 2000);
    // Podrías mostrar una alerta o dejar que los mensajes de error visibles lo indiquen
  }
}

validado = true;

limitarValor(valor: number, escala: any): void {
  // Si es porcentaje (desc_Tipo === false), 0-100
  if (this.descuento.desc_Tipo === false) {
    if (valor == null || isNaN(valor as any)) {
      this.validado = false;
      return;
    }
    if (valor > 100) {
      this.validado = false;
      return;
    }
    escala.deEs_Valor = valor;
    this.validado = true;
    return;
  }

  // Si es monto fijo (desc_Tipo === true), validar contra el precio mínimo dinámico
  const max = this.valorMaximoNumerico; // puede ser Infinity si no hay selección
  if (valor == null || isNaN(valor as any)) {
    this.validado = false;
    return;
  }
  if (isFinite(max) && valor > max) {
    // Excede el máximo permitido por el precio mínimo del ítem más barato
    this.validado = false;
    return;
  }
  escala.deEs_Valor = valor;
  this.validado = true;
}

puedeAgregarNuevaEscala(): boolean {
  if (!this.escalas || this.escalas.length === 0) return true;

  for (let i = 0; i < this.escalas.length; i++) {
    const escala = this.escalas[i];
    if (
      escala.deEs_InicioEscala == null ||
      escala.deEs_FinEscala == null ||
      escala.deEs_Valor == null ||
      escala.deEs_FinEscala <= escala.deEs_InicioEscala ||
        escala.deEs_Valor == 0 ||
        escala.deEs_Valor >= this.valorMaximoNumerico

    ) {
      return false;
    }

    if (i > 0) {
      const anterior = this.escalas[i - 1];
      if (
        escala.deEs_InicioEscala <= anterior.deEs_FinEscala ||
        escala.deEs_Valor <= anterior.deEs_Valor ||
        escala.deEs_Valor == 0 ||
        escala.deEs_Valor >= this.valorMaximoNumerico
      ) {
        return false;
      }
    }
  }

  return true;
}

// Validar clientes seleccionados cuando se navega al tab de clientes
validarClientesSeleccionadosAlLlegarATab(): void {
  if (this.clientesSeleccionados.length === 0) {
    return; // No hay clientes seleccionados, no hay nada que validar
  }

  const clientesConConflicto: number[] = [];
  let mensajeConflictos = '';

  // Revisar cada cliente seleccionado para ver si tiene conflictos
  for (const clienteId of this.clientesSeleccionados) {
    if (this.hayConflicto(clienteId)) {
      clientesConConflicto.push(clienteId);
    }
  }

  // Si hay clientes con conflictos, deseleccionarlos y mostrar mensaje
  if (clientesConConflicto.length > 0) {
    // Deseleccionar clientes con conflicto
    this.clientesSeleccionados = this.clientesSeleccionados.filter(
      id => !clientesConConflicto.includes(id)
    );

    // Preparar mensaje informativo
    if (clientesConConflicto.length === 1) {
      mensajeConflictos = 'Se ha deseleccionado 1 cliente que tenía conflicto con los ítems seleccionados.';
    } else {
      mensajeConflictos = `Se han deseleccionado ${clientesConConflicto.length} clientes que tenían conflictos con los ítems seleccionados.`;
    }

    // Mostrar mensaje de advertencia
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = mensajeConflictos;
    
    setTimeout(() => {
      this.mostrarAlertaWarning = false;
      this.mensajeWarning = '';
    }, 5000);
  }
}

navegar(tabDestino: number) {
  // Si intenta ir hacia atrás, permitir siempre
  if (tabDestino < this.activeTab) {
    this.activeTab = tabDestino;
    this.mostrarErrores = false;
    return;
  }
  
  // Si intenta ir hacia adelante, validar todos los pasos intermedios
  if (tabDestino > this.activeTab) {
    // Validar todos los pasos desde el actual hasta el destino
    for (let paso = this.activeTab; paso < tabDestino; paso++) {
      if (!this.validarPaso(paso)) {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = `Debe completar todos los campos del paso ${this.getNombrePaso(paso)} antes de continuar.`;
        
        setTimeout(() => {
          this.mostrarAlertaWarning = false;
          this.mensajeWarning = '';
        }, 3000);
        return;
      }
    }
    
    // Si todos los pasos intermedios están válidos, navegar
    this.activeTab = tabDestino;
    this.mostrarErrores = false;
    return;
  }
  
  // Si es el mismo tab, no hacer nada
  if (tabDestino === this.activeTab) {
    return;
  }
}

validarPaso(paso: number): boolean {
  switch (paso) {
    case 1: // Información general
      return this.validarPasoInformacionGeneral();
    case 2: // Aplica para
      return this.seleccionados.length > 0;
    case 3: // Clientes
      return this.clientesSeleccionados.length > 0;
    case 4: // Escalas
      return this.validarEscalas();
    default:
      return false;
  }
}

getNombrePaso(paso: number): string {
  switch (paso) {
    case 1: return 'Información General';
    case 2: return 'Aplicar para';
    case 3: return 'Clientes';
    case 4: return 'Escalas';
    default: return 'Paso ' + paso;
  }
}

  // (Eliminados métodos de comparación de productos no utilizados en este componente)

}
