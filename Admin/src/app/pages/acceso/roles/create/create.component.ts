import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Rol } from 'src/app/Modelos/acceso/roles.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

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
    this.cargarAccionesPorPantalla();
  }

  ngOnInit(): void {
    this.inicializarFormulario();
  }

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
        // console.error('Error cargando acciones por pantalla:', err);
        this.accionesPorPantalla = [];
        this.cargarPantallas();
      }
    });
  }

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

              // Detectamos si la pantalla es un reporte según el esquema
              const esReporte = esquema.Esquema === 'Reportes';
              pantallaNode.esReporte = esReporte;

              // Solo agregamos acciones si no es reporte
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
          // console.error('No se pudo parsear:', e);
        }
      },
      error: err => console.error('Error al cargar pantallas:', err)
    });
  }

  toggleSelection(item: TreeItem): void {
    item.selected = !item.selected;
    if (item.type === 'esquema' || item.type === 'pantalla') {
      this.updateChildrenSelection(item, item.selected);
    }

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

  private updateChildrenSelection(parent: TreeItem, selected: boolean): void {
    if (parent.children) {
      for (const child of parent.children) {
        child.selected = selected;
        child.expanded = selected;
        if (child.children) this.updateChildrenSelection(child, selected);
      }
    }
  }

  private updateSelectedItems(): void {
    this.selectedItems = this.getAllSelectedItems(this.treeData);
  }

  private getAllSelectedItems(items: TreeItem[]): TreeItem[] {
    return items.reduce<TreeItem[]>((acc, item) => {
      if (item.selected && (item.type === 'accion' || (item.type === 'pantalla' && item.esReporte))) acc.push(item);
      if (item.children) acc.push(...this.getAllSelectedItems(item.children));
      return acc;
    }, []);
  }

  get hayExpandido(): boolean {
    return this.treeData.some(esquema =>
      esquema.expanded || (esquema.children ? esquema.children.some(pantalla => pantalla.expanded) : false));
  }

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

  toggleExpand(item: TreeItem): void {
    item.expanded = !item.expanded;
  }

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

    this.http.post<Rol>(`${environment.apiBaseUrl}/Roles/Insertar`, rolInsertar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: () => {
        this.http.get<Rol[]>(`${environment.apiBaseUrl}/Roles/Listar`, {
          headers: { 'X-Api-Key': environment.apiKey }
        }).subscribe({
          next: (roles) => {
            const ultimoRol = roles[0];
            const permisos = this.getPermisosSeleccionados(ultimoRol.role_Id);

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
              // console.error(error);
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
        // console.error(error);
      }
    });
  }

  private getPermisosSeleccionados(roleId: number) {
    return this.selectedItems.map((item: TreeItem) => {
      let pantallaId: number | undefined;
      let accionId: number | undefined;

      if (item.type === 'accion') {
        pantallaId = item.parent ? Number(item.parent.id.split('_').pop()) : undefined;
        accionId = Number(item.id.split('_').pop());
      }

      // Pantalla tipo reporte
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

  cancelar(): void {
    this.clearSelections();
    this.inicializarFormulario();
    this.onCancel.emit();
  }

  private clearSelections(): void {
    const clearNode = (node: TreeItem) => {
      node.selected = false;
      node.expanded = false;
      if (node.children) node.children.forEach(child => clearNode(child));
    };
    this.treeData.forEach(esq => clearNode(esq));
    this.selectedItems = [];
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }
}