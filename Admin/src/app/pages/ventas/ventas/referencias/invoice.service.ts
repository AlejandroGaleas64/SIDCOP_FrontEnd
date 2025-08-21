import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getUserId } from 'src/app/core/utils/user-utils';
import * as XLSX from 'xlsx';
import { Factura, VentaDetalle, DetalleItem, FacturaCompleta } from 'src/app/Modelos/ventas/Facturas.model';

export interface ExportConfig {
  title: string;
  filename: string;
  data: any[];
  columns: ExportColumn[];
  metadata?: {
    department?: string;
    user?: string;
    additionalInfo?: string;
    logoUrl?: string;
  };
}

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface ExportResult {
  success: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {

  facturaDetalle: FacturaCompleta | null = null;

  private configuracionEmpresa: any = null;

  // Colores del tema (mismos del PdfReportService)
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

  async exportToPDF(config: ExportConfig): Promise<ExportResult> {
    try {
      this.validateConfig(config);
      const doc = new jsPDF('portrait');

      // Crear encabezado y obtener posición Y donde empezar la tabla
      const startY = await this.crearEncabezado(doc, config);

      // Crear tabla de datos
      await this.crearTabla(doc, config, startY);

      const filename = this.generateFilename(config.filename, 'pdf');
      doc.save(filename);

      return { success: true, message: `Archivo PDF exportado: ${filename}` };

    } catch (error) {
      console.error('Error exportando PDF:', error);
      return { success: false, message: 'Error al exportar archivo PDF' };
    }
  }

  private async cargarLogo(): Promise<string | null> {
    if (!this.configuracionEmpresa?.coFa_Logo) {
      console.log('No hay logo configurado');
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
          console.log('Logo procesado correctamente desde URL');
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
        console.log('Intentando cargar logo desde:', logoUrl);

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

  private async crearEncabezado(doc: jsPDF, config: ExportConfig): Promise<number> {
    // Línea separadora en la parte inferior del encabezado
    doc.setFontSize(20);
    doc.text(this.facturaDetalle?.coFa_NombreEmpresa ?? 'Comercial la roca' , 10, 20);
    doc.setFontSize(10);

    // Cargar y agregar logo
    const logoDataUrl = await this.cargarLogo();
    if (this.facturaDetalle?.coFa_Logo) {
      try {
        doc.addImage(this.facturaDetalle?.coFa_Logo, 'PNG', 20, 5, 30, 25);
        console.log('Logo agregado al PDF correctamente');
      } catch (e) {
        console.error('Error al agregar imagen al PDF:', e);
      }
    }

    // Nombre de la empresa
    doc.setTextColor(this.COLORES.azulOscuro);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    const nombreEmpresa = this.configuracionEmpresa?.coFa_NombreEmpresa || 'Nombre de Empresa';
    const pageWidth = doc.internal.pageSize.width;
    doc.text(nombreEmpresa, pageWidth / 2, 15, { align: 'center' });

    // Título del reporte
    doc.setTextColor(this.COLORES.azulOscuro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(config.title, pageWidth / 2, 27, { align: 'center' });

    let yPos = 38;

    // Información adicional del reporte
    if (config.metadata) {
      doc.setTextColor(this.COLORES.grisTexto);
      doc.setFontSize(10);

      if (config.metadata.additionalInfo) {
        doc.text(config.metadata.additionalInfo, 20, yPos);
        yPos += 6;
      }

      yPos += 3; // Espacio adicional
    }

    return yPos;
  }

  private crearPiePagina(doc: jsPDF, data: any) {
    doc.setFontSize(8);
    doc.setTextColor(this.COLORES.grisTexto);

    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    const totalPages = doc.getNumberOfPages();

    // Información del usuario y fecha
    const usuarioCreacion = this.obtenerUsuarioActual();
    doc.text(`Generado por: ${usuarioCreacion} | ${fechaTexto} ${horaTexto}`, 20, doc.internal.pageSize.height - 12);

    // Paginación
    doc.text(`Página ${data.pageNumber}/${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 12, { align: 'right' });
  }

  private async crearTabla(doc: jsPDF, config: ExportConfig, startY: number) {
    // Preparar datos de la tabla
    const tableData = this.prepararDatosTabla(config);

    // Crear la tabla con la configuración correcta de tipos
    autoTable(doc, {
      startY: startY,
      head: [tableData.headers],
      body: tableData.rows,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak' as any,
        halign: 'left' as any,
        valign: 'middle' as any,
        lineColor: false,
        lineWidth: 0,
      },
      headStyles: {
        fillColor: this.hexToRgb(this.COLORES.azulOscuro),
        textColor: this.hexToRgb(this.COLORES.dorado),
        fontStyle: 'bold',
        fontSize: 9,
        lineColor: false,
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      tableLineColor: false,
      tableLineWidth: 0,
      margin: { left: 15, right: 15, bottom: 30 },
      tableWidth: 'auto' as any,
      showHead: 'everyPage' as any,
      pageBreak: 'auto' as any,
      didDrawPage: (data: any) => {
        this.crearPiePagina(doc, data);
      }
    });
  }

  private prepararDatosTabla(config: ExportConfig): { headers: string[], rows: any[][] } {
    const headers = config.columns.map(col => col.header);
    const rows = config.data.map(item =>
      config.columns.map(col => {
        const value = item[col.key];
        return this.formatearValor(value);
      })
    );

    return { headers, rows };
  }

  private formatearValor(valor: any): string {
    if (valor === null || valor === undefined) {
      return '';
    }

    return String(valor).trim();
  }

  private obtenerUsuarioActual(): string {
    // Intentar obtener el usuario del localStorage o usar un valor por defecto
    try {
      const usuario = localStorage.getItem('currentUser');
      if (usuario) {
        const userData = JSON.parse(usuario);
        return userData.usuarioCreacion || userData.usuarioCreacion || 'Usuario';
      }
    } catch (e) {
      console.error('Error obteniendo usuario:', e);
    }
    return 'Sistema';
  }

  private validateConfig(config: ExportConfig): void {
    if (!config.title) {
      throw new Error('El título del reporte es requerido');
    }

    if (!config.filename) {
      throw new Error('El nombre del archivo es requerido');
    }

    if (!Array.isArray(config.data) || config.data.length === 0) {
      throw new Error('Los datos para exportar son requeridos');
    }

    if (!Array.isArray(config.columns) || config.columns.length === 0) {
      throw new Error('Las columnas para exportar son requeridas');
    }
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

  // Método para recibir y almacenar la factura completa
  setFacturaCompleta(facturaCompleta: FacturaCompleta): void {
    this.facturaDetalle = facturaCompleta;
  }

  // Método para generar PDF de factura
  async generarFacturaPDF(): Promise<ExportResult> {
    if (!this.facturaDetalle) {
      return { success: false, message: 'No hay datos de factura para imprimir' };
    }

    try {
      const doc = new jsPDF('portrait');

      // Crear encabezado de factura
      const startY = await this.crearEncabezadoFactura(doc);

      // Crear tabla de productos
      const tableY = await this.crearTablaProductos(doc, startY);
      

      // Crear pie de factura con totales
      this.crearPieFactura(doc, tableY);

      const filename = this.generateFilename(`Factura_${this.facturaDetalle.fact_Numero}`, 'pdf');
      doc.save(filename);

      return { success: true, message: `Factura PDF generada: ${filename}` };

    } catch (error) {
      console.error('Error generando factura PDF:', error);
      return { success: false, message: 'Error al generar la factura PDF' };
    }
  }

  private async crearEncabezadoFactura(doc: jsPDF): Promise<number> {
    if (!this.facturaDetalle) return 40;

    let yPos = 38;
    let xPos = 40;

    // Cargar y agregar logo
    const logoDataUrl = await this.cargarLogo();
    if (this.facturaDetalle.coFa_Logo) {
      try {
        doc.addImage(this.facturaDetalle.coFa_Logo, 'PNG', 80, 5, 40, 30);
      } catch (e) {
        console.error('Error al agregar logo:', e);
      }
    }

    // Información de la empresa (lado izquierdo)
    doc.setTextColor(this.COLORES.azulOscuro);
    doc.setFont('Satoshi', 'bold');
    doc.setFontSize(16);
    doc.text(this.facturaDetalle.coFa_NombreEmpresa, 76, yPos + 8);

    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(10);
    //doc.text(`RTN: ${this.facturaDetalle.coFa_RTN}`, 74, yPos + 16);
    doc.text(this.facturaDetalle.coFa_DireccionEmpresa, 56, yPos + 16);
    doc.text(`Tel: ${this.facturaDetalle.coFa_Telefono1}`, 88, yPos + 22);
    doc.text(`Email: ${this.facturaDetalle.coFa_Correo}`, 76, yPos + 28);

    // Información de la factura (lado derecho)
    const pageWidth = doc.internal.pageSize.width;

    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(10);

    yPos -=6;

    doc.text(`No. ${this.facturaDetalle.fact_Numero}`, 54, yPos + 56);
    doc.text(`Fecha: ${this.formatearFecha(this.facturaDetalle.fact_FechaEmision)}`,   54, yPos + 62,);
    doc.text(`Tipo: ${this.facturaDetalle.fact_TipoVenta}`,  54, yPos + 68);
    doc.text(`CAI: ${this.facturaDetalle.regC_Descripcion}`,  54, yPos + 74);

    yPos += 45;

    // Línea separadora
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(1);
    doc.line(50, yPos, pageWidth - 58, yPos);
    yPos += 10;

    // Información del cliente
    yPos += 8;

    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(10);
    doc.text(`Cliente:`, 54, yPos + 18);
    doc.text(`${this.facturaDetalle.cliente}`, 94, yPos + 18);
    doc.text(`Dirección: ${this.facturaDetalle.diCl_DireccionExacta}`, 54, yPos + 24);
    doc.text(`Teléfono: ${this.facturaDetalle.clie_Telefono}`, 54, yPos + 30);

    // Información del vendedor (lado derecho)
    doc.setFont('Satoshi', 'normal');
    doc.text(this.facturaDetalle.vendedor,  54, yPos + 36);
    doc.text(`Tel: ${this.facturaDetalle.vend_Telefono}`,  54, yPos + 42);

    yPos += 50;

    // Línea separadora
    doc.line(50, yPos, pageWidth - 58, yPos);
    yPos += 18;

    return yPos;
  }

  private async crearTablaProductos(doc: jsPDF, startY: number) {
    if (!this.facturaDetalle || !this.facturaDetalle.detalleFactura.length) return;

    const headers = ['Descripción', 'Cant.', 'Precio.', 'Total'];
    const rows = this.facturaDetalle.detalleFactura.map(item => [
      item.prod_Descripcion,
      item.faDe_Cantidad.toString(),
      `L.${item.faDe_PrecioUnitario.toFixed(2)}`,
      `L.${item.faDe_Total.toFixed(2)}`
    ]);

    autoTable(doc, {
      startY: startY,
      head: [headers],
      body: rows,
      styles: {
        fontSize: 9,
        cellPadding: 1,
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
        1: { halign: 'left' as any, cellWidth: 'auto'  },   // Descripción
        2: { halign: 'right' as any, cellWidth: 'auto' }, // Cantidad
        3: { halign: 'right' as any, cellWidth: 'auto' },  // Precio
        4: { halign: 'right' as any, cellWidth: 'auto' }   // Total
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: 50, right: 10 },
      tableWidth: 100,
    });

      let finalY = (doc as any).lastAutoTable.finalY;

      return finalY;
  }

  private crearPieFactura(doc: jsPDF, yPos: number) {
    if (!this.facturaDetalle) return;

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    //let yPos = pageHeight - 80;
    yPos += 10;

    // Línea separadora
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(1);
    doc.line(50, yPos, pageWidth - 58, yPos);
    yPos += 10;

    // Totales (lado derecho)
    const rightX = pageWidth - 20;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text(`Subtotal: L. ${this.facturaDetalle.fact_Subtotal.toFixed(2)}`, rightX - 38, yPos, { align: 'right' });
    yPos += 6;
    doc.text(`Descuento: L. ${this.facturaDetalle.fact_TotalDescuento.toFixed(2)}`, rightX - 38, yPos, { align: 'right' });
    yPos += 6;
    doc.text(`Impuesto 15%: L. ${this.facturaDetalle.fact_TotalImpuesto15.toFixed(2)}`, rightX - 38, yPos, { align: 'right' });
    yPos += 6;
    doc.text(`Impuesto 18%: L. ${this.facturaDetalle.fact_TotalImpuesto18.toFixed(2)}`, rightX - 38, yPos, { align: 'right' });
    yPos += 8;

    // Total final
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`TOTAL: L. ${this.facturaDetalle.fact_Total.toFixed(2)}`, rightX - 38, yPos, { align: 'right' });

    // Información adicional (lado izquierdo)
    yPos = pageHeight - 70;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Rango autorizado: ${this.facturaDetalle.fact_RangoInicialAutorizado} - ${this.facturaDetalle.fact_RangoFinalAutorizado}`, 50, yPos);
    yPos += 5;
    doc.text(`Fecha límite emisión: ${this.formatearFecha(this.facturaDetalle.fact_FechaLimiteEmision)}`, 50, yPos);
    yPos += 5;
    if (this.facturaDetalle.fact_Referencia) {
      doc.text(`Referencia: ${this.facturaDetalle.fact_Referencia}`, 50, yPos);
      yPos += 5;
    }
    if (this.facturaDetalle.fact_AutorizadoPor) {
      doc.text(`Autorizado por: ${this.facturaDetalle.fact_AutorizadoPor}`, 50, yPos);
    }
  }

  private formatearFecha(fecha: Date | string): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }
}
