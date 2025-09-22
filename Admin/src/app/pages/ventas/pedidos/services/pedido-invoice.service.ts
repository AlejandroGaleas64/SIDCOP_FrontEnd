import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { Observable } from 'rxjs';

/**
 * Interfaz para la respuesta del endpoint /Facturas/Insertar
 */
export interface FacturaInsertarResponse {
  fact_Id?: number;
  id?: number;
  mensaje?: string;
  exito?: boolean;
}

export interface PedidoInvoiceConfig {
  title: string;
  filename: string;
  data: any[];
  columns: PedidoInvoiceColumn[];
  metadata?: {
    department?: string;
    user?: string;
    additionalInfo?: string;
    logoUrl?: string;
  };
}

export interface PedidoInvoiceColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface PedidoInvoiceResult {
  success: boolean;
  message: string;
}

// Esta interfaz ya está definida arriba como export

@Injectable({
  providedIn: 'root'
})
export class PedidoInvoiceService {

  pedidoDetalle: Pedido | null = null;
  private configuracionEmpresa: any = null;

  // Colores del tema
  private readonly COLORES = {
    dorado: '#D6B68A',
    azulOscuro: '#141a2f',
    blanco: '#FFFFFF',
    grisClaro: '#F8F9FA',
    grisTexto: '#666666'
  };

  constructor(private http: HttpClient) {
    this.cargarConfiguracionEmpresa();
  }

