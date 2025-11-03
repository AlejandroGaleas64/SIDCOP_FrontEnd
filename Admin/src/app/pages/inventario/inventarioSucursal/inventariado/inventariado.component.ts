import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { InventarioSucursal } from 'src/app/Modelos/inventario/InventarioSucursal';
import { Sucursales } from 'src/app/Modelos/general/Sucursales.Model';
import { obtenerUsuario } from 'src/app/core/utils/user-utils';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';

// Interfaz para el historial
interface HistorialInventarioSucursal {
  hiSu_Id: number;
  inSu_Id: number;
  sucu_Id: number;
  prod_Id: number;
  prod_DescripcionCorta: string;
  inSu_Cantidad: number;
  inSu_NuevaCantidad: number;
  hiSu_Accion: string;
  hiSu_FechaAccion: string;
  usua_Usuario: string;
  hiSu_UsuarioAccion: number;
}

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

  mensajeErrorClave = false;

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

  // PROPIEDADES PARA PDF E HISTORIAL
  historialInventario: HistorialInventarioSucursal[] = [];
  historialFiltrado: HistorialInventarioSucursal[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargandoPdf = false;
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  mostrarHistorial = false;
  // NUEVA PROPIEDAD PARA CONTROLAR EL VISOR PDF
  mostrarVisorPDF = false;

  //Constructor e inyección de dependencias
  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) { }

  // Ciclo de vida del componente
  ngOnInit(): void {
    this.cargarSucursales();
  }

  // Metodo de cargar datos para el ddl 
  cargarSucursales(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.sucursales = data;
        //console.log('Sucursales cargadas:', this.sucursales);
      },
      error: (error) => {
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar las sucursales';
        this.ocultarAlertas(5000);
      }
    });
  }

  // Método al cambiar la sucursal seleccionada
  onSucursalChange(sucuId: number): void {
    const id = Number(sucuId);
    if (id && id > 0) {
      this.sucursalSeleccionada = this.sucursales.find(s => s.sucu_Id === id) || null;
      this.cargarInventarioSucursal(id);
      // Limpiar datos del historial al cambiar sucursal
      this.historialInventario = [];
      this.historialFiltrado = [];
      this.pdfUrl = null;
      this.mostrarHistorial = false;
      this.mostrarVisorPDF = false; // OCULTAR EL VISOR PDF
    } else {
      this.sucursalSeleccionada = null;
      this.inventarioSucursal = [];
      this.inventarioFiltrado = [];
      this.historialInventario = [];
      this.historialFiltrado = [];
      this.pdfUrl = null;
      this.mostrarHistorial = false;
      this.mostrarVisorPDF = false; // OCULTAR EL VISOR PDF
    }
  }

  // Método para cargar el inventario de la sucursal seleccionada
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

// MÉTODO MODIFICADO PARA CARGAR HISTORIAL Y MOSTRAR EN VISOR
async cargarHistorialYGenerarPDF(): Promise<void> {
  if (!this.sucursalSeleccionada) {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'Debe seleccionar una sucursal primero';
    this.ocultarAlertas(3000);
    return;
  }

  this.cargandoPdf = true;
  
  try {
    // 1. CARGAR EL HISTORIAL PRIMERO
    const historialData = await this.cargarHistorialPromise(this.sucursalSeleccionada.sucu_Id);
    
    if (historialData.length === 0) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'No hay historial disponible para esta sucursal';
      this.ocultarAlertas(3000);
      this.cargandoPdf = false;
      return;
    }

    // 2. ASIGNAR LOS DATOS
    this.historialInventario = historialData;
    this.historialFiltrado = [...this.historialInventario];
    this.mostrarHistorial = true;

    // 3. GENERAR EL PDF Y MOSTRARLO EN EL VISOR (SIN DESCARGAR AUTOMÁTICAMENTE)
    await this.generarPDFHistorial();
    
    // 4. MOSTRAR EL VISOR PDF Y OCULTAR LA TABLA
    this.mostrarVisorPDF = true;

  } catch (error) {
    console.error('Error al cargar historial:', error);
    this.mostrarAlertaError = true;
    this.mensajeError = 'Error al cargar el historial de la sucursal';
    this.ocultarAlertas(5000);
    this.cargandoPdf = false;
  }
}

// MÉTODO AUXILIAR QUE CONVIERTE LA LLAMADA HTTP EN PROMISE
private cargarHistorialPromise(sucuId: number): Promise<HistorialInventarioSucursal[]> {
  return new Promise((resolve, reject) => {
    this.http.get<HistorialInventarioSucursal[]>(`${environment.apiBaseUrl}/InventarioSucursales/Historial/${sucuId}`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => resolve(data),
      error: (error) => reject(error)
    });
  });
}

