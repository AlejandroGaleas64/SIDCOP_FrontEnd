// ESTOS SON TODOS LOS IMPORTS NECESARIOS
import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Rol } from 'src/app/Modelos/acceso/roles.Model';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

// INTERFAZ QUE DEFINE LA ESTRUCTURA DEL ÁRBOL DE PERMISOS (ESQUEMAS, PANTALLAS Y ACCIONES)
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

// AQUI HACEMOS OTRO "MODEL" DE LOS PERMISOS Y PARA ELIMINAR Y ETC
interface Permiso {
  perm_Id: number;
  acPa_Id: number;
  role_Id: number;
  role_Descripcion: string;
  pant_Id: number;
  pant_Descripcion: string;
  acci_Id: number;
  acci_Descripcion: string;
  usua_Creacion: number;
  perm_FechaCreacion: string;
  usua_Modificacion: number;
  perm_FechaModificacion: string;
}

// INTERFAZ PARA ELIMINAR PERMISOS
interface PermisoEliminar {
  perm_Id: number;
  usua_Creacion: number;
  perm_FechaCreacion: string;
  usua_Modificacion: number;
  perm_FechaModificacion: string;
}

// INTERFAZ PARA INSERTAR NUEVOS PERMISOS
interface PermisoInsertar {
  acPa_Id: number;
  role_Id: number;
  usua_Creacion: number;
  perm_FechaCreacion: string;
}

// INTERFACES PARA REPRESENTAR LA ESTRUCTURA DE ESQUEMAS, PANTALLAS Y ACCIONES
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
  selector: 'app-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss']
})
export class EditComponent implements OnChanges {

  // ENTRADAS Y SALIDAS DEL COMPONENTE (DATOS RECIBIDOS Y EVENTOS EMITIDOS)
  @Input() rolData: Rol | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Rol>();

  // VARIABLES PRINCIPALES PARA MANEJO DEL ROL Y SU ESTADO
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

  // AQUI TENEMOS EL ROL ORIGINAL Y LAS ALERTAS PREECARGADAS
  rolOriginal: any = {};
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  mostrarConfirmacionEditar = false;

  // VARIABLES PARA CONTROLAR LA ESTRUCTURA DEL ÁRBOL Y LOS PERMISOS
  treeData: TreeItem[] = [];
  permisosDelRol: string[] = [];
  permisosActuales: any[] = [];
  selectedItems: TreeItem[] = [];
  accionesPorPantalla: { AcPa_Id: number, Pant_Id: number, Acci_Id: number }[] = [];

  hayCambiosPermisos: boolean = false;

  constructor(private http: HttpClient) {}

