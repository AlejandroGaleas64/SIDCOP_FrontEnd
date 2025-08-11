import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { InventarioSucursal } from 'src/app/Modelos/inventario/InventarioSucursal';
import { Sucursales } from 'src/app/Modelos/general/Sucursales.Model';

@Component({
  selector: 'app-inventariado',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './inventariado.component.html',
  styleUrl: './inventariado.component.scss'
})
export class InventariadoComponent implements OnInit {
  // Propiedades para alertas
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Datos
  sucursales: Sucursales[] = [];
  sucursalSeleccionada: Sucursales | null = null;
  inventarioSucursal: InventarioSucursal[] = [];
  inventarioOriginal: InventarioSucursal[] = [];

  // Propiedades de filtrado
  terminoBusqueda = '';
  inventarioFiltrado: InventarioSucursal[] = [];

  // Propiedades del modal de contraseña
  mostrarModal = false;
  claveIngresada = '';
  accionPendiente = '';

  // Propiedades de cambios
  mostrarModalConfirmacion = false;
  productosModificados: { nombre: string, anterior: number, nuevo: number }[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    this.cargarSucursales();
  }

  cargarSucursales(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.sucursales = data;
        console.log('Sucursales cargadas:', this.sucursales);
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar las sucursales';
        this.ocultarAlertas(5000);
      }
    });
  }

  onSucursalChange(sucuId: number): void {
    const id = Number(sucuId);
    if (id && id > 0) {
      this.sucursalSeleccionada = this.sucursales.find(s => s.sucu_Id === id) || null;
      this.cargarInventarioSucursal(id);
    } else {
      this.sucursalSeleccionada = null;
      this.inventarioSucursal = [];
      this.inventarioFiltrado = [];
    }
  }

  cargarInventarioSucursal(sucuId: number): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/InventarioSucursales/ListarPorSucursal/${sucuId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.inventarioSucursal = data;
        this.inventarioOriginal = JSON.parse(JSON.stringify(data));
        this.inventarioFiltrado = [...this.inventarioSucursal];
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar el inventario de la sucursal';
        this.ocultarAlertas(5000);
      }
    });
  }

  onCantidadChange(index: number, nuevaCantidad: number): void {
    if (nuevaCantidad < 0) {
      nuevaCantidad = 0;
    }
    this.inventarioFiltrado[index].inSu_Cantidad = nuevaCantidad;

    const itemOriginal = this.inventarioSucursal.find(
      item => item.inSu_Id === this.inventarioFiltrado[index].inSu_Id
    );
    if (itemOriginal) {
      itemOriginal.inSu_Cantidad = nuevaCantidad;
    }
  }

  filtrarInventario(): void {
    if (!this.terminoBusqueda.trim()) {
      this.inventarioFiltrado = [...this.inventarioSucursal];
    } else {
      this.inventarioFiltrado = this.inventarioSucursal.filter(item =>
        item.prod_DescripcionCorta?.toLowerCase().includes(this.terminoBusqueda.toLowerCase()) ||
        item.prod_Descripcion?.toLowerCase().includes(this.terminoBusqueda.toLowerCase())
      );
    }
  }

  confirmarActualizarCantidades(): void {
    this.mostrarModalConfirmacion = false;
    this.abrirModalClave('cantidades');
  }

  abrirModalClave(accion: string): void {
    if (!this.sucursalSeleccionada) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Debe seleccionar una sucursal primero';
      this.ocultarAlertas(3000);
      return;
    }

    this.accionPendiente = accion;
    this.claveIngresada = '';
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.claveIngresada = '';
    this.accionPendiente = '';
  }

  validarClave(): void {
    if (!this.claveIngresada.trim()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Debe ingresar una contraseña';
      this.ocultarAlertas(3000);
      return;
    }

    if (this.claveIngresada !== 'Admin123') {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Contraseña incorrecta';
      this.ocultarAlertas(3000);
      return;
    }

    if (this.accionPendiente === 'actualizar') {
      this.actualizarInventario();
    } else if (this.accionPendiente === 'cantidades') {
      this.actualizarCantidades();
    }

    this.cerrarModal();
  }

  mostrarConfirmacionCantidades(): void {
    this.productosModificados = this.inventarioSucursal
      .filter(item => {
        const original = this.inventarioOriginal.find(orig => orig.inSu_Id === item.inSu_Id);
        return original && original.inSu_Cantidad !== item.inSu_Cantidad;
      })
      .map(item => {
        const original = this.inventarioOriginal.find(orig => orig.inSu_Id === item.inSu_Id);
        return {
          nombre: item.prod_DescripcionCorta,
          anterior: original ? original.inSu_Cantidad : 0,
          nuevo: item.inSu_Cantidad
        };
      });

    if (this.productosModificados.length > 0) {
      this.mostrarModalConfirmacion = true;
    } else {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'No hay cambios en las cantidades para guardar.';
      this.ocultarAlertas(3000);
    }
  }

  actualizarInventario(): void {
    if (!this.sucursalSeleccionada) return;

    const userId = getUserId();

    this.http.post<InventarioSucursal[]>(
      `${environment.apiBaseUrl}/InventarioSucursales/ActualizarInventario/${this.sucursalSeleccionada.sucu_Id}/${userId}`,
      {},
      {
        headers: {
          'x-api-key': environment.apiKey,
          'Content-Type': 'application/json'
        }
      }
    ).subscribe({
      next: (data) => {
        this.inventarioSucursal = data;
        this.inventarioOriginal = JSON.parse(JSON.stringify(data));
        this.inventarioFiltrado = [...this.inventarioSucursal];
        this.mostrarAlertaExito = true;
        this.mensajeExito = 'Inventario actualizado correctamente';
        this.ocultarAlertas(3000);
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar el inventario';
        this.ocultarAlertas(5000);
      }
    });
  }

  actualizarCantidades(): void {
    if (!this.sucursalSeleccionada) return;

    const itemsActualizados = this.inventarioSucursal.map(item => ({
      inSu_Id: item.inSu_Id,
      sucu_Id: item.sucu_Id,
      prod_Id: item.prod_Id,
      sucu_Descripcion: item.sucu_Descripcion,
      prod_Descripcion: item.prod_Descripcion,
      prod_DescripcionCorta: item.prod_DescripcionCorta,
      inSu_Cantidad: item.inSu_Cantidad,
      cambio: item.cambio,
      usua_Creacion: item.usua_Creacion,
      inSu_FechaCreacion: item.inSu_FechaCreacion,
      usua_Modificacion: getUserId(),
      inSu_FechaModificacion: new Date().toISOString(),
      inSu_Estado: item.inSu_Estado
    }));

    const userId = getUserId();
    const fechaModificacion = new Date().toISOString();

    this.http.put<any>(
      `${environment.apiBaseUrl}/InventarioSucursales/ActualizarCantidades/${userId}/${fechaModificacion}`,
      itemsActualizados,
      {
        headers: {
          'x-api-key': environment.apiKey,
          'Content-Type': 'application/json'
        }
      }
    ).subscribe({
      next: (response) => {
        if (this.sucursalSeleccionada) {
          this.cargarInventarioSucursal(this.sucursalSeleccionada.sucu_Id);
        }
        this.mostrarAlertaExito = true;
        this.mensajeExito = 'Cantidades actualizadas correctamente';
        this.ocultarAlertas(3000);
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar las cantidades';
        this.ocultarAlertas(5000);
      }
    });
  }

  tienenCambios(): boolean {
    return this.inventarioSucursal.some((item, index) => {
      const original = this.inventarioOriginal.find(orig => orig.inSu_Id === item.inSu_Id);
      return original && original.inSu_Cantidad !== item.inSu_Cantidad;
    });
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeWarning = '';
  }

  private ocultarAlertas(delay: number): void {
    setTimeout(() => {
      this.cerrarAlerta();
    }, delay);
  }
}