// MÉTODO ORIGINAL MANTENIDO PARA SOLO CARGAR SIN PDF
cargarHistorialSucursal(): void {
  if (!this.sucursalSeleccionada) {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'Debe seleccionar una sucursal primero';
    this.ocultarAlertas(3000);
    return;
  }

  this.cargandoPdf = true;
  
  this.http.get<HistorialInventarioSucursal[]>(`${environment.apiBaseUrl}/InventarioSucursales/Historial/${this.sucursalSeleccionada.sucu_Id}`, {
    headers: { 'x-api-key': environment.apiKey }
  }).subscribe({
    next: (data) => {
      this.historialInventario = data;
      this.historialFiltrado = [...this.historialInventario];
      this.mostrarHistorial = true;
      this.cargandoPdf = false;
      
      if (data.length === 0) {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No hay historial disponible para esta sucursal';
        this.ocultarAlertas(3000);
      }
    },
    error: (error) => {
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error al cargar el historial de la sucursal';
      this.ocultarAlertas(5000);
      this.cargandoPdf = false;
    }
  });
}

// MÉTODO GENERARPDFHISTORIAL MODIFICADO (SIN DESCARGA AUTOMÁTICA)
async generarPDFHistorial(): Promise<void> {
  if (!this.sucursalSeleccionada || this.historialFiltrado.length === 0) {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'No hay datos para generar el reporte';
    this.ocultarAlertas(3000);
    return;
  }

  // Si ya estaba cargando, no iniciar otra carga
  if (!this.cargandoPdf) {
    this.cargandoPdf = true;
  }

  try {
    // CONFIGURACIÓN DEL REPORTE
    const config: ReportConfig = {
      titulo: 'HISTORIAL DE INVENTARIO POR SUCURSAL',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Sucursal: ${this.sucursalSeleccionada.sucu_Descripcion} - Total de movimientos: ${this.historialFiltrado.length}`,
    };

    // DATOS DE LA TABLA
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 20 } },
          { content: 'Producto', styles: { cellWidth: 55 } },
          { content: 'Cantidad Anterior', styles: { halign: 'center', cellWidth: 20 } },
          { content: 'Cantidad Nueva', styles: { halign: 'center', cellWidth: 20 } },
          { content: 'Diferencia', styles: { halign: 'center', cellWidth: 25 } },
          { content: 'Acción', styles: { halign: 'center', cellWidth: 50 } },
          { content: 'Fecha', styles: { halign: 'center', cellWidth: 40 } },
          { content: 'Usuario', styles: { cellWidth: 30 } }
        ]
      ],
      body: this.historialFiltrado.map((item, index) => {
        const diferencia = item.inSu_NuevaCantidad - item.inSu_Cantidad;
        const diferenciaTexto = diferencia > 0 ? `+${diferencia}` : diferencia.toString();
        
        return [
          { content: (index + 1).toString(), styles: { halign: 'center' } },
          this.pdfService.truncateText(item.prod_DescripcionCorta || '', 30),
          { content: item.inSu_Cantidad.toString(), styles: { halign: 'center' } },
          { content: item.inSu_NuevaCantidad.toString(), styles: { halign: 'center' } },
          { 
            content: diferenciaTexto, 
            styles: { 
              halign: 'center',
              textColor: diferencia > 0 ? [0, 128, 0] : diferencia < 0 ? [255, 0, 0] : [0, 0, 0]
            } 
          },
          { content: item.hiSu_Accion || 'N/A', styles: { halign: 'center' } },
          { content: this.formatearFechaPDF(item.hiSu_FechaAccion), styles: { halign: 'center' } },
          item.usua_Usuario || 'N/A'
        ];
      })
    };

    // GENERAR EL PDF (SIN DESCARGAR)
    const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.historialFiltrado);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    
    this.mostrarAlertaExito = true;
    this.mensajeExito = 'PDF generado correctamente';
    this.ocultarAlertas(3000);
    
  } catch (error) {
    console.error('Error al generar PDF:', error);
    this.mostrarAlertaError = true;
    this.mensajeError = 'Error al generar el PDF: ' + (error as any)?.message || 'Error desconocido';
    this.ocultarAlertas(5000);
  } finally {
    this.cargandoPdf = false;
  }
}

// NUEVO MÉTODO PARA DESCARGAR EL PDF
descargarPDF(): void {
  if (!this.pdfUrl || !this.sucursalSeleccionada) {
    this.mostrarAlertaWarning = true;
    this.mensajeWarning = 'No hay PDF disponible para descargar';
    this.ocultarAlertas(3000);
    return;
  }

  try {
    // Obtener la URL del blob desde SafeResourceUrl
    const urlString = (this.pdfUrl as any).changingThisBreaksApplicationSecurity;
    
    // CREAR UN ENLACE TEMPORAL PARA DESCARGAR
    const link = document.createElement('a');
    link.href = urlString;
    link.download = `Historial_Inventario_${this.sucursalSeleccionada.sucu_Descripcion}_${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.mostrarAlertaExito = true;
    this.mensajeExito = 'PDF descargado correctamente';
    this.ocultarAlertas(3000);
  } catch (error) {
    this.mostrarAlertaError = true;
    this.mensajeError = 'Error al descargar el PDF';
    this.ocultarAlertas(3000);
  }
}

// NUEVO MÉTODO PARA CERRAR EL VISOR PDF
cerrarVisorPDF(): void {
  this.mostrarVisorPDF = false;
  // Opcional: limpiar la URL del PDF para liberar memoria
  if (this.pdfUrl) {
    const urlString = (this.pdfUrl as any).changingThisBreaksApplicationSecurity;
    URL.revokeObjectURL(urlString);
    this.pdfUrl = null;
  }
}

  // FUNCIÓN AUXILIAR PARA FORMATEAR FECHA PARA EL PDF
  private formatearFechaPDF(fecha: string): string {
    try {
      const fechaObj = new Date(fecha);
      return fechaObj.toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }

  // FUNCIÓN AUXILIAR PARA FORMATEAR FECHA EN LA VISTA
  formatearFecha(fecha: string): string {
    try {
      const fechaObj = new Date(fecha);
      return fechaObj.toLocaleString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fecha;
    }
  }

  // Método al cambiar cantidad en el input
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

  // Método para filtrar el inventario
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

  // Métodos para manejar la confirmación y actualización
  confirmarActualizarCantidades(): void {
    this.mostrarModalConfirmacion = false;
    this.abrirModalClave('cantidades');
  }

  // Método para abrir el modal de contraseña
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

  // Método para cerrar el modal de contraseña
  cerrarModal(): void {
    this.mostrarModal = false;
    this.claveIngresada = '';
    this.accionPendiente = '';
  }

  // Método para validar la clave ingresada
  validarClave(): void {
    if (!this.claveIngresada.trim()) {
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Debe ingresar una contraseña';
      this.ocultarAlertas(3000);
      return;
    }

    const usuarioGuardar = {
      usua_Id: 0,
      usua_Usuario: obtenerUsuario(),
      usua_Clave: this.claveIngresada.trim(),
      role_Id: 0,
      role_Descripcion: "string",
      usua_IdPersona: 0,
      usua_EsVendedor: true,
      usua_EsAdmin: true,
      usua_Imagen: "string",
      usua_TienePermisos: true,
      usua_Creacion: getUserId(),
      usua_FechaCreacion: new Date().toISOString(),
      usua_Modificacion: getUserId(),
      usua_FechaModificacion: new Date().toISOString(),
      usua_Estado: true,
      permisosJson: "string"
    };
    this.http.post<any>(`${environment.apiBaseUrl}/Usuarios/IniciarSesion`, usuarioGuardar, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: (resp) => {
        if (resp?.data?.code_Status === 1) {
          this.mensajeErrorClave = false;
          if (this.accionPendiente === 'actualizar') {
            this.actualizarInventario();
          } else if (this.accionPendiente === 'cantidades') {
            this.actualizarCantidades();
          }
          this.cerrarModal();   
        }
        else if (resp?.data?.code_Status === -1) {
          this.mensajeErrorClave = true;
          return;
        }
      },
    });
  }

  // Método para mostrar el modal de confirmación si hay cambios
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

  // Método para actualizar el inventario desde el servidor
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

  // Método para actualizar las cantidades modificadas
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

  // Método para verificar si hay cambios en las cantidades
  tienenCambios(): boolean {
    return this.inventarioSucursal.some((item, index) => {
      const original = this.inventarioOriginal.find(orig => orig.inSu_Id === item.inSu_Id);
      return original && original.inSu_Cantidad !== item.inSu_Cantidad;
    });
  }

  // Métodos para manejar las alertas
  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeWarning = '';
  }

  // Ocultar alertas después de un tiempo
  private ocultarAlertas(delay: number): void {
    setTimeout(() => {
      this.cerrarAlerta();
    }, delay);
  }
}