  private cargarConfiguracionEmpresa() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/ConfiguracionFactura/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.configuracionEmpresa = data[0];
        }
      },
      error: (error) => {
        console.error('Error al cargar configuración de empresa:', error);
      }
    });
  }

  private async cargarLogo(): Promise<string | null> {
    if (!this.configuracionEmpresa?.coFa_Logo) {
      //console.log('No hay logo configurado');
      return null;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            console.error('No se pudo obtener el contexto del canvas');
            resolve(null);
            return;
          }

          const maxWidth = 120;
          const maxHeight = 60;
          let { width, height } = img;

          if (width > height) {
            if (width > maxWidth) {
              height = height * (maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = width * (maxHeight / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL('image/png', 0.8);
          //console.log('Logo procesado correctamente desde URL');
          resolve(dataUrl);
        } catch (e) {
          console.error('Error al procesar el logo:', e);
          resolve(null);
        }
      };

      img.onerror = (error) => {
        console.error('Error al cargar el logo desde URL:', error);
        resolve(null);
      };

      try {
        const logoUrl = this.configuracionEmpresa.coFa_Logo;
        //console.log('Intentando cargar logo desde:', logoUrl);

        if (logoUrl.startsWith('http')) {
          img.src = logoUrl;
        } else if (logoUrl.startsWith('data:')) {
          img.src = logoUrl;
        } else {
          img.src = `data:image/png;base64,${logoUrl}`;
        }
      } catch (e) {
        console.error('Error al configurar src del logo:', e);
        resolve(null);
      }
    });
  }

  // Método para recibir y almacenar el pedido completo
  setPedidoCompleto(pedidoCompleto: Pedido): void {
    this.pedidoDetalle = pedidoCompleto;
  }

  // Método para generar PDF de pedido
  async generarPedidoPDF(): Promise<PedidoInvoiceResult> {
    if (!this.pedidoDetalle) {
      return { success: false, message: 'No hay datos de pedido para imprimir' };
    }

    try {
      const doc = new jsPDF('portrait');

      // Crear encabezado de pedido
      const startY = await this.crearEncabezadoPedido(doc);

      // Crear tabla de productos
      const tableY = await this.crearTablaProductos(doc, startY);

      // Crear pie de pedido con totales
      this.crearPiePedido(doc, tableY);

      const filename = this.generateFilename(`Pedido_${this.pedidoDetalle.pedi_Id}`, 'pdf');
      doc.save(filename);

      return { success: true, message: `Pedido PDF generado: ${filename}` };

    } catch (error) {
      console.error('Error generando pedido PDF:', error);
      return { success: false, message: 'Error al generar el pedido PDF' };
    }
  }

  private async crearEncabezadoPedido(doc: jsPDF): Promise<number> {
    if (!this.pedidoDetalle) return 40;

    let yPos = 38;

    // Cargar y agregar logo
    const logoDataUrl = await this.cargarLogo();
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 80, 5, 40, 30);
      } catch (e) {
        console.error('Error al agregar logo:', e);
      }
    }

    // Información de la empresa (centrado)
    const pageWidth = doc.internal.pageSize.width;
    doc.setTextColor(this.COLORES.azulOscuro);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    const nombreEmpresa = this.configuracionEmpresa?.coFa_NombreEmpresa || 'Empresa S.A.';
    doc.text(nombreEmpresa, pageWidth / 2, 15, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    const telefono = this.configuracionEmpresa?.coFa_Telefono1 || '2234-5678';
    const correo = this.configuracionEmpresa?.coFa_Correo || 'info@empresa.com';
    const ubicacion = (this.configuracionEmpresa?.colo_Descripcion || '') + ', ' + 
                     (this.configuracionEmpresa?.muni_Descripcion || '') + ', ' + 
                     (this.configuracionEmpresa?.depa_Descripcion || '');
    
    doc.text(ubicacion || 'Ubicación', pageWidth / 2, 20, { align: 'center' });
    doc.text('Telefono: ' + telefono, pageWidth / 2, 25, { align: 'center' });
    doc.text('Correo: ' + correo, pageWidth / 2, 30, { align: 'center' });

    // Título del documento
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('PEDIDO', pageWidth / 2, 45, { align: 'center' });

    yPos = 55;

    // Información del pedido
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    doc.text(`No. Pedido: ${this.pedidoDetalle.pedi_Id}`, 20, yPos);
    yPos += 6;
    doc.text(`Fecha Pedido: ${this.formatearFecha(this.pedidoDetalle.pedi_FechaPedido)}`, 20, yPos);
    yPos += 6;
    doc.text(`Fecha Entrega: ${this.formatearFecha(this.pedidoDetalle.pedi_FechaEntrega)}`, 20, yPos);
    yPos += 6;
    doc.text(`Tipo Documento: Pedido`, 20, yPos);
    yPos += 10;

    // Línea separadora
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Información del cliente
    doc.setFont('helvetica', 'bold');
    doc.text('INFORMACIÓN DEL CLIENTE', 20, yPos);
    yPos += 8;

    doc.setFont('helvetica', 'normal');
    doc.text(`Cliente: ${this.pedidoDetalle.clie_Nombres || ''} ${this.pedidoDetalle.clie_Apellidos || ''}`, 20, yPos);
    yPos += 6;
    doc.text(`Negocio: ${this.pedidoDetalle.clie_NombreNegocio || 'N/A'}`, 20, yPos);
    yPos += 6;
    doc.text(`Dirección: ${this.pedidoDetalle.diCl_DireccionExacta || 'Dirección no especificada'}`, 20, yPos);
    yPos += 6;
    doc.text(`Vendedor: ${this.pedidoDetalle.vend_Nombres || ''} ${this.pedidoDetalle.vend_Apellidos || ''}`, 20, yPos);
    yPos += 10;

    // Línea separadora
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    return yPos;
  }

  private async crearTablaProductos(doc: jsPDF, startY: number): Promise<number> {
    if (!this.pedidoDetalle) return startY;

    const productos = JSON.parse(this.pedidoDetalle.detallesJson || '[]');
    
    if (!productos || productos.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.text('No hay productos en este pedido', 20, startY);
      return startY + 20;
    }

    const headers = ['Descripción', 'Cantidad', 'Precio Unitario', 'Monto'];
    const rows = productos.map((item: any) => [
      item.descripcion || 'Producto',
      item.cantidad?.toString() || '0',
      `L. ${(item.precio || 0).toFixed(2)}`,
      `L. ${((item.precio || 0) * (item.cantidad || 0)).toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: startY,
      head: [headers],
      body: rows,
      styles: {
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak' as any,
        halign: 'center' as any,
        valign: 'middle' as any,
      },
      headStyles: {
        fillColor: this.hexToRgb(this.COLORES.azulOscuro),
        textColor: this.hexToRgb(this.COLORES.dorado),
        fontStyle: 'bold',
        fontSize: 10,
      },
      columnStyles: {
        0: { halign: 'left' as any, cellWidth: 'auto' },   // Descripción
        1: { halign: 'center' as any, cellWidth: 'auto' }, // Cantidad
        2: { halign: 'right' as any, cellWidth: 'auto' },  // Precio
        3: { halign: 'right' as any, cellWidth: 'auto' }   // Monto
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: 20, right: 20 },
      tableWidth: 'auto' as any,
    });

    let finalY = (doc as any).lastAutoTable.finalY;
    return finalY;
  }

  private crearPiePedido(doc: jsPDF, yPos: number) {
    if (!this.pedidoDetalle) return;

    const pageWidth = doc.internal.pageSize.width;
    yPos += 10;

    // Calcular totales
    const productos = JSON.parse(this.pedidoDetalle.detallesJson || '[]');
    const subtotal = productos.reduce((acc: number, p: any) => acc + ((p.precio || 0) * (p.cantidad || 0)), 0);
    const impuesto = subtotal * 0.15;
    const total = subtotal + impuesto;

    // Línea separadora
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Totales (alineados a la derecha)
    const rightX = pageWidth - 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text(`Subtotal: L. ${subtotal.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 6;
    doc.text(`Impuesto (15%): L. ${impuesto.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // Total final
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL: L. ${total.toFixed(2)}`, rightX, yPos, { align: 'right' });

    // Información adicional
    yPos += 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Pedido generado el: ${new Date().toLocaleDateString('es-HN')}`, 20, yPos);
    yPos += 5;
    doc.text(`Usuario: ${this.obtenerUsuarioActual()}`, 20, yPos);
  }

  private formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  private obtenerUsuarioActual(): string {
    try {
      const usuario = localStorage.getItem('currentUser');
      if (usuario) {
        const userData = JSON.parse(usuario);
        return userData.usuarioCreacion || userData.nombre || 'Usuario';
      }
    } catch (e) {
      console.error('Error obteniendo usuario:', e);
    }
    return 'Sistema';
  }

  private generateFilename(baseName: string, extension: string): string {
    const fecha = new Date();
    const timestamp = fecha.toISOString().slice(0, 19).replace(/[-:T]/g, '');
    return `${baseName}_${timestamp}.${extension}`;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ];
    }
    return [0, 0, 0];
  }

  /**
   * Prepara los datos del pedido para generar ZPL
   */
  prepararDatosParaZPL(): any {
    if (!this.pedidoDetalle) return {};

    const productos = JSON.parse(this.pedidoDetalle.detallesJson || '[]');
    const subtotal = productos.reduce((acc: number, p: any) => acc + ((p.precio || 0) * (p.cantidad || 0)), 0);
    const impuesto = subtotal * 0.15;
    const total = subtotal + impuesto;

    return {
      // Información de la empresa
      coFa_NombreEmpresa: this.configuracionEmpresa?.coFa_NombreEmpresa || 'SIDCOP',
      coFa_DireccionEmpresa: this.configuracionEmpresa?.coFa_DireccionEmpresa || 'Col. Satelite Norte, Bloque 3',
      coFa_RTN: this.configuracionEmpresa?.coFa_RTN || '08019987654321',
      coFa_Telefono1: this.configuracionEmpresa?.coFa_Telefono1 || '2234-5678',
      coFa_Correo: this.configuracionEmpresa?.coFa_Correo || 'info@sidcop.com',
      
      // Información del pedido
      pedi_Id: this.pedidoDetalle.pedi_Id,
      pedi_FechaPedido: this.pedidoDetalle.pedi_FechaPedido,
      pedi_FechaEntrega: this.pedidoDetalle.pedi_FechaEntrega,
      fact_TipoDeDocumento: 'PEDIDO',
      
      // Información del cliente
      clie_Id: this.pedidoDetalle.clie_Id,
      cliente: `${this.pedidoDetalle.clie_Nombres || ''} ${this.pedidoDetalle.clie_Apellidos || ''}`.trim(),
      clie_NombreNegocio: this.pedidoDetalle.clie_NombreNegocio,
      diCl_DireccionExacta: this.pedidoDetalle.diCl_DireccionExacta,
      
      // Información del vendedor
      vendedor: `${this.pedidoDetalle.vend_Nombres || ''} ${this.pedidoDetalle.vend_Apellidos || ''}`.trim(),
      
      // Totales
      fact_Subtotal: subtotal,
      fact_TotalImpuesto15: impuesto,
      fact_TotalImpuesto18: 0,
      fact_TotalDescuento: 0,
      fact_Total: total,
      fact_ImporteExento: 0,
      fact_ImporteExonerado: 0,
      fact_ImporteGravado15: subtotal,
      fact_ImporteGravado18: 0,
      
      // Productos
      detalleFactura: productos.map((p: any) => ({
        prod_Descripcion: p.descripcion || 'Producto',
        prod_CodigoBarra: p.codigo || '',
        faDe_Cantidad: p.cantidad || 0,
        faDe_PrecioUnitario: p.precio || 0,
        faDe_Subtotal: (p.precio || 0) * (p.cantidad || 0),
        faDe_Impuesto: ((p.precio || 0) * (p.cantidad || 0)) * 0.15
      }))
    };
  }
  
  /**
   * Inserta los datos de la factura en el endpoint /Facturas/Insertar
   * @returns Observable con la respuesta del servidor
   */
  insertarFactura(): Observable<FacturaInsertarResponse> {
    if (!this.pedidoDetalle) {
      throw new Error('No hay datos de pedido para insertar');
    }
    
    // Obtener el usuario actual para usarlo como usuario de creación
    const usuarioActual = this.obtenerUsuarioActualId();
    
    // Obtener los datos del pedido
    const productos = JSON.parse(this.pedidoDetalle.detallesJson || '[]');
    
    // Preparar los detalles de la factura (productos)
    const detallesFacturaInput = productos.map((p: any) => {
      // Log detallado de cada producto para depuración
      //console.log('Producto original:', p);
      
      return {
        prod_Id: p.prod_Id || p.id || 0,
        faDe_Cantidad: p.cantidad || 0
      };
    });
    
    //console.log('Productos a insertar:', detallesFacturaInput);
    
    // Crear el objeto de factura a insertar
    const facturaData = {
      fact_Numero: `P-${this.pedidoDetalle.pedi_Id}`, // Prefijo P para indicar que viene de un pedido
      fact_TipoDeDocumento: "FACTURA",
      regC_Id: 21, // Siempre enviamos 21 como se solicitó
      diCl_Id: this.pedidoDetalle.diCl_Id || 0,
      vend_Id: this.pedidoDetalle.vend_Id || 0,
      fact_TipoVenta: "CONTADO", // Por defecto, se puede ajustar según necesidad
      fact_FechaEmision: new Date().toISOString(),
      fact_Latitud: this.pedidoDetalle.pedi_Latitud || 0,
      fact_Longitud: this.pedidoDetalle.pedi_Longitud || 0,
      fact_Referencia: `Factura generada desde pedido #${this.pedidoDetalle.pedi_Id}`,
      fact_AutorizadoPor: "", // Se puede ajustar según necesidad
      usua_Creacion: usuarioActual,
      fact_EsPedido: true, // Marcamos como true porque viene de un pedido
      pedi_Id: this.pedidoDetalle.pedi_Id || 0, // ID del pedido del que se genera
      detallesFacturaInput: detallesFacturaInput // Añadimos los productos
    };
    
    //console.log('Datos de factura a insertar:', facturaData);
    
    // Realizar la llamada al endpoint
    return this.http.post<FacturaInsertarResponse>(
      `${environment.apiBaseUrl}/Facturas/Insertar`,
      facturaData,
      { headers: { 'x-api-key': environment.apiKey } }
    );
  }
  
  /**
   * Obtiene el ID del usuario actual desde localStorage
   * @returns ID del usuario o 0 si no se encuentra
   */
  private obtenerUsuarioActualId(): number {
    try {
      const usuario = localStorage.getItem('currentUser');
      if (usuario) {
        const userData = JSON.parse(usuario);
        return userData.usua_Id || 0;
      }
    } catch (e) {
      console.error('Error obteniendo ID de usuario:', e);
    }
    return 0;
  }
}
