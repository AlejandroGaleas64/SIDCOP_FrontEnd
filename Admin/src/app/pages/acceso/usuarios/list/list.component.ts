import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { TableModule } from 'src/app/pages/table/table.module';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { Usuario } from 'src/app/Modelos/acceso/usuarios.Model';
import { CreateComponent as CreateUsuarioComponent } from '../create/create.component';
import { EditComponent as EditUsuarioComponent } from '../edit/edit.component';
import { DetailsComponent } from '../details/details.component';
import { set } from 'lodash';
import { ExportService, ExportConfig, ExportColumn } from 'src/app/shared/export.service';

import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    BreadcrumbsComponent,
    TableModule,
    PaginationModule,
    CreateUsuarioComponent,
    EditUsuarioComponent,
    DetailsComponent
  ],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss',
  animations: [
    trigger('fadeExpand', [
      transition(':enter', [
        style({
          height: '0',
          opacity: 0,
          transform: 'scaleY(0.90)',
          overflow: 'hidden'
        }),
        animate(
          '300ms ease-out',
          style({
            height: '*',
            opacity: 1,
            transform: 'scaleY(1)',
            overflow: 'hidden'
          })
        )
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate(
          '300ms ease-in',
          style({
            height: '0',
            opacity: 0,
            transform: 'scaleY(0.95)'
          })
        )
      ])
    ])
  ]
})
export class ListComponent {
  private readonly exportConfig = {
    // Configuración básica
    title: 'Listado de Usuarios',                    // Título del reporte
    filename: 'Usuarios',                           // Nombre base del archivo
    department: 'Acceso',                         // Departamento
    additionalInfo: 'Sistema de Gestión',         // Información adicional

    // Columnas a exportar - CONFIGURA SEGÚN TUS DATOS
    columns: [
      { key: 'No', header: 'No.', width: 3, align: 'center' as const },
      { key: 'Usuario', header: 'Usuario', width: 50, align: 'center' as const },
      { key: 'Rol', header: 'Rol', width: 50, align: 'center' as const },
      { key: 'Admin', header: 'Admin', width: 40, align: 'center' as const },
      { key: 'Empleado', header: 'Empleado', width: 40, align: 'center' as const }
    ] as ExportColumn[],

    // Mapeo de datos - PERSONALIZA SEGÚN TU MODELO
    dataMapping: (usuario: Usuario, index: number) => ({
      'No': usuario?.No || (index + 1),
      'Usuario': this.limpiarTexto(usuario?.usua_Usuario),
      'Rol': this.limpiarTexto(usuario?.role_Descripcion),
      'Admin': this.limpiarTexto(usuario?.usua_EsAdmin ? 'Si' : 'No'),
      'Empleado': this.limpiarTexto(usuario?.usua_EsVendedor ? 'Si' : 'No')
      // Agregar más campos aquí según necesites:
      // 'Campo': this.limpiarTexto(modelo?.campo),
    })
  };

  breadCrumbItems!: Array<{}>;
  accionesDisponibles: string[] = [];

  claveDatos: number = 0;
  claveMensaje: string = '';

  busqueda: string = '';
  usuariosFiltrados: any[] = [];

  // Estado de exportación
  exportando = false;
  tipoExportacion: 'excel' | 'pdf' | 'csv' | null = null;