  // MÉTODO QUE DETECTA CAMBIOS EN LAS PROPIEDADES DE ENTRADA (SE EJECUTA AL CAMBIAR rolData)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rolData'] && changes['rolData'].currentValue) {
      this.rol = { ...changes['rolData'].currentValue };
      this.rolOriginal = { ...this.rolData };
      this.mostrarErrores = false;
      this.cerrarAlerta();
      this.cargarAccionesPorPantalla();
    }
  }

  // AQUI EMPIEZA EL METODO DE LAS ACCIONES POR PANTALLA
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
        this.cargarPermisos();
      },
      error: () => {
        this.accionesPorPantalla = [];
        this.cargarPermisos();
      }
    });
  }

  // AQUI HACEMOS LLAMADO A LOS ENDPOINT PARA PODER OBTENER LOS PERMISOS
  private cargarPantallas(): void {
    this.http.get(`${environment.apiBaseUrl}/Roles/ListarPantallas`, {
      headers: { 'x-api-key': environment.apiKey },
      responseType: 'text'
    }).subscribe({
      next: raw => {
        try {
          let data = raw.trim();
          if (!data.startsWith('[')) data = `[${data}]`;
          const parsed: Esquema[] = JSON.parse(data);

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
                pantallaNode.children = pantalla.Acciones.map((accion: Accion) => {
                  const selected = this.permisosDelRol.includes(`${pantalla.Pant_Id}_${accion.Acci_Id}`);
                  return {
                    id: `${pantalla.Pant_Id}_${accion.Acci_Id}`,
                    name: accion.Accion,
                    type: 'accion',
                    selected: selected,
                    expanded: false,
                    parent: pantallaNode
                  };
                });
                pantallaNode.selected = pantallaNode.children.some(c => c.selected) ?? false;
                pantallaNode.expanded = pantallaNode.selected;
              } else {
                pantallaNode.selected = this.permisosDelRol.some(p => p.startsWith(`${pantalla.Pant_Id}_`));
                pantallaNode.expanded = false;
              }

              return pantallaNode;
            });

            esquemaNode.selected = esquemaNode.children.some(c => c.selected);
            esquemaNode.expanded = true;
            return esquemaNode;
          });

          this.updateSelectedItems();

        } catch (e) {
          // ERROR AL PARSEAR LA RESPUESTA DE PANTALLAS
        }
      },
    });
  }

  // CARGA LOS PERMISOS ACTUALES DEL ROL DESDE EL BACKEND
  private cargarPermisos(): void {
    if (!this.rol.role_Id) {
      this.treeData = [];
      this.permisosDelRol = [];
      this.permisosActuales = [];
      return;
    }
    const permisoRequest: Permiso = {
      perm_Id: 0,
      acPa_Id: 0,
      role_Id: this.rol.role_Id,
      role_Descripcion: this.rol.role_Descripcion || '',
      pant_Id: 0,
      pant_Descripcion: '',
      acci_Id: 0,
      acci_Descripcion: '',
      usua_Creacion: getUserId(),
      perm_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: getUserId(),
      perm_FechaModificacion: new Date().toISOString()
    };

    this.http.post<any[]>(`${environment.apiBaseUrl}/Buscar`, permisoRequest, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (permisos) => {
        this.permisosActuales = permisos;
        this.permisosDelRol = permisos.map(p => `${p.pant_Id}_${p.acci_Id}`);
        this.cargarPantallas();
        this.hayCambiosPermisos = false;
      },
      error: () => {
        this.cargarPantallas();
      }
    });
  }

  // AQUI LA SELECCION DE LOS PERMISOS
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
          if (esquema && !esquema.children?.some(p => p.selected)) {
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

  // ACTUALIZA LA SELECCIÓN DE LOS HIJOS DE UN ELEMENTO PADRE
  private updateChildrenSelection(parent: TreeItem, selected: boolean): void {
    if (parent.children) {
      for (const child of parent.children) {
        child.selected = selected;
        child.expanded = selected;
        if (child.children) {
          this.updateChildrenSelection(child, selected);
        }
      }
    }
  }

  // ACTUALIZA LA LISTA DE ELEMENTOS SELECCIONADOS
  private updateSelectedItems(): void {
    this.selectedItems = this.getAllSelectedItems(this.treeData);
  }

  // OBTIENE TODOS LOS ELEMENTOS SELECCIONADOS DEL ÁRBOL
  private getAllSelectedItems(items: TreeItem[]): TreeItem[] {
    return items.reduce<TreeItem[]>((acc, item) => {
      if (item.selected && (item.type === 'accion' || (item.type === 'pantalla' && item.esReporte))) acc.push(item);
      if (item.children) acc.push(...this.getAllSelectedItems(item.children));
      return acc;
    }, []);
  }

  // INDICA SI EXISTE ALGÚN ELEMENTO EXPANDIDO EN EL ÁRBOL
  get hayExpandido(): boolean {
    return this.treeData.some(esquema => esquema.expanded || (esquema.children ? esquema.children.some(pantalla => pantalla.expanded) : false));
  }

  // EXPANDE O COLAPSA TODOS LOS ELEMENTOS DEL ÁRBOL
  alternarDesplegables(): void {
    const expandir = !this.hayExpandido;
    const cambiarExpansion = (items: TreeItem[], expandir: boolean) => {
      for (const item of items) {
        item.expanded = expandir;
        if (item.children) {
          cambiarExpansion(item.children, expandir);
        }
      }
    };
    cambiarExpansion(this.treeData, expandir);
  }

  // COMPARA LOS DATOS ACTUALES CON LOS ORIGINALES PARA DETECTAR CAMBIOS
  hayDiferencias(): boolean {
    const a = this.rol;
    const b = this.rolOriginal;
    this.cambiosDetectados = {};

    if (a.role_Descripcion !== b.role_Descripcion) {
      this.cambiosDetectados.descripcion = {
        anterior: b.role_Descripcion,
        nuevo: a.role_Descripcion,
        label: 'Descripción del rol'
      };
    }

    const permisosActuales = this.selectedItems
      .filter(item => item.type === 'accion')
      .map(item => {
        const pantallaId = item.parent ? Number(item.parent.id.split('_').pop()) : undefined;
        const accionId = Number(item.id.split('_').pop());
        return `${pantallaId}_${accionId}`;
      });

    const permisosOriginales = [...this.permisosDelRol];
    const cambiosPermisos = JSON.stringify(permisosActuales.sort()) !== JSON.stringify(permisosOriginales.sort());

    if (cambiosPermisos) {
      this.cambiosDetectados.permisos = { label: 'Se modificaron los permisos.' };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }

  // VALIDA LOS CAMBIOS ANTES DE GUARDAR (MUESTRA ALERTAS O CONFIRMACIÓN)
  validarEdicion(): void {
    this.mostrarErrores = true;
    if (this.rol.role_Descripcion.trim()) {
      if (this.hayDiferencias()) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  // DEVUELVE UNA LISTA DE LOS CAMBIOS DETECTADOS EN EL ROL
  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cambiosDetectados: any = {};

  // CANCELA LA EDICIÓN EN PROCESO
  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  // CONFIRMA LA EDICIÓN Y EJECUTA EL GUARDADO FINAL
  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  // OBTIENE LOS PERMISOS SELECCIONADOS PARA ENVIAR AL SERVICIO DE GUARDADO
  private getPermisosSeleccionados(): PermisoInsertar[] {
    return this.selectedItems.map(item => {
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
            role_Id: this.rol.role_Id,
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
        role_Id: this.rol.role_Id,
        usua_Creacion: getUserId(),
        perm_FechaCreacion: new Date().toISOString()
      };
    }).filter((permiso): permiso is PermisoInsertar => permiso !== null);
  }

  // GUARDA LOS CAMBIOS DEL ROL Y SUS PERMISOS EN EL SERVIDOR
  private guardar(): void {
    this.mostrarErrores = true;
    const descripcionVacia = !this.rol.role_Descripcion.trim();
    const permisosVacios = !this.selectedItems.some(item => item.type === 'accion' || (item.type === 'pantalla' && item.esReporte));

    if (descripcionVacia || permisosVacios) {
      this.mostrarAlertaWarning = true;
      if (descripcionVacia && permisosVacios) {
        this.mensajeWarning = 'Por favor complete todos los campos requeridos y seleccione al menos un permiso antes de guardar.';
      } else if (permisosVacios) {
        this.mensajeWarning = 'Por favor seleccione al menos un permiso antes de guardar.';
      } else if (descripcionVacia) {
        this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      }
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }

    const rolActualizar = {
      role_Id: this.rol.role_Id,
      role_Descripcion: this.rol.role_Descripcion.trim(),
      usua_Creacion: this.rol.usua_Creacion,
      role_FechaCreacion: this.rol.role_FechaCreacion,
      usua_Modificacion: getUserId(),
      numero: this.rol.secuencia || '',
      role_FechaModificacion: new Date().toISOString(),
      usuarioCreacion: '',
      usuarioModificacion: ''
    };

    this.http.put<any>(`${environment.apiBaseUrl}/Roles/Actualizar`, rolActualizar, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: () => {
        const permisosSeleccionados = this.getPermisosSeleccionados();
        const permisosEliminar: PermisoEliminar[] = this.permisosActuales.map(p => ({
          perm_Id: p.perm_Id,
          usua_Creacion: p.usua_Creacion,
          perm_FechaCreacion: p.perm_FechaCreacion,
          usua_Modificacion: getUserId(),
          perm_FechaModificacion: new Date().toISOString()
        }));

        this.http.post(`${environment.apiBaseUrl}/Roles/EliminarPermisos`, permisosEliminar, {
          headers: { 'x-api-key': environment.apiKey }
        }).subscribe({
          next: () => {
            if (permisosSeleccionados.length > 0) {
              this.http.post(`${environment.apiBaseUrl}/Roles/InsertarPermisos`, permisosSeleccionados, {
                headers: { 'x-api-key': environment.apiKey }
              }).subscribe({
                next: () => {
                  this.mostrarAlertaExito = true;
                  this.mensajeExito = 'El rol y sus permisos se actualizaron correctamente.';
                  this.onSave.emit(this.rol);
                  setTimeout(() => this.cerrarAlerta(), 4000);
                },
                error: () => {
                  this.mostrarAlertaError = true;
                  this.mensajeError = 'Error al insertar los permisos del rol.';
                  setTimeout(() => this.cerrarAlerta(), 4000);
                }
              });
            } else {
              this.mostrarAlertaExito = true;
              this.mensajeExito = 'El rol y sus permisos se actualizaron correctamente.';
              this.onSave.emit(this.rol);
              setTimeout(() => this.cerrarAlerta(), 4000);
            }
          },
          error: () => {
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al eliminar los permisos anteriores del rol.';
            setTimeout(() => this.cerrarAlerta(), 4000);
          }
        });
      },
      error: () => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar el rol.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    });
  }

  // CIERRA TODAS LAS ALERTAS EN PANTALLA
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
  }

  // CANCELA LA EDICIÓN Y VUELVE ATRÁS
  cancel(): void {
    this.onCancel.emit();
  }
}
