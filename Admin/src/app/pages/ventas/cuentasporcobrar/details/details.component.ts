import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReactiveTableService } from 'src/app/shared/reactive-table.service';
import { CuentasPorCobrarService } from 'src/app/servicios/ventas/cuentas-por-cobrar.service';
import { FloatingMenuService } from 'src/app/shared/floating-menu.service';
import { PaginationModule } from 'ngx-bootstrap/pagination';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { TableModule } from 'src/app/pages/table/table.module';

export interface TimelineClienteItem {
  Tipo: string;
  Referencia: string;
  Monto: number;
  Fecha: string;
  FormaPago: string | null;
  CPCo_Observaciones: string;
}

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    PaginationModule,
    TableModule
  ],
  templateUrl: './details.component.html',
  styleUrls: ['./details.component.scss'],
})
export class DetailsComponent implements OnInit {
  cuentaPorCobrarId: number = 0;
  cuentaPorCobrarDetalle: CuentaPorCobrar | null = null;
  data: CuentaPorCobrar[] = [];

  cargando: boolean = false;
  mostrarOverlayCarga: boolean = false;

  mostrarAlertaError: boolean = false;
  mensajeError: string = '';
  mostrarAlertaExito: boolean = false;
  mensajeExito: string = '';

  activeActionRow: number | null = null;
  accionesDisponibles: string[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private cuentasPorCobrarService: CuentasPorCobrarService,
    public table: ReactiveTableService<TimelineClienteItem>,
    public floatingMenuService: FloatingMenuService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargarAccionesUsuario();
    this.route.params.subscribe((params) => {
      if (params['id']) {
        this.cuentaPorCobrarId = +params['id'];
        this.cargarTimeline();
      } else {
        this.router.navigate(['/ventas/cuentasporcobrar/list']);
      }
    });
  }

  setData(data: CuentaPorCobrar[]) {
    this.data = data;
  }

  private cargarTimeline(): void {
    if (!this.cuentaPorCobrarId) {
      this.table.setData([]);
      this.finalizarCarga();
      return;
    }

    this.mostrarOverlayCarga = true;
    this.cargando = true;

    this.cuentasPorCobrarService.obtenerDetalleTimeLine(this.cuentaPorCobrarId).subscribe({
      next: (respuesta: { success: boolean; data: any[]; detalle?: any }) => {
        try {
          if (respuesta && respuesta.success) {
            if (respuesta.detalle) {
              this.cuentaPorCobrarDetalle = { ...respuesta.detalle } as CuentaPorCobrar;
            }

            if (Array.isArray(respuesta.data)) {
              const timeline: TimelineClienteItem[] = respuesta.data;
              this.table.setData(timeline);
              this.table.setConfig([
                'Tipo',
                'Referencia',
                'Monto',
                'Fecha',
                'FormaPago',
                'CPCo_Observaciones',
              ]);
              this.table.setPage(1);
            } else {
              this.mostrarAlertaError = true;
              this.mensajeError = 'No se pudieron cargar los datos del timeline';
              this.table.setData([]);
            }
          } else {
            this.mostrarAlertaError = true;
            this.mensajeError = 'No se pudo obtener la información';
            this.table.setData([]);
          }
        } catch {
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al procesar los datos recibidos';
          this.table.setData([]);
        } finally {
          this.finalizarCarga();
        }
      },
      error: () => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los datos del servidor';
        this.table.setData([]);
        this.finalizarCarga();
      }
    });
  }

  private finalizarCarga(): void {
    this.cargando = false;
    this.mostrarOverlayCarga = false;
    if (!(this as any).destroyed) {
      setTimeout(() => {
        if (!(this as any).destroyed) {
          this.cdr.detectChanges();
        }
      }, 0);
    }
  }

  ngOnDestroy() {
    (this as any).destroyed = true;
  }

  cerrar(): void {
    this.router.navigate(['list'], { relativeTo: this.route.parent });
  }
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }
  cerrarAlertaExito(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
  }

  formatearFecha(fecha: Date | string | null): string {
    if (!fecha) return 'N/A';
    return new Date(fecha).toLocaleDateString('es-HN');
  }

  formatearMoneda(valor: number | null): string {
    if (valor === null || valor === undefined) return 'L 0.00';
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(valor);
  }

  accionPermitida(accion: string): boolean {
    return this.accionesDisponibles.includes(accion.trim().toLowerCase());
  }
  tienePermiso(accion: string): boolean {
    return this.accionPermitida(accion);
  }

  private cargarAccionesUsuario(): void {
    const permisosRaw = localStorage.getItem('permisosJson');
    let accionesArray: string[] = [];
    if (permisosRaw) {
      try {
        const permisos = JSON.parse(permisosRaw);
        let modulo = null;
        if (Array.isArray(permisos)) {
          modulo = permisos.find((m: any) => m.Pant_Id === 34);
        } else if (typeof permisos === 'object' && permisos !== null) {
          modulo =
            permisos['Cuentas por Cobrar'] ||
            permisos['cuentas por cobrar'] ||
            null;
        }
        if (modulo?.Acciones?.length) {
          accionesArray = modulo.Acciones
            .map((a: any) => a.Accion)
            .filter((a: any) => typeof a === 'string');
        }
      } catch {}
    }
    this.accionesDisponibles = accionesArray
      .filter((a) => a.length > 0)
      .map((a) => a.trim().toLowerCase());
  }
}