  confirmaciondePassword: string = '';
  usuario: Usuario = {
    secuencia: 0,
    usua_Id: 0,
    usua_Usuario: '',
    usua_Clave: '',
    role_Id: 0,
    usua_IdPersona: 0,
    usua_EsVendedor: false,
    usua_EsAdmin: false,
    usua_TienePermisos: false,
    usua_Imagen: 'assets/images/users/32/user-dummy-img.jpg',
    usua_Creacion: 0,
    usua_FechaCreacion: new Date(),
    usua_Modificacion: 0,
    usua_FechaModificacion: new Date(),
    usua_Estado: true,
    permisosJson: '',
    role_Descripcion: '',
    nombreCompleto: '',
    code_Status: 0,
    message_Status: '',
  };

  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.some(a => a.trim().toLowerCase() === accion.trim().toLowerCase());
  }

  ngOnInit(): void {
    this.breadCrumbItems = [
      { label: 'Acceso' },
      { label: 'Usuarios', active: true }
    ];

    this.cargarAccionesUsuario();
    this.cargarDatos(true);
  }

  // ===== MÉTODOS DE EXPORTACIÓN OPTIMIZADOS =====

  /**
   * Método unificado para todas las exportaciones
   */
  async exportar(tipo: 'excel' | 'pdf' | 'csv'): Promise<void> {
    if (this.exportando) {
      this.mostrarMensaje('warning', 'Ya hay una exportación en progreso...');
      return;
    }

    if (!this.validarDatosParaExport()) {
      return;
    }

    try {
      this.exportando = true;
      this.tipoExportacion = tipo;
      this.mostrarMensaje('info', `Generando archivo ${tipo.toUpperCase()}...`);

      const config = this.crearConfiguracionExport();
      let resultado;

      switch (tipo) {
        case 'excel':
          resultado = await this.exportService.exportToExcel(config);
          break;
        case 'pdf':
          resultado = await this.exportService.exportToPDF(config);
          break;
        case 'csv':
          resultado = await this.exportService.exportToCSV(config);
          break;
      }

      this.manejarResultadoExport(resultado);

    } catch (error) {
      console.error(`Error en exportación ${tipo}:`, error);
      this.mostrarMensaje('error', `Error al exportar archivo ${tipo.toUpperCase()}`);
    } finally {
      this.exportando = false;
      this.tipoExportacion = null;
    }
  }

  /**
   * Métodos específicos para cada tipo (para usar en templates)
   */
  async exportarExcel(): Promise<void> {
    await this.exportar('excel');
  }

  async exportarPDF(): Promise<void> {
    await this.exportar('pdf');
  }

  async exportarCSV(): Promise<void> {
    await this.exportar('csv');
  }

  /**
   * Verifica si se puede exportar un tipo específico
   */
  puedeExportar(tipo?: 'excel' | 'pdf' | 'csv'): boolean {
    if (this.exportando) {
      return tipo ? this.tipoExportacion !== tipo : false;
    }
    return this.usuarioGrid?.length > 0;
  }

  // ===== MÉTODOS PRIVADOS DE EXPORTACIÓN =====

  /**
   * Crea la configuración de exportación de forma dinámica
   */
  private crearConfiguracionExport(): ExportConfig {
    return {
      title: this.exportConfig.title,
      filename: this.exportConfig.filename,
      data: this.obtenerDatosExport(),
      columns: this.exportConfig.columns,
      metadata: {
        department: this.exportConfig.department,
        additionalInfo: this.exportConfig.additionalInfo
      }
    };
  }

  /**
   * Obtiene y prepara los datos para exportación
   */
  private obtenerDatosExport(): any[] {
    try {
      const datos = this.usuarioGrid; // Use the array for cards

      if (!Array.isArray(datos) || datos.length === 0) {
        throw new Error('No hay datos disponibles para exportar');
      }

      return datos.map((modelo, index) =>
        this.exportConfig.dataMapping.call(this, modelo, index)
      );
    } catch (error) {
      console.error('Error obteniendo datos:', error);
      throw error;
    }
  }


  /**
   * Maneja el resultado de las exportaciones
   */
  private manejarResultadoExport(resultado: { success: boolean; message: string }): void {
    if (resultado.success) {
      this.mostrarMensaje('success', resultado.message);
    } else {
      this.mostrarMensaje('error', resultado.message);
    }
  }

  /**
   * Valida datos antes de exportar
   */
  private validarDatosParaExport(): boolean {
    const datos = this.usuarioGrid;

    if (!Array.isArray(datos) || datos.length === 0) {
      this.mostrarMensaje('warning', 'No hay datos disponibles para exportar');
      return false;
    }

    if (datos.length > 10000) {
      const continuar = confirm(
        `Hay ${datos.length.toLocaleString()} registros. ` +
        'La exportación puede tomar varios minutos. ¿Desea continuar?'
      );
      if (!continuar) return false;
    }

    return true;
  }

  /**
   * Limpia texto para exportación de manera más eficiente
   */
  private limpiarTexto(texto: any): string {
    if (!texto) return '';

    return String(texto)
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,;:()\[\]]/g, '')
      .trim()
      .substring(0, 150);
  }

  /**
   * Sistema de mensajes mejorado con tipos adicionales
   */
  private mostrarMensaje(tipo: 'success' | 'error' | 'warning' | 'info', mensaje: string): void {
    this.cerrarAlerta();

    const duracion = tipo === 'error' ? 5000 : 3000;

    switch (tipo) {
      case 'success':
        this.mostrarAlertaExito = true;
        this.mensajeExito = mensaje;
        setTimeout(() => this.mostrarAlertaExito = false, duracion);
        break;

      case 'error':
        this.mostrarAlertaError = true;
        this.mensajeError = mensaje;
        setTimeout(() => this.mostrarAlertaError = false, duracion);
        break;

      case 'warning':
      case 'info':
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = mensaje;
        setTimeout(() => this.mostrarAlertaWarning = false, duracion);
        break;
    }
  }

  onDocumentClick(event: MouseEvent, rowIndex: number) {
    const target = event.target as HTMLElement;
    const dropdowns = document.querySelectorAll('.dropdown-action-list');
    let clickedInside = false;
    dropdowns.forEach((dropdown, idx) => {
      if (dropdown.contains(target) && this.activeActionRow === rowIndex) {
        clickedInside = true;
      }
    });
    if (!clickedInside && this.activeActionRow === rowIndex) {
      this.activeActionRow = null;
    }
  }

  crear(): void {
    this.showCreateForm = !this.showCreateForm;
    this.showEditForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  editar(usuario: Usuario): void {
    this.usuarioEditando = { ...usuario };
    this.usuarioEditando.usua_IdPersona;
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showDetailsForm = false;
    this.activeActionRow = null;
  }

  detalles(usuario: Usuario): void {
    this.usuarioDetalles = { ...usuario };
    this.showDetailsForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.activeActionRow = null;
  }

  activeActionRow: number | null = null;
  showCreateForm = false;
  showEditForm = false;
  showDetailsForm = false;
  usuarioEditando: Usuario | null = null;
  usuarioDetalles: Usuario | null = null;

  //Propiedades para las alertas
  mostrarErrores = false;
  mostrarOverlayCarga = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  mostrarConfirmacionEliminar = false;
  usuarioEliminar: Usuario | null = null;

  mostrarConfirmacionRestablecer = false;
  usuarioRestablecer: Usuario | null = null;

  // Propiedades para mostrar contraseña
  mostrarModalContrasena = false;
  usuarioMostrarClave: Usuario | null = null;
  claveSeguridad: string = '';
  contrasenaObtenida: string | null = null;


  constructor(public table: ReactiveTableService<Usuario>, private http: HttpClient, private router: Router, private route: ActivatedRoute,
    private exportService: ExportService) {
    this.cargarDatos(true);
  }

  onActionMenuClick(rowIndex: number) {
    this.activeActionRow = this.activeActionRow === rowIndex ? null : rowIndex;
  }

  cerrarFormulario(): void {
    this.showCreateForm = false;
  }

  cerrarFormularioEdicion(): void {
    this.showEditForm = false;
    this.usuarioEditando = null;
  }

  cerrarFormularioDetalles(): void {
    this.showDetailsForm = false;
    this.usuarioDetalles = null;
  }

  // Métodos para mostrar contraseña
  mostrarContrasena(usuario: Usuario): void {
    this.claveSeguridad = 'ALERTA_SIDCOP1.soloadmins';
    this.usuarioMostrarClave = { ...usuario };
    this.mostrarModalContrasena = true;
    this.contrasenaObtenida = null;
    this.activeActionRow = null;
    this.obtenerContrasena();
  }

  cancelarMostrarContrasena(): void {
    this.mostrarModalContrasena = false;
    this.usuarioMostrarClave = null;
    this.claveSeguridad = '';
    this.contrasenaObtenida = null;
  }

  obtenerContrasena(): void {
    if (!this.claveSeguridad || !this.usuarioMostrarClave) {
      this.mensajeWarning = 'Debe ingresar la clave de seguridad';
      this.mostrarAlertaWarning = true;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
      }, 3000);
      return;
    }

    this.mostrarOverlayCarga = true;

    const apiUrl = `${environment.apiBaseUrl}/Usuarios/MostrarContrasena?usuaId=${this.usuarioMostrarClave.usua_Id}&claveSeguridad=${encodeURIComponent(this.claveSeguridad)}`;

    this.http.get(apiUrl, {
      headers: {
        'X-Api-Key': environment.apiKey
      }
    }).subscribe({
      next: (response: any) => {
        this.mostrarOverlayCarga = false;

        if (response.success && response.data) {
          if (response.data.code_Status === 1) {
            // Contraseña obtenida correctamente
            this.contrasenaObtenida = response.data.data;
          } else if (response.data.message_Status === 'Usuario no encontrado o sin contraseña.') {
            // Usuario no encontrado o sin contraseña
            this.mensajeWarning = 'Usuario no encontrado o sin contraseña';
            this.mostrarAlertaWarning = true;
            setTimeout(() => {
              this.mostrarAlertaWarning = false;
            }, 3000);
          } else {
            // Contraseña de seguridad incorrecta u otro error
            this.mensajeError = response.data.message_Status || 'Contraseña de seguridad incorrecta';
            this.mostrarAlertaError = true;
            setTimeout(() => {
              this.mostrarAlertaError = false;
            }, 3000);
          }
        } else {
          this.mensajeError = 'Error al obtener la contraseña';
          this.mostrarAlertaError = true;
          setTimeout(() => {
            this.mostrarAlertaError = false;
          }, 3000);
        }
      },
      error: (error) => {
        this.mostrarOverlayCarga = false;
        this.mensajeError = 'Error al conectar con el servidor';
        this.mostrarAlertaError = true;
        setTimeout(() => {
          this.mostrarAlertaError = false;
        }, 3000);
        console.error('Error al obtener la contraseña:', error);
      }
    });
  }

  guardarUsuario(usuario: Usuario): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargarDatos(false);
      this.showCreateForm = false;
      this.mensajeExito = `Usuario guardado exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  actualizarUsuario(usuario: Usuario): void {
    this.mostrarOverlayCarga = true;
    setTimeout(() => {
      this.cargarDatos(false);
      this.showEditForm = false;
      this.mensajeExito = `Usuario actualizado exitosamente`;
      this.mostrarAlertaExito = true;
      setTimeout(() => {
        this.mostrarAlertaExito = false;
        this.mensajeExito = '';
      }, 3000);
    }, 1000);
  }

  restablecer(usuario: Usuario): void {
    this.usuarioRestablecer = usuario;
    this.mostrarConfirmacionRestablecer = true;
    this.activeActionRow = null;
  }

  cancelarRestablecer(): void {
    this.mostrarConfirmacionRestablecer = false;
    this.usuarioRestablecer = null;
    this.usuario.usua_Clave = '';
    this.confirmaciondePassword = '';
    this.mostrarErrores = false;
  }

  confirmarEliminar(usuario: Usuario): void {
    this.usuarioEliminar = usuario;
    this.mostrarConfirmacionEliminar = true;
    this.activeActionRow = null;
  }

  cancelarEliminar(): void {
    this.mostrarConfirmacionEliminar = false;
    this.usuarioEliminar = null;
  }

  contrasenasCoinciden(): boolean {
    return this.usuario.usua_Clave === this.confirmaciondePassword;
  }

  corroborarClave(clave: string) {
    if (clave.length === 0) {
      this.claveDatos = 0;
      this.claveMensaje = '';
      return;
    }

    const tieneLetra = /[a-zA-Z]/.test(clave);
    const tieneNumero = /\d/.test(clave);
    const tieneEspecial = /[^a-zA-Z\d]/.test(clave);
    const tipos = [tieneLetra, tieneNumero, tieneEspecial].filter(Boolean).length;

    if (clave.length < 8) {
      this.claveDatos = 1;
      this.claveMensaje = `Débil: debe tener al menos 8 caracteres.`;
      return;
    }

    if (tipos === 1) {
      this.claveDatos = 1;
      let faltantes = [];
      if (!tieneLetra) faltantes.push('una letra');
      if (!tieneNumero) faltantes.push('un número');
      if (!tieneEspecial) faltantes.push('un carácter especial');
      let faltantesMsg = faltantes.length ? ` debe tener ${faltantes.join(' y ')}.` : '';
      this.claveMensaje = `Débil:${faltantesMsg}`;
    } else if (tipos === 2) {
      this.claveDatos = 2;
      let faltantes = [];
      if (!tieneLetra) faltantes.push('una letra');
      if (!tieneNumero) faltantes.push('un número');
      if (!tieneEspecial) faltantes.push('un carácter especial');
      let faltantesMsg = faltantes.length ? ` debe tener ${faltantes.join(' y ')}.` : '';
      this.claveMensaje = `Media:${faltantesMsg}`;
    } else if (tipos === 3) {
      this.claveDatos = 3;
      this.claveMensaje = 'Fuerte';
    }
  }

  restablecerClave(): void {
    if (!this.usuarioRestablecer) return
    this.mostrarErrores = true;
    if (this.claveDatos < 3) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'La contraseña debe ser de nivel fuerte.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      return;
    }
    if (!this.usuario.usua_Clave.trim() || !this.confirmaciondePassword.trim()) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Debe ingresar y confirmar la nueva contraseña.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }
    if (this.usuario.usua_Clave !== this.confirmaciondePassword) {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Las contraseñas no coinciden.';
      setTimeout(() => this.cerrarAlerta(), 4000);
      return;
    }
    const usuarioRestablecer: Usuario = {
      secuencia: 0,
      usua_Id: this.usuarioRestablecer.usua_Id,
      usua_Usuario: '',
      usua_Clave: this.confirmaciondePassword.trim(),
      role_Id: 0,
      usua_IdPersona: 0,
      usua_EsVendedor: false,
      usua_EsAdmin: false,
      usua_Imagen: '',
      usua_TienePermisos: false,
      usua_Creacion: getUserId(),
      usua_FechaCreacion: new Date(),
      usua_Modificacion: getUserId(),
      usua_FechaModificacion: new Date(),
      usua_Estado: true,
      permisosJson: "",
      role_Descripcion: '',
      nombreCompleto: '',
      code_Status: 0,
      message_Status: '',
    };
    this.mostrarOverlayCarga = true;
    this.http.post(`${environment.apiBaseUrl}/Usuarios/RestablecerClave`, usuarioRestablecer, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              this.mensajeExito = `Clave del usuario restablecida exitosamente`;
              this.mostrarAlertaExito = true;
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);
              this.cargarDatos(false);
            } else if (response.data.code_Status === -1) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status;
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            }
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = response.message || 'Error inesperado al restablecer la clave del usuario.';
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
          this.cancelarRestablecer();
        }, 1000);
      }
    });
  }

  eliminar(): void {
    if (!this.usuarioEliminar) return;
    const usuarioEliminar: Usuario = {
      secuencia: 0,
      usua_Id: this.usuarioEliminar.usua_Id,
      usua_Usuario: '',
      usua_Clave: '',
      role_Id: 0,
      usua_IdPersona: 0,
      usua_EsVendedor: false,
      usua_EsAdmin: false,
      usua_Imagen: '',
      usua_TienePermisos: false,
      usua_Creacion: getUserId(),
      usua_FechaCreacion: new Date(),
      usua_Modificacion: getUserId(),
      usua_FechaModificacion: new Date(),
      usua_Estado: true,
      permisosJson: "",
      role_Descripcion: '',
      nombreCompleto: '',
      code_Status: 0,
      message_Status: '',
    }
    this.mostrarOverlayCarga = true;
    this.http.post(`${environment.apiBaseUrl}/Usuarios/CambiarEstado`, usuarioEliminar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'accept': '*/*'
      }
    }).subscribe({
      next: (response: any) => {
        setTimeout(() => {
          this.mostrarOverlayCarga = false;
          if (response.success && response.data) {
            if (response.data.code_Status === 1) {
              if (this.usuarioEliminar!.usua_Estado) {
                this.mensajeExito = `Usuario "${this.usuarioEliminar!.usua_Usuario}" desactivado exitosamente`;
                this.mostrarAlertaExito = true;
              }
              if (!this.usuarioEliminar!.usua_Estado) {
                this.mensajeExito = `Usuario "${this.usuarioEliminar!.usua_Usuario}" activado exitosamente`;
                this.mostrarAlertaExito = true;
              }

              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.mensajeExito = '';
              }, 3000);

              this.cargarDatos(false);
              this.cancelarEliminar();
            } else if (response.data.code_Status === -1) {
              this.mostrarAlertaError = true;
              this.mensajeError = response.data.message_Status;

              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);

              this.cancelarEliminar();
            }
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = response.message || 'Error inesperado al cambiar el estado al usuario.';

            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);

            this.cancelarEliminar();
          }
        }, 1000)
      }
    })
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        if (Array.isArray(permisos)) {
          modulo = permisos.find((m: any) => m.Pant_Id === 63);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo = permisos['Usuarios'] || permisos['usuarios'] || null;
        }
        if (modulo && modulo.Acciones && Array.isArray(modulo.Acciones)) {
          accionesArray = modulo.Acciones.map((a: any) => a.Accion).filter((a: any) => typeof a === 'string');
        }
      } catch (e) {
        console.error('Error al parsear permisosJson:', e);
      }
    }
    this.accionesDisponibles = accionesArray.filter(a => typeof a === 'string' && a.length > 0).map(a => a.trim().toLocaleLowerCase());
  }

  usuarioGrid: any = [];
  usuarios: any = [];

  filtradorUsuarios(): void {
    const termino = this.busqueda.trim().toLowerCase();
    if (!termino) {
      this.usuariosFiltrados = [...this.usuarioGrid];
    } else {
      this.usuariosFiltrados = this.usuarioGrid.filter((usuario: any) =>
        (usuario.nombreCompleto || '').toLowerCase().includes(termino) ||
        (usuario.usua_Usuario || '').toLowerCase().includes(termino) ||
        (usuario.role_Descripcion || '').toLowerCase().includes(termino)
      );
    }

    this.currentPage = 1;

    this.actualizarUsuariosVisibles();
  }

  private actualizarUsuariosVisibles(): void {
    const startItem = (this.currentPage - 1) * this.itemsPerPage;
    const endItem = this.currentPage * this.itemsPerPage;
    this.usuarios = this.usuariosFiltrados.slice(startItem, endItem);
  }

  private cargarDatos(state: boolean): void {
    this.mostrarOverlayCarga = state;
    this.http.get<Usuario[]>(`${environment.apiBaseUrl}/Usuarios/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      setTimeout(() => {
        this.mostrarOverlayCarga = false;
        const tienePermisoListar = this.accionPermitida('listar');
        const userId = getUserId();

        const datosFiltrados = tienePermisoListar
          ? data
          : data.filter(u => u.usua_Creacion?.toString() === userId?.toString());
        this.usuarioGrid = datosFiltrados || [];
        this.busqueda = '';
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.usuariosFiltrados = [...this.usuarioGrid];
        this.actualizarUsuariosVisibles();
      }, 500);
    });
  }

  currentPage: number = 1;
  itemsPerPage: number = 12;

  get startIndex(): number {
    return this.usuariosFiltrados?.length ? ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
  }

  get endIndex(): number {
    if (!this.usuariosFiltrados?.length) return 0;
    const end = this.currentPage * this.itemsPerPage;
    return end > this.usuariosFiltrados.length ? this.usuariosFiltrados.length : end;
  }

  pageChanged(event: any): void {
    this.currentPage = event.page;
    this.actualizarUsuariosVisibles();
  }

  trackByUsuarioId(index: number, item: any): any {
    return item.usua_Id;
  }

  onImgError(event: Event) {
    const target = event.target as HTMLImageElement;
    target.src = 'assets/images/users/32/user-dummy-img.jpg';
  }
}
