// IMPORTACIONES NECESARIAS PARA COMPONENTE, EVENTOS Y SERVICIOS HTTP
import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Rol } from 'src/app/Modelos/acceso/roles.Model';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

// INTERFAZ QUE DEFINE LA ESTRUCTURA DE UN PERMISO INDIVIDUAL
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

// INTERFAZ QUE AGRUPA LOS PERMISOS POR PANTALLA CON SUS ACCIONES
interface PantallaPermisos {
  descripcion: string;
  acciones: string[];
}

// DECORADOR DEL COMPONENTE DETALLE DE ROL
@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {

  // ENTRADA DEL COMPONENTE (ROL RECIBIDO DESDE EL PADRE)
  @Input() rolData: Rol | null = null;

  // SALIDA DEL COMPONENTE (EVENTO CUANDO SE CIERRA EL DETALLE)
  @Output() onClose = new EventEmitter<void>();

  // VARIABLES PARA MANEJO DEL ESTADO DEL COMPONENTE
  rolDetalle: Rol | null = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  // MAPA QUE ALMACENA LOS PERMISOS AGRUPADOS POR PANTALLA
  permisosPorPantalla: Map<number, PantallaPermisos> = new Map();

  // CONTROL DE EXPANSIÓN DE PERMISOS EN EL TEMPLATE
  permitsExpanded = false;

  constructor(private http: HttpClient) {}

  // MÉTODO DE CICLO DE VIDA: DETECTA CAMBIOS EN EL INPUT (ROL SELECCIONADO)
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['rolData'] && changes['rolData'].currentValue) {
      this.cargarDetalles(changes['rolData'].currentValue);
    }
  }

  // MÉTODO PRINCIPAL QUE CARGA LOS DETALLES Y PERMISOS DEL ROL DESDE LA API
  cargarDetalles(data: Rol): void {

    this.cargando = true;
    this.mostrarAlertaError = false;

    this.rolDetalle = { ...data };

    // SE CREA EL OBJETO DE SOLICITUD PARA BUSCAR LOS PERMISOS DEL ROL
    const permisoRequest = {
      perm_Id: 0,
      acPa_Id: 0,
      role_Id: this.rolDetalle.role_Id,
      role_Descripcion: '',
      pant_Id: 0,
      pant_Descripcion: '',
      acci_Id: 0,
      acci_Descripcion: '',
      usua_Creacion: getUserId(),
      perm_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: getUserId(),
      perm_FechaModificacion: new Date().toISOString()
    };

    // PETICIÓN HTTP AL BACKEND PARA OBTENER LOS PERMISOS ASOCIADOS AL ROL
    this.http.post<Permiso[]>(`${environment.apiBaseUrl}/Buscar`, permisoRequest, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (permisos) => {
        // AL RECIBIR LOS PERMISOS, SE ORGANIZAN POR PANTALLA
        this.organizarPermisosPorPantalla(permisos);
        this.cargando = false;
      },
      error: (error) => {
        // SI OCURRE UN ERROR, SE MUESTRA ALERTA
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los permisos del rol.';
        this.cargando = false;
      }
    });
  }

  // MÉTODO QUE AGRUPA LOS PERMISOS POR PANTALLA Y LOS ORDENA POR ID
  organizarPermisosPorPantalla(permisos: Permiso[]): void {
    const mapa = new Map<number, PantallaPermisos>();

    // SE RECORRE LA LISTA DE PERMISOS Y SE AGRUPAN SEGÚN LA PANTALLA
    permisos.forEach(p => {
      if (!p.pant_Id || !p.pant_Descripcion || !p.acci_Descripcion) {
        return;
      }

      // SI LA PANTALLA NO EXISTE EN EL MAPA, SE CREA UNA NUEVA ENTRADA
      if (!mapa.has(p.pant_Id)) {
        mapa.set(p.pant_Id, {
          descripcion: p.pant_Descripcion,
          acciones: [p.acci_Descripcion]
        });
      } else {
        // SI YA EXISTE, SE AGREGA LA ACCIÓN SI NO ESTABA INCLUIDA
        const pantalla = mapa.get(p.pant_Id)!;
        if (!pantalla.acciones.includes(p.acci_Descripcion)) {
          pantalla.acciones.push(p.acci_Descripcion);
        }
      }
    });

    // SE ORDENA EL MAPA FINAL POR EL ID DE PANTALLA
    this.permisosPorPantalla = new Map([...mapa.entries()].sort((a, b) => a[0] - b[0]));
  }

  // MÉTODO PARA MOSTRAR U OCULTAR LOS PERMISOS EXPANDIDOS EN LA VISTA
  toggleExpand(): void {
    this.permitsExpanded = !this.permitsExpanded;
  }

  // MÉTODO AUXILIAR PARA SABER SI EL ROL TIENE PERMISOS ASIGNADOS
  tienePermisos(): boolean {
    return this.permisosPorPantalla && this.permisosPorPantalla.size > 0;
  }

  // FORMATEA FECHAS A FORMATO LOCAL (HONDURAS)
  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // MÉTODO PARA CERRAR EL DETALLE Y EMITIR EVENTO AL COMPONENTE PADRE
  cerrar(): void {
    this.onClose.emit();
  }

  // MÉTODO QUE CIERRA LAS ALERTAS DE ERROR EN LA INTERFAZ
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }
}
