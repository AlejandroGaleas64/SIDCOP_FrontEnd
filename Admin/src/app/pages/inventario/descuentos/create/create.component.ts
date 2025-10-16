import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Descuento } from 'src/app/Modelos/inventario/DescuentoModel';
import { DescuentoDetalle } from 'src/app/Modelos/inventario/DescuentoDetalleModel';
import { DescuentoPorCliente } from 'src/app/Modelos/inventario/DescuentoPorClienteModel';
import { DescuentoPorEscala } from 'src/app/Modelos/inventario/DescuentoPorEscalaModel';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { NgSelectModule } from '@ng-select/ng-select';
import { CdkStepperModule } from '@angular/cdk/stepper';
import { NgStepperModule } from 'angular-ng-stepper';
import { ViewChild } from '@angular/core';
import { CdkStepper } from '@angular/cdk/stepper';
import { CurrencyMaskModule } from "ng2-currency-mask";



@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule,  NgxMaskDirective, NgSelectModule,CdkStepperModule,  NgStepperModule,CurrencyMaskModule],
   providers: [provideNgxMask()],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent   {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Descuento>();
    @ViewChild('cdkStepper') cdkStepper!: CdkStepper;

    tabActiva: string = 'productos';


  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  seccionVisible: string | null = null;
  filtro: string = '';
  seleccionados: number[] = [];
  clientesAgrupados: { canal: string, clientes: any[], filtro: string, collapsed: boolean }[] = [];
clientesSeleccionados: number[] = [];
descuentosExistentes: any[] = [];
activeTab: number = 1;
change(event: any) {
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
}

hoy: string;



  constructor(private http: HttpClient) {
    this.listarcategorias();
    this.listarmarcass();
    this.listarPorductos();
    this.listarSubcategorias();
    this.listarClientes();
    this.listarDescuentos();
     const today = new Date();
    this.hoy = today.toISOString().split('T')[0]; // "YYYY-MM-DD"
    this.mostrarSeccion('productos');
    
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

  listarDescuentos(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Descuentos/Listar`, {
    headers: {
      'X-Api-Key': environment.apiKey
    }
  }).subscribe(res => {
    this.descuentosExistentes = res;
  });
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

  // Filtrar descuentos del mismo tipo (P, C, M o S)
  const descuentosMismoTipo = this.descuentosExistentes.filter(
    d => d.desc_Aplicar === this.descuento.desc_Aplicar
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

  let precios: number[] = [];

  switch (this.descuento.desc_Aplicar) {
    case 'P': // Productos
      precios = this.productos
        .filter(p => this.seleccionados.includes(p.prod_Id))
        .map(p => p.prod_PrecioUnitario || 0)
        .filter(precio => precio > 0);
      break;

    case 'C': // Categorías
      const productosDeCategoriasSeleccionadas = this.productos
        .filter(p => this.seleccionados.includes(p.cate_Id))
        .map(p => p.prod_PrecioUnitario || 0)
        .filter(precio => precio > 0);
      precios = productosDeCategoriasSeleccionadas;
      break;

    case 'S': // Subcategorías
      const productosDeSubcategoriasSeleccionadas = this.productos
        .filter(p => this.seleccionados.includes(p.subc_Id))
        .map(p => p.prod_PrecioUnitario || 0)
        .filter(precio => precio > 0);
      precios = productosDeSubcategoriasSeleccionadas;
      break;

    case 'M': // Marcas
      const productosDeMarcasSeleccionadas = this.productos
        .filter(p => this.seleccionados.includes(p.marc_Id))
        .map(p => p.prod_PrecioUnitario || 0)
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

// Obtener el valor máximo permitido para mostrar en la UI
get valorMaximoPermitido(): string {
  if (!this.descuento.desc_Tipo) {
    return '100%'; // Para porcentajes
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

// Maneja el cambio de tipo de descuento desde el select (Porcentaje vs Monto Fijo)
onTipoCambio(valor: any): void {
  // Normalizar a boolean: true = Monto Fijo, false = Porcentaje
  const nuevoTipo = String(valor) === 'true';
  this.descuento.desc_Tipo = nuevoTipo;

  // Si es monto fijo y no hay productos cargados aún, cargarlos para poder calcular precios mínimos
  if (nuevoTipo && (!Array.isArray(this.productos) || this.productos.length === 0)) {
    this.listarPorductos();
  }

  // Recalcular y ajustar (clamp) los valores de escalas al nuevo máximo permitido
  const max = nuevoTipo ? this.valorMaximoNumerico : 100; // porcentaje máx 100
  this.escalas = this.escalas.map(e => {
    const actual = Number(e.deEs_Valor);
    if (!isFinite(actual)) return { ...e, deEs_Valor: 0 };
    if (!isFinite(max)) return { ...e, deEs_Valor: actual }; // si no hay límite aún (sin selección), dejar igual
    return { ...e, deEs_Valor: Math.min(actual, max) };
  });
}

tieneAyudante: boolean = false;
  

  cancelar(): void {
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
  desc_TipoFactura:''

    };
    this.activeTab = 1;
    this.seleccionados = [];
    this.clientesSeleccionados = [];
    this.escalas = [];
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

  mostrarOverlayCarga = false;

  guardar(): void {
  this.mostrarErrores = true;

  if (
    this.descuento.desc_Descripcion.trim() &&
     this.descuento.desc_Aplicar.trim() &&
    this.descuento.desc_FechaInicio && this.descuento.desc_FechaFin 
  ) {
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;

    this.mostrarOverlayCarga = true;
  

    // Construir el objeto para guardar
    const DescuentoGuardar: any = {
      desc_Id:  0,
      desc_Descripcion:  this.descuento.desc_Descripcion,
      desc_Tipo: String(this.descuento.desc_Tipo) === 'true', 
      desc_Aplicar: this.descuento.desc_Aplicar,
      desc_FechaInicio:  new Date(this.descuento.desc_FechaInicio) ,
      desc_FechaFin: new Date(this.descuento.desc_FechaFin),
      desc_Observaciones:  'N/A',
      usua_Creacion:  getUserId(),
      desc_FechaCreacion:  new Date(),
      usua_Modificacion: 0,
      desc_FechaModificacion: new Date(),
      desc_Estado: false,
      usuarioCreacion:  '',
      usuarioModificacion: '',
      idClientes: this.clientesSeleccionados,
      idReferencias: this.seleccionados,
      escalas: '',
      clientes: '',
      referencias: '',
      escalas_Json: this.escalas,
      desc_TipoFactura: this.formaPago

    };

    // Solo agregar vend_Ayudante si tieneAyudante es true
    if (this.descuento.desc_Observaciones) {
      DescuentoGuardar.desc_Observaciones = this.descuento.desc_Observaciones;
    }



    this.http.post<any>(`${environment.apiBaseUrl}/Descuentos/Insertar`, DescuentoGuardar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (response) => {
        
        if(response?.data?.code_Status <= 0)
        {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el Descuento. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          this.mostrarOverlayCarga = false;
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
          return; 
          
        }

          
   
          this.mostrarErrores = false;
                    
                    // Ocultar la alerta después de 3 segundos
          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.onSave.emit(this.descuento);
            this.clientesSeleccionados = [];
            this.seleccionados = [];
            this.escalas = [];
            this.activeTab = 1;
            this.mostrarOverlayCarga = false;
            this.cancelar();
          }, 3000);

                  


      } ,     
      error: (error) => {
        this.mostrarOverlayCarga = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al guardar el Descuento. Por favor, intente nuevamente.';
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

  return !!d.desc_Descripcion?.trim() &&
         d.desc_Tipo !== null &&
         !!d.desc_FechaInicio &&
         !!d.desc_FechaFin && !!this.formaPago?.trim();
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

// Nueva función para navegación inteligente de tabs
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

// Función auxiliar para validar un paso específico
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

// Función auxiliar para obtener el nombre del paso
getNombrePaso(paso: number): string {
  switch (paso) {
    case 1: return 'Información General';
    case 2: return 'Aplicar para';
    case 3: return 'Clientes';
    case 4: return 'Escalas';
    default: return 'Paso ' + paso;
  }
}

validado = true;

limitarValor(valor: number, escala: any): void {
  if (this.descuento.desc_Tipo === false && valor > 100) {
    // Porcentaje no puede ser mayor a 100%
    this.validado = false;
  } else if (this.descuento.desc_Tipo === true) {
    // Monto fijo: validar contra el precio más bajo
    const precioMinimo = this.getPrecioMinimoSeleccionados();
    if (precioMinimo !== Infinity && valor > precioMinimo) {
      this.validado = false;
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = `El valor no puede ser mayor al precio más bajo de los items seleccionados (L. ${precioMinimo.toFixed(2)})`;
      
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    } else {
      escala.deEs_Valor = valor;
      this.validado = true;
    }
  } else {
    escala.deEs_Valor = valor;
    this.validado = true;
  }
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




}