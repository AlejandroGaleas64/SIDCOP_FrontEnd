import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { ReactiveFormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { CollapseModule } from 'ngx-bootstrap/collapse';
import { AccordionModule } from 'ngx-bootstrap/accordion';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Subcategoria } from 'src/app/Modelos/inventario/SubcategoriaModel';
import { TreeKeyManager } from '@angular/cdk/a11y';
import { NgxMaskService } from 'ngx-mask';
import { CurrencyMaskModule } from "ng2-currency-mask";


@Component({
  selector: 'app-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BreadcrumbsComponent,
    TableModule,
    PaginationModule,
    ReactiveFormsModule,
    NgSelectModule,
    CollapseModule,
    AccordionModule,
    CurrencyMaskModule
    
  ],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent {

  Math: any = Math;

  productosLista: any[] = [];
  clientesLista: any[] = [];
  clientesListaCrear: any[] = [];
  canalesLista: any[] = [];
  listasAgrupadas: any[] = [];
  nocreando : boolean = true;

  listaClientesConflicto: any[] = [];

  productoSeleccionado: any;
  breadCrumbItems!: Array<{}>;

  isCreatingNewLista = false;
  newLista = {
    precioContado: 0,
    precioCredito: 0,
    inicioEscala: 0,
    finEscala: 0,
    canalesOpen: {} as { [key: number]: boolean },
    clientesChecked: [] as number[],
    canalFilters: {} as { [key: number]: string }
  };

  createError = '';
  inputErrors = {
    precioContado: '',
    precioCredito: '',
    inicioEscala: '',
    finEscala: '',
    clientesChecked: ''
  };

  noListasMsg = '';

  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  mostrarConfirmacionGuardar = false;
listaAGuardar: any = null;

// Propiedades para confirmación de eliminación
  mostrarConfirmacionEliminar = false;

  mostrarClientesConflicto = false;

  listaAEliminar = {
    listaId: 0,
    prod_Id: 0,
  };

  /**
   * Abre el modal de confirmación para guardar cambios de una lista específica.
   * @param lista Lista seleccionada cuyos cambios se desean guardar.
   */
abrirModalGuardarCambios(lista: any) {
  this.listaAGuardar = lista;
  this.mostrarConfirmacionGuardar = true;
}

  /**
   * Cierra el modal de confirmación de guardado sin aplicar cambios.
   */
cancelarGuardarCambios() {
  this.mostrarConfirmacionGuardar = false;
  this.listaAGuardar = null;
}

  /**
   * Cancela el flujo de creación de una nueva lista y limpia errores de creación.
   */
cancelarNuevaLista() {
  this.isCreatingNewLista = false;
  this.nocreando = true;
  this.createError = '';
}

  /**
   * Confirma el guardado de cambios de la lista preparada en el modal.
   * Si existe una lista pendiente en "listaAGuardar", delega en {@link guardarCambios}.
   */
confirmarGuardarCambios() {
  this.mostrarConfirmacionGuardar = false;
  if (this.listaAGuardar) {
    this.guardarCambios(this.listaAGuardar);
    this.listaAGuardar = null;
  }
}

  /**
   * Cierra y limpia todos los banners/alertas visibles en pantalla.
   */
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  /**
   * Constructor del componente. Inicializa breadcrumbs y carga datos base (clientes, productos, canales).
   * @param http Cliente HTTP para realizar peticiones a la API.
   */
  constructor(private http: HttpClient) {
    this.breadCrumbItems = [
      { label: 'Ventas' },
      { label: 'Listas de Precios', active: true }
    ];
    this.cargarClientes();
    this.cargarProductos();
    this.cargarCanales();
  }

  /**
   * Carga el listado de productos desde la API y construye un display amigable.
   */
  cargarProductos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Productos/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => { 
        this.productosLista = data; 
        
        const productosdata = data;
        this.productosLista = productosdata.map((producto: any) => ({
          ...producto,
          prod_Display: producto.prod_Codigo +' — '+ producto.prod_Descripcion
          
        }));
      },
      error: (error) => console.error('Error cargando productos:', error)
    });
  }

  /**
   * Carga el listado de clientes desde la API y agrega bandera "checked" para selección.
   */
  cargarClientes(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.clientesLista = data.map((cliente: any) => ({
          ...cliente,
          checked: false
        }));
      },
      error: (error) => console.error('Error cargando clientes:', error)
    });
  }

  /**
   * Carga el listado de canales desde la API y agrega bandera "checked" para selección.
   */
  cargarCanales(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Canal/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.canalesLista = data.map((canal: any) => ({
          ...canal,
          checked: false
        }));
      },
      error: (error) => console.error('Error cargando canales:', error)
    });
  }

  /**
   * Carga y agrupa las listas de precios para el producto seleccionado.
   * Controla el mensaje cuando no existen listas.
   */
  cargarListasPrecios(): void {
    if (!this.productoSeleccionado) {
      this.listasAgrupadas = [];
      this.noListasMsg = '';
      return;
    }
    this.http.get<any>(`${environment.apiBaseUrl}/PreciosPorProducto/ListarPorProducto?id=${this.productoSeleccionado.prod_Id}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        const agrupadas = this.agruparListas(data);
        this.listasAgrupadas = agrupadas.map((grupo: any) => {
          const clientesChecked = grupo.items.map((item: any) => item.clie_Id);
          return {
            listaId: grupo.listaId,
            prod_Id: grupo.items[0].prod_Id,
            prod_Descripcion: grupo.items[0].nombreProducto || '',
            prod_CodigoBarra: grupo.items[0].prod_CodigoBarras,
            precioContado: grupo.items[0].preP_PrecioContado,
            precioCredito: grupo.items[0].preP_PrecioCredito,
            inicioEscala: grupo.items[0].preP_InicioEscala,
            finEscala: grupo.items[0].preP_FinEscala,
            clientesChecked,
            canalFilters: {},
            isCollapsed: true
          };
        });
        this.noListasMsg = this.listasAgrupadas.length === 0 ? 'Este producto no tiene ninguna lista todavía.' : '';
      },
      error: (error) => console.error('Error cargando listas de precios:', error)
    });
  }

  /**
   * Agrupa registros devueltos por la API por id de lista de precios.
   * @param data Registros planos de listas por producto.
   * @returns Arreglo de grupos con { listaId, items }.
   */
  agruparListas(data: any[]): any[] {
    const agrupadas: { [key: number]: any[] } = {};
    data.forEach((item) => {
      const key = item.preP_ListaPrecios;
      if (!agrupadas[key]) agrupadas[key] = [];
      agrupadas[key].push(item);
    });
    return Object.entries(agrupadas).map(([listaId, items]) => ({
      listaId: parseInt(listaId),
      items
    }));
  }

  /**
   * Obtiene clientes pertenecientes a un canal específico.
   * @param canalId Id del canal.
   */
  getClientesPorCanal(canalId: number) {
    return this.clientesLista.filter(c => c.cana_Id === canalId);
  }

  /**
   * Verifica si un cliente está seleccionado en una lista dada.
   * @param lista Lista de trabajo.
   * @param clienteId Id del cliente.
   */
  isClienteChecked(lista: any, clienteId: number): boolean {
    return lista.clientesChecked.includes(clienteId);
  }

  /**
   * Indica si todos los clientes del canal están seleccionados en la lista.
   * @param lista Lista de trabajo.
   * @param canal Canal evaluado.
   */
  isCanalFullyChecked(lista: any, canal: any): boolean {
    const clientes = this.getClientesPorCanal(canal.cana_Id);
    return clientes.length > 0 && clientes.every(c => this.isClienteChecked(lista, c.clie_Id));
  }

  /**
   * Marca o desmarca todos los clientes de un canal en la lista (checkbox padre).
   * @param lista Lista de trabajo.
   * @param canal Canal afectado.
   * @param event Evento del checkbox.
   */
  toggleParentCheckbox(lista: any, canal: any, event: any) {
    const checked = event.target.checked;
    const clientes = this.getClientesPorCanal(canal.cana_Id);
    clientes.forEach((c) => {
      if (checked && !this.isClienteChecked(lista, c.clie_Id)) {
        lista.clientesChecked.push(c.clie_Id);
      } else if (!checked && this.isClienteChecked(lista, c.clie_Id)) {
        lista.clientesChecked = lista.clientesChecked.filter((id: any) => id !== c.clie_Id);
      }
    });
  }

  /**
   * Gestiona la selección individual de un cliente dentro de un canal.
   * @param lista Lista de trabajo.
   * @param canal Canal al que pertenece el cliente.
   * @param clienteId Id del cliente.
   * @param event Evento del checkbox.
   */
  onChildCheckboxChange(lista: any, canal: any, clienteId: number, event: any) {
    if (event.target.checked) {
      if (!lista.clientesChecked.includes(clienteId)) {
        lista.clientesChecked.push(clienteId);
      }
    } else {
      lista.clientesChecked = lista.clientesChecked.filter((id: any) => id !== clienteId);
    }
  }

  /**
   * Devuelve true si hay selección parcial de clientes dentro de un canal (estado indeterminado).
   * @param lista Lista de trabajo.
   * @param canal Canal evaluado.
   */
  isIndeterminate(lista: any, canal: any): boolean {
    const clientes = this.getClientesPorCanal(canal.cana_Id);
    const checkedCount = clientes.filter(c => this.isClienteChecked(lista, c.clie_Id)).length;
    return checkedCount > 0 && checkedCount < clientes.length;
  }

  /**
   * Alterna el estado de colapso/expansión de una lista existente.
   * @param lista Lista afectada.
   */
  toggleCollapse(lista: any) {
    lista.isCollapsed = !lista.isCollapsed;
  }

  /**
   * Handler al cambiar el producto seleccionado: recarga listas y resetea banderas de creación/errores.
   * @param event Evento de selección de producto.
   */
  onProductoChange(event: any) {
    this.cargarListasPrecios();
    this.nocreando = true;
    this.isCreatingNewLista = false;
    this.createError = '';
    this.noListasMsg = '';
  }

  // Lista Nueva
  /**
   * Inicia el flujo para crear una nueva lista validando que exista un producto seleccionado.
   */
  startCreateNewLista() {
    if (!this.productoSeleccionado) {
      this.createError = 'Debes seleccionar un producto antes de crear una lista.';
      return;
    }
    this.nocreando = false;
    this.isCreatingNewLista = true;
    this.createError = '';
    this.inputErrors = {
      precioContado: '',
      precioCredito: '',
      inicioEscala: '',
      finEscala: '',
      clientesChecked: ''
    };
    this.newLista = {
      precioContado: 1,
      precioCredito: 1,
      inicioEscala: 1,
      finEscala: 1,
      canalesOpen: {},
      clientesChecked: [],
      canalFilters: {}
    };
  }

  /**
   * Alterna el colapso de un canal en el panel de creación de lista.
   * @param canalId Id del canal a expandir/colapsar.
   */
  toggleNewCanalCollapse(canalId: number) {
    this.newLista.canalesOpen[canalId] = !this.newLista.canalesOpen[canalId];
  }

  /**
   * Marca o desmarca todos los clientes de un canal en la nueva lista (checkbox padre).
   * @param canal Canal afectado.
   * @param event Evento del checkbox.
   */
  toggleNewParentCheckbox(canal: any, event: any) {
    const checked = event.target.checked;
    const clientes = this.getClientesPorCanal(canal.cana_Id);
    clientes.forEach((c) => {
      if (checked && !this.newLista.clientesChecked.includes(c.clie_Id)) {
        this.newLista.clientesChecked.push(c.clie_Id);
      } else if (!checked && this.newLista.clientesChecked.includes(c.clie_Id)) {
        this.newLista.clientesChecked = this.newLista.clientesChecked.filter((id: any) => id !== c.clie_Id);
      }
    });
  }

  /**
   * Gestiona la selección individual de un cliente al crear una nueva lista.
   * @param clienteId Id del cliente.
   * @param event Evento del checkbox.
   */
  toggleNewChildCheckbox(clienteId: number, event: any) {
    if (event.target.checked) {
      if (!this.newLista.clientesChecked.includes(clienteId)) {
        this.newLista.clientesChecked.push(clienteId);
      }
    } else {
      this.newLista.clientesChecked = this.newLista.clientesChecked.filter((id: any) => id !== clienteId);
    }
  }

  /**
   * Indica si todos los clientes del canal están seleccionados en la nueva lista.
   * @param canal Canal evaluado.
   */
  isNewCanalFullyChecked(canal: any): boolean {
    const clientes = this.getClientesPorCanal(canal.cana_Id);
    return clientes.length > 0 && clientes.every(c => this.newLista.clientesChecked.includes(c.clie_Id));
  }

  /**
   * Devuelve true si hay selección parcial (indeterminado) en el canal durante la creación de nueva lista.
   * @param canal Canal evaluado.
   */
  isNewIndeterminate(canal: any): boolean {
    const clientes = this.getClientesPorCanal(canal.cana_Id);
    const checkedCount = clientes.filter(c => this.newLista.clientesChecked.includes(c.clie_Id)).length;
    return checkedCount > 0 && checkedCount < clientes.length;
  }

  // --- XML GENERATION ---
  /**
   * Genera un XML simple con los IDs de clientes requeridos por la API.
   * @param clienteIds Arreglo de ids de clientes.
   * @returns Cadena XML con la forma <root><item><clie_id>...</clie_id></item>...</root> o string vacío si no hay ids.
   */
  generateClientesXml(clienteIds: number[]): string {
    if (!clienteIds.length) return '';
    let xml = '<root>';
    clienteIds.forEach(id => {
      xml += `<item><clie_id>${id}</clie_id></item>`;
    });
    xml += '</root>';
    return xml;
  }

  // --- Validacion al crear lista ---
  /**
   * Valida los campos obligatorios para crear una nueva lista.
   * Establece mensajes por campo en {@link inputErrors}.
   * @returns true si los campos son válidos; de lo contrario false.
   */
  validateNewLista(): boolean {
  let valid = true;
  this.inputErrors = {
    precioContado: '',
    precioCredito: '',
    inicioEscala: '',
    finEscala: '',
    clientesChecked: ''
  };

  if ((this.newLista.precioContado ?? null) === null || this.newLista.precioContado! <= 0) {
    this.inputErrors.precioContado = 'Precio contado es requerido y debe ser mayor a 0.';
    valid = false;
  }
  if ((this.newLista.precioCredito ?? null) === null || this.newLista.precioCredito! <= 0) {
    this.inputErrors.precioCredito = 'Precio crédito es requerido y debe ser mayor a 0.';
    valid = false;
  }
  if ((this.newLista.inicioEscala ?? null) === null || !this.newLista.inicioEscala) {
    this.inputErrors.inicioEscala = 'Inicio escala es requerido.';
    valid = false;
  }
  if ( this.newLista.inicioEscala! <= 0) {
    this.inputErrors.inicioEscala = 'Inicio escala debe ser mayor a 0.';
    valid = false;
  }
  if ((this.newLista.finEscala ?? null) === null || this.newLista.finEscala! < (this.newLista.inicioEscala ?? 0)) {
    this.inputErrors.finEscala = 'Fin de escala debe ser mayor o igual al inicio de escala.';
    valid = false;
  }
  if (!this.newLista.clientesChecked.length) {
    this.inputErrors.clientesChecked = 'Selecciona al menos un cliente.';
    valid = false;
  }
  return valid;
}

  
  /**
   * Envía a la API la creación de una nueva lista de precios para el producto seleccionado.
   * Previamente valida campos con {@link validateNewLista} y construye el payload requerido.
   */
  crearNuevaLista() {
    this.createError = '';
    if (!this.validateNewLista()) {
      this.createError = 'Por favor llena los campos necesarios.';
      return;
    }
    const payload = {
      prod_Id: this.productoSeleccionado.prod_Id,
      clientesXml: this.generateClientesXml(this.newLista.clientesChecked),
      preP_PrecioContado: this.newLista.precioContado,
      preP_PrecioCredito: this.newLista.precioCredito,
      preP_InicioEscala: this.newLista.inicioEscala,
      preP_FinEscala: this.newLista.finEscala,
      usua_Creacion: 1, // Replace with actual user ID
      preP_FechaCreacion: new Date().toISOString()
    };
    this.http.post<any>(`${environment.apiBaseUrl}/PreciosPorProducto/InsertarLista`, payload, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {


        if(data.data.code_Status == 1){

          this.mensajeExito = data.data.message_Status || 'Lista creada exitosamente.';
          this.mostrarAlertaExito = true;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.mensajeExito = '';
          }, 3000);

        }else {
          this.mostrarAlertaError = true;
          this.mensajeError = data.data.message_Status || 'Error al eliminar insertar lista.';

          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);

          
        }

        if(data.data.code_Status == -1) {

          const stringClientesConflicto = data.data.data;
          this.listaClientesConflicto = stringClientesConflicto.split(',');
          this.mostrarClientesConflicto =true;

          // this.mostrarAlertaError = true;

          
            return;
          }

        this.isCreatingNewLista = false;
        this.cargarListasPrecios();
        this.nocreando = true;
      },
      error: (error) => {
        this.createError = 'Error al crear la lista. Intenta de nuevo.';
        
      }
    });
  }

  //Validacion al editar lista
  /**
   * Valida los campos de una lista existente antes de guardar cambios.
   * Rellena "lista.inputErrors" con mensajes específicos.
   * @param lista Lista a validar.
   * @returns true cuando los campos son válidos.
   */
  validateListaEdicion(lista: any): boolean {
    let valid = true;
    lista.inputErrors = {
      precioContado: '',
      precioCredito: '',
      inicioEscala: '',
      finEscala: '',
      clientesChecked: ''
    };

    if ((lista.precioContado ?? null) === null || lista.precioContado <= 0) {
      lista.inputErrors.precioContado = 'Precio contado es requerido y debe ser mayor a 0.';
      valid = false;
    }
    if ((lista.precioCredito ?? null) === null || lista.precioCredito <= 0) {
      lista.inputErrors.precioCredito = 'Precio crédito es requerido y debe ser mayor a 0.';
      valid = false;
    }
    if ((lista.inicioEscala ?? null) === null || lista.inicioEscala < 0) {
      lista.inputErrors.inicioEscala = 'Inicio escala es requerido.';
      valid = false;
    }
    if ((lista.finEscala ?? null) === null || lista.finEscala < lista.inicioEscala) {
      lista.inputErrors.finEscala = 'Fin escala debe ser mayor o igual a inicio escala.';
      valid = false;
    }
    if (!lista.clientesChecked || !lista.clientesChecked.length) {
      lista.inputErrors.clientesChecked = 'Selecciona al menos un cliente.';
      valid = false;
    }
    return valid;
  }


  /**
   * Persiste cambios de una lista existente llamando a la API.
   * Aplica validaciones con {@link validateListaEdicion} y muestra alertas según respuesta.
   * @param lista Lista a actualizar.
   */
  guardarCambios(lista: any) {

    if (!this.validateListaEdicion(lista)) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor corrige los errores antes de guardar cambios.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    const payload = {
      prod_Id: lista.prod_Id,
      clientesXml: this.generateClientesXml(lista.clientesChecked),
      preP_PrecioContado: lista.precioContado,
      preP_PrecioCredito: lista.precioCredito,
      preP_InicioEscala: lista.inicioEscala,
      preP_FinEscala: lista.finEscala,
      usua_Creacion: getUserId(),
      preP_FechaCreacion: new Date().toISOString(),
      preP_ListaPrecios: lista.listaId
    };

    this.http.post<any>(`${environment.apiBaseUrl}/PreciosPorProducto/ActualizarLista`, payload, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (response) => {

        //console.log('Lista actualizada:', response);

        if(response.data.code_Status == 1){

          this.mensajeExito = response.data.message_Status || 'Lista creada exitosamente.';
          this.mostrarAlertaExito = true;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.mensajeExito = '';
          }, 3000);

        }else {
          this.mostrarAlertaError = true;
          this.mensajeError = response.data.message_Status || 'Error al eliminar insertar lista.';

          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }

        if(response.data.code_Status == -1) {

          const stringClientesConflicto = response.data.data;
          this.listaClientesConflicto = stringClientesConflicto.split(',');
          this.mostrarClientesConflicto =true;

            return;
          }

        // this.mostrarAlertaExito = true;
        // this.mensajeExito = `Lista #${lista.listaId} actualizada exitosamente.`;
        // setTimeout(() => this.cerrarAlerta(), 3000);
        this.cargarListasPrecios();
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al guardar cambios en la lista. Por favor, intente nuevamente.';
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
  }


  /**
   * Muestra modal de confirmación para eliminar una lista.
   * @param listaId Identificador de la lista a eliminar.
   * @param prod_Id Identificador del producto al que pertenece la lista.
   */
  confirmarEliminar(listaId: any, prod_Id: number): void {
    //console.log('Solicitando confirmación para eliminar: lista ', listaId, ', de producto ', prod_Id);
    this.listaAEliminar.listaId = listaId;
    this.listaAEliminar.prod_Id = prod_Id;

    this.mostrarConfirmacionEliminar = true;
  }

  /**
   * Cancela el proceso de eliminación y limpia el estado temporal.
   */
  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.listaAEliminar = {listaId: 0, prod_Id: 0};
  }

  /**
   * Cierra el panel de clientes en conflicto y limpia el arreglo correspondiente.
   */
  cancelarClientesConflicto(): void {
    this.mostrarClientesConflicto = false;
    this.listaClientesConflicto = [];
  }

  /**
   * Elimina la lista indicada tras confirmación, llamando a la API.
   * Gestiona estados de éxito y error mostrando las alertas correspondientes.
   */
  eliminar(): void {
  if (!this.listaAEliminar) return;

  //console.log('Eliminando Subcategoria:', this.listaAEliminar);

  const payload = {
    preP_ListaPrecios: this.listaAEliminar.listaId,
    prod_Id: this.listaAEliminar.prod_Id,
    clientesXml: '', 
    preP_PrecioContado: 0,
    preP_PrecioCredito: 0,
    preP_InicioEscala: 0,
    preP_FinEscala: 0,
    usua_Creacion: getUserId(),
    preP_FechaCreacion: new Date().toISOString(),
    
  };

  this.http.post<any>(`${environment.apiBaseUrl}/PreciosPorProducto/EliminarLista`, payload, {
    headers: { 
      'x-api-key': environment.apiKey,
      'accept': '*/*'
    }
  }).subscribe({
    next: (response: any) => {
      //console.log('Respuesta del servidor:', response);

      if (response.success && response.data) {
        if (response.data.code_Status === 1) {
          // Éxito: eliminado correctamente
          //console.log('lista de Precios eliminada exitosamente');
          this.mensajeExito = `Lista de Precios "${this.listaAEliminar.listaId}" eliminada exitosamente`;
          this.mostrarAlertaExito = true;

          setTimeout(() => {
            this.mostrarAlertaExito = false;
            this.mensajeExito = '';
          }, 3000);

          this.cargarListasPrecios();
          this.cancelarEliminar();
        } else if (response.data.code_Status === -1) {
          
          
          this.mostrarAlertaError = true;
          this.mensajeError = response.data.message_Status;

          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);

          this.cancelarEliminar();
        } else if (response.data.code_Status === 0) {
          // Error general
          //console.log('Error general al eliminar');
          this.mostrarAlertaError = true;
          this.mensajeError = response.data.message_Status || 'Error al eliminar la lista de Precios.';

          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);

          this.cancelarEliminar();
        }
      } else {
        // Respuesta inesperada
        //console.log('Respuesta inesperada del servidor');
        this.mostrarAlertaError = true;
        this.mensajeError = response.message || 'Error inesperado al eliminar lista de precios.';

        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);

        this.cancelarEliminar();
      }
    },
    error: (error) => {
      
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error al eliminar lista de precios. Por favor, intente nuevamente.';

      setTimeout(() => {
        this.mostrarAlertaError = false;
        this.mensajeError = '';
      }, 5000);

      this.cancelarEliminar();
    }
  });
  }

  /**
   * Obtiene clientes de un canal opcionalmente filtrando por texto (id, nombre, apellido o negocio).
   * @param canalId Id del canal a filtrar.
   * @param filter Texto de filtro; si está vacío retorna todos los clientes del canal.
   * @returns Arreglo de clientes que cumplen el filtro.
   */
  getClientesPorCanalFiltrado(canalId: number, filter: string): any[] {
    const clientes = this.getClientesPorCanal(canalId);
    if (!filter) return clientes;
    const f = filter.toLowerCase();
    return clientes.filter(c =>
      (c.clie_Nombres + ' ' + c.clie_Apellidos).toLowerCase().includes(f) ||
      (c.clie_NombreNegocio || '').toLowerCase().includes(f) ||
      (c.clie_Id + '').includes(f)
    );
  }
}