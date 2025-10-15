// ESTOS SON TODOS LOS IMPORTS NECESARIOS
import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Rol } from 'src/app/Modelos/acceso/roles.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

// INTERFACES PARA DEFINIR LA ESTRUCTURA DEL TREE VIEW DE PERMISOS
interface TreeItem {
  id: string;
  name: string;
  type: 'esquema' | 'pantalla' | 'accion';
  selected: boolean;
  expanded: boolean;
  children?: TreeItem[];
  parent?: TreeItem;
  esReporte?: boolean;
}

// AQUI HACEMOS UN "MODEL" PARA LAS PANTALLAS CON LOS ESQUEMAS, PANTALLAS Y ACCIONES
interface Esquema {
  Esquema: string;
  Pantallas: Pantalla[];
}

interface Pantalla {
  Pant_Id: number;
  Pant_Descripcion: string;
  Acciones: Accion[];
}

interface Accion {
  Acci_Id: number;
  Accion: string;
}

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss']
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Rol>();

  treeData: TreeItem[] = [];
  selectedItems: TreeItem[] = [];
  // NECESARIO PARA LA ACCIONES POR PANTALLA
  accionesPorPantalla: { AcPa_Id: number, Pant_Id: number, Acci_Id: number }[] = [];

  rol: Rol = {
    role_Id: 0,
    role_Descripcion: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    role_FechaCreacion: new Date(),
    role_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: '',
    role_Estado: true
  };

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {
    // CARGA LAS ACCIONES POR PANTALLA AL INICIALIZAR EL COMPONENTE
    this.cargarAccionesPorPantalla();
  }

  ngOnInit(): void {
    this.inicializarFormulario();
  }

  // METODO PARA LAS ACCIONES POR PANTALLA
  private cargarAccionesPorPantalla(): void {
    this.http.get<{ acPa_Id: number, pant_Id: number, acci_Id: number }[]>(`${environment.apiBaseUrl}/Roles/ListarAccionesPorPantalla`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.accionesPorPantalla = data.map(item => ({
          AcPa_Id: item.acPa_Id,
          Pant_Id: item.pant_Id,
          Acci_Id: item.acci_Id
        }));
        this.cargarPantallas();
      },
      error: (err) => {
        this.accionesPorPantalla = [];
        this.cargarPantallas();
      }
    });
  }

  // REINICIA LOS VALORES DEL FORMULARIO Y OCULTA LAS ALERTAS
  inicializarFormulario(): void {
    this.rol = {
      role_Id: 0,
      role_Descripcion: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      secuencia: 0,
      role_FechaCreacion: new Date(),
      role_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: '',
      role_Estado: true
    };
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
  }

  // CARGANDO LAS PANTALLAS PARA LOS PERMISOS
  private cargarPantallas(): void {
    this.http.get(`${environment.apiBaseUrl}/Roles/ListarPantallas`, {
      headers: { 'x-api-key': environment.apiKey },
      responseType: 'text'
    }).subscribe({
      next: raw => {
        try {
          let data = raw.trim();
          if (!data.startsWith('[')) data = `[${data}]`;
          const parsed = JSON.parse(data);

          this.treeData = parsed.map((esquema: Esquema) => {
            const esquemaNode: TreeItem = {
              id: esquema.Esquema,
              name: esquema.Esquema,
              type: 'esquema',
              selected: false,
              expanded: true,
              children: []
            };

            esquemaNode.children = esquema.Pantallas.map((pantalla: Pantalla) => {
              const pantallaNode: TreeItem = {
                id: `${esquema.Esquema}_${pantalla.Pant_Id}`,
                name: pantalla.Pant_Descripcion,
                type: 'pantalla',
                selected: false,
                expanded: false,
                parent: esquemaNode,
                children: []
              };

              const esReporte = esquema.Esquema === 'Reportes';
              pantallaNode.esReporte = esReporte;

              if (!esReporte) {
                pantallaNode.children = pantalla.Acciones.map((accion: Accion) => ({
                  id: `${pantalla.Pant_Id}_${accion.Acci_Id}`,
                  name: accion.Accion,
                  type: 'accion',
                  selected: false,
                  expanded: false,
                  parent: pantallaNode
                }));
              }

              return pantallaNode;
            });

            return esquemaNode;
          });

        } catch (e) {
          // ERROR AL PARSEAR LOS DATOS DE LA RESPUESTA
        }
      },
      error: err => console.error('Error al cargar pantallas:', err)
    });
  }

  // AQUI EMPEZAMOS LO DEL TREE VIEW
  toggleSelection(item: TreeItem): void {
    item.selected = !item.selected;
    if (item.type === 'esquema' || item.type === 'pantalla') {
      this.updateChildrenSelection(item, item.selected);
    }

    // AQUI PARA LA EXPANSIÓN DE ACCIONES Y ABAJO EL DE LAS PANTALLAS
    if (item.type === 'accion') {
      const pantalla = item.parent;
      const esquema = pantalla?.parent;
      if (item.selected) {
        if (pantalla) {
          pantalla.selected = true;
          pantalla.expanded = true;
        }
        if (esquema) {
          esquema.selected = true;
          esquema.expanded = true;
        }
      } else {
        if (pantalla && !pantalla.children?.some(acc => acc.selected)) {
          pantalla.selected = false;
          if (esquema && !esquema.children?.some(pant => pant.selected)) {
            esquema.selected = false;
          }
        }
      }
    }

    if (item.type === 'pantalla') {
      const esquema = item.parent;
      if (item.selected) {
        if (esquema) {
          esquema.selected = true;
          esquema.expanded = true;
        }
      } else {
        if (esquema && !esquema.children?.some(p => p.selected)) {
          esquema.selected = false;
        }
      }
    }

    this.updateSelectedItems();
  }

  // LA SELECCIÓN DE LAS PANTALLAS Y LAS ACCIONES
  private updateChildrenSelection(parent: TreeItem, selected: boolean): void {
    if (parent.children) {
      for (const child of parent.children) {
        child.selected = selected;
        child.expanded = selected;
        if (child.children) this.updateChildrenSelection(child, selected);
      }
    }
  }

  // ACTUALIZA LA LISTA DE ÍTEMS SELECCIONADOS A PARTIR DEL TREE VIEW
  private updateSelectedItems(): void {
    this.selectedItems = this.getAllSelectedItems(this.treeData);
  }

  // OBTIENE TODOS LOS NODOS SELECCIONADOS QUE SON ACCIONES O PANTALLAS DE TIPO REPORTE
  private getAllSelectedItems(items: TreeItem[]): TreeItem[] {
    return items.reduce<TreeItem[]>((acc, item) => {
      if (item.selected && (item.type === 'accion' || (item.type === 'pantalla' && item.esReporte))) acc.push(item);
      if (item.children) acc.push(...this.getAllSelectedItems(item.children));
      return acc;
    }, []);
  }

  // AQUI PARA LAS EXPANSIONES DESDE EL ESQUEMA
  get hayExpandido(): boolean {
    return this.treeData.some(esquema =>
      esquema.expanded || (esquema.children ? esquema.children.some(pantalla => pantalla.expanded) : false));
  }

  // AQUI PARA EXPANDIRLOS TODOS O NO
  alternarDesplegables(): void {
    const expandir = !this.hayExpandido;
    const cambiarExpansion = (items: TreeItem[], expandir: boolean) => {
      for (const item of items) {
        item.expanded = expandir;
        if (item.children) cambiarExpansion(item.children, expandir);
      }
    };
    cambiarExpansion(this.treeData, expandir);
  }

  // CAMBIA EL ESTADO DE EXPANSIÓN DE UN SOLO NODO
  toggleExpand(item: TreeItem): void {
    item.expanded = !item.expanded;
  }

  // AQUI PARA EL PROCESO DE GUARDAR CON TODAS LAS VALIDACIONES
  guardar(): void {
    this.mostrarErrores = true;

    const descripcionVacia = !this.rol.role_Descripcion.trim();
    const permisosVacios = !this.selectedItems.length;

    if (descripcionVacia || permisosVacios) {
      this.mostrarAlertaWarning = true;
      if (descripcionVacia && permisosVacios) {
        this.mensajeWarning = 'Por favor complete todos los campos requeridos y seleccione al menos un permiso antes de guardar.';
      } else if (permisosVacios) {
        this.mensajeWarning = 'Por favor seleccione al menos un permiso antes de guardar.';
      } else {
        this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      }
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    const rolInsertar = {
      role_Id: 0,
      role_Descripcion: this.rol.role_Descripcion.trim(),
      usua_Creacion: getUserId(),
      role_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: 0,
      numero: '',
      role_FechaModificacion: new Date().toISOString(),
      usuarioCreacion: '',
      usuarioModificacion: '',
      role_Estado: true
    };

    // AQUI INSERTAMOS EL ROL
    this.http.post<Rol>(`${environment.apiBaseUrl}/Roles/Insertar`, rolInsertar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: () => {
        // AQUI OBTENEMOS EL ÚLTIMO ROL PARA PODER INSERTAR LOS PERMISOS
        this.http.get<Rol[]>(`${environment.apiBaseUrl}/Roles/Listar`, {
          headers: { 'X-Api-Key': environment.apiKey }
        }).subscribe({
          next: (roles) => {
            const ultimoRol = roles[0];
            const permisos = this.getPermisosSeleccionados(ultimoRol.role_Id);

            // AQUI SE INSERTAR LOS PERMISOS
            Promise.all(permisos.map(permiso =>
              this.http.post(`${environment.apiBaseUrl}/Insertar`, permiso!, {
                headers: {
                  'X-Api-Key': environment.apiKey,
                  'Content-Type': 'application/json',
                  'accept': '*/*'
                }
              }).toPromise()
            )).then(() => {
              this.mostrarAlertaExito = true;
              this.mensajeExito = `Rol y permisos guardados correctamente.`;
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.onSave.emit(ultimoRol);
                this.cancelar();
                this.mostrarErrores = false;
              }, 3000);
            }).catch(error => {
              this.mostrarAlertaError = true;
              this.mensajeError = 'Error al guardar permisos.';
            });
          },
          error: () => {
            this.mostrarAlertaError = true;
            this.mensajeError = 'No se pudo obtener el último rol insertado.';
          }
        });
      },
      error: error => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al guardar el rol.';
      }
    });
  }

  // AQUI LOS PERMISOS
  private getPermisosSeleccionados(roleId: number) {
    return this.selectedItems.map((item: TreeItem) => {
      let pantallaId: number | undefined;
      let accionId: number | undefined;

      if (item.type === 'accion') {
        pantallaId = item.parent ? Number(item.parent.id.split('_').pop()) : undefined;
        accionId = Number(item.id.split('_').pop());
      }

      if (item.type === 'pantalla' && item.esReporte) {
        pantallaId = Number(item.id.split('_').pop());
        const acc = this.accionesPorPantalla.find(ap => ap.Pant_Id === pantallaId);
        if (acc) {
          return {
            acPa_Id: acc.AcPa_Id,
            role_Id: roleId,
            usua_Creacion: getUserId(),
            perm_FechaCreacion: new Date().toISOString()
          };
        }
        return null;
      }

      if (!pantallaId || !accionId) return null;

      const acPa = this.accionesPorPantalla.find(ap => ap.Pant_Id === pantallaId && ap.Acci_Id === accionId);
      if (!acPa) return null;

      return {
        acPa_Id: acPa.AcPa_Id,
        role_Id: roleId,
        usua_Creacion: getUserId(),
        perm_FechaCreacion: new Date().toISOString()
      };
    }).filter((permiso): permiso is { acPa_Id: number, role_Id: number, usua_Creacion: number, perm_FechaCreacion: string} => permiso !== null);
  }

  // REINICIA EL FORMULARIO Y EMITE EL EVENTO DE CANCELACIÓN
  cancelar(): void {
    this.clearSelections();
    this.inicializarFormulario();
    this.onCancel.emit();
  }

  // LIMPIA TODAS LAS SELECCIONES DEL TREE VIEW
  private clearSelections(): void {
    const clearNode = (node: TreeItem) => {
      node.selected = false;
      node.expanded = false;
      if (node.children) node.children.forEach(child => clearNode(child));
    };
    this.treeData.forEach(esq => clearNode(esq));
    this.selectedItems = [];
  }

  // CIERRA Y RESETEA TODAS LAS ALERTAS EN PANTALLA
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }
}
