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

      // Crear tabla de productos y obtener la posición final
      const finalY = await this.crearTablaProductos(doc, startY);

      // Crear pie de factura con totales usando la posición final de la tabla
      this.crearPieFactura(doc, finalY);

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

    const pageWidth = doc.internal.pageSize.width;
    let yPos = 15;

    // Logo de la empresa (lado izquierdo)
    if (this.facturaDetalle.coFa_Logo) {
      try {
        doc.addImage(this.facturaDetalle.coFa_Logo, 'PNG', 15, 35, 35, 25);
      } catch (e) {
        console.error('Error al agregar logo:', e);
      }
    }

    // Título "FACTURA COMERCIAL" (centrado)
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('FACTURA', pageWidth / 2, yPos + 5, { align: 'center' });

    const midX = pageWidth / 2 + 20;

    // Información de la factura (lado derecho)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const rightX = pageWidth - 15;
    
    doc.text('Fecha:', rightX - 70, yPos + 5 +24);
    doc.text(this.formatearFecha(this.facturaDetalle.fact_FechaEmision), rightX - 58, yPos + 5 +24);
    
    doc.text('No. Factura:', rightX - 70, yPos + 12 +24);
    doc.text(this.facturaDetalle.fact_Numero || '000-010-01-00051175', rightX - 50, yPos + 12 +24);
    

    yPos += 60;

    // Información de la empresa (lado izquierdo)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(this.facturaDetalle.coFa_NombreEmpresa, 15, yPos);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    yPos += 6;
    doc.text(`RTN: ${this.facturaDetalle.coFa_RTN || '05019010545693'}`, 15, yPos);
    yPos += 5;
    doc.text(this.facturaDetalle.coFa_DireccionEmpresa || 'Colonia Bogran, 9 Calle N.E', 15, yPos);
    yPos += 5;
    doc.text('San Pedro Sula, Cortés, Honduras, C.A.', 15, yPos);
    yPos += 5;
    doc.text(`Teléfono: ${this.facturaDetalle.coFa_Telefono1 || '2551-2011'} / Fax: ${this.facturaDetalle.coFa_Telefono2 || '2551-2771'}`, 15, yPos);
    yPos += 5;
    doc.text(`${this.facturaDetalle.coFa_Correo }`, 15, yPos);

    // Información adicional (lado derecho)
    yPos -= 45;
    
    doc.text('CAI:', midX, yPos);
    doc.text(this.facturaDetalle.regC_Descripcion, midX + 10, yPos);
    yPos += 6;
    doc.text('Vendedor:', midX, yPos);
    doc.text(this.facturaDetalle.vendedor, midX + 15, yPos);
    yPos += 6;

    yPos += 40;

    // Información del cliente
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    doc.text('Nombre del Cliente:', 15, yPos);
    doc.text(this.facturaDetalle.cliente, 48, yPos);
    yPos += 6;
    
    doc.text('RTN:', 15, yPos);
    doc.text(this.facturaDetalle.clie_RTN, 25, yPos);
    yPos += 6;
    
    doc.text('Dirección de Entrega:', 15, yPos);
    doc.text(this.facturaDetalle.diCl_DireccionExacta, 50, yPos);

    yPos += 30;

    return yPos;
  }

  private async crearTablaProductos(doc: jsPDF, startY: number): Promise<number> {
    if (!this.facturaDetalle || !this.facturaDetalle.detalleFactura.length) return startY;

    const headers = ['Código', 'Descripción', 'Cantidad', 'Precio', 'Total'];
    const rows = this.facturaDetalle.detalleFactura.map(item => [
      item.prod_CodigoBarra || item.prod_Id.toString(),
      item.prod_Descripcion,
      item.faDe_Cantidad.toString(),
      `L${item.faDe_PrecioUnitario.toFixed(2)}`,
      `L${(item.faDe_Cantidad*item.faDe_PrecioUnitario).toFixed(2)}`
    ]);

    // Variable para capturar la posición final de la tabla
    let finalTableY = startY;

    autoTable(doc, {
      startY: startY,
      head: [headers],
      body: rows,
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak' as any,
        halign: 'center' as any,
        valign: 'middle' as any,
        lineColor: [0, 0, 0],
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: [255, 255, 255],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        fontSize: 9,
        lineColor: [0, 0, 0],
        lineWidth: 0.5,
      },
      columnStyles: {
        0: { halign: 'center' as any, cellWidth: 25 },  // Código
        1: { halign: 'left' as any, cellWidth: 80 },    // Descripción
        2: { halign: 'center' as any, cellWidth: 20 },  // Cantidad
        3: { halign: 'right' as any, cellWidth: 25 },   // Precio
        4: { halign: 'right' as any, cellWidth: 25 }    // Total
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto' as any,
      theme: 'grid' as any,
      didDrawPage: (data: any) => {
        // Capturar la posición final Y de la tabla en cada página
        finalTableY = data.cursor.y;
      }
    });

    // Retornar la posición final donde terminó la tabla
    return finalTableY + 10; // Agregar un pequeño margen después de la tabla
  }

  private crearPieFactura(doc: jsPDF, startY?: number) {
    if (!this.facturaDetalle) return;

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    // Usar startY si se proporciona, de lo contrario usar posición fija desde abajo
    let yPos = startY || pageHeight - 120;
    
    // Verificar si hay espacio suficiente en la página actual
    const espacioNecesario = 100; // Espacio aproximado que necesita el pie de factura
    if (yPos + espacioNecesario > pageHeight - 20) {
      // Si no hay espacio suficiente, crear nueva página
      doc.addPage();
      yPos = 20; // Empezar desde arriba en la nueva página
    }

    // Sección de totales (lado derecho)
    const rightX = pageWidth - 15;
    const labelX = pageWidth - 80;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Cantidad total de productos
    const cantidadTotal = this.facturaDetalle.detalleFactura.reduce((sum, item) => sum + item.faDe_Cantidad, 0);
    doc.text('Cant Total:', labelX, yPos);
    doc.text(cantidadTotal.toString(), rightX, yPos, { align: 'right' });
    yPos += 8;

    // Descuentos y Rebajas
    doc.text('Descuentos y Rebajas:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_TotalDescuento.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // Exento
    doc.text('Exento:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_ImporteExento.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // Exonerado
    doc.text('Exonerado:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_ImporteExonerado.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // Gravado 15%
    doc.text('Gravado 15%:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_ImporteGravado15.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // Gravado 18%
    doc.text('Gravado 18%:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_ImporteGravado18.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // Subtotal
    doc.text('Subtotal:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_Subtotal.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // ISV 15%
    doc.text('15% ISV:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_TotalImpuesto15.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 8;

    // ISV 18%
    doc.text('18% ISV:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_TotalImpuesto18.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 10;

    // Gran Total
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Gran Total:', labelX, yPos);
    doc.text(`L${this.facturaDetalle.fact_Total.toFixed(2)}`, rightX, yPos, { align: 'right' });
    yPos += 15;

    // Información legal en la parte inferior
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    // Importe en letras
    const importeEnLetras = this.numeroALetras(this.facturaDetalle.fact_Total);
    doc.text(importeEnLetras, 15, yPos);
    yPos += 8;
    
    // Fecha límite y rango autorizado
    doc.text(`Fecha Límite ${this.formatearFecha(this.facturaDetalle.fact_FechaLimiteEmision)}`, 15, yPos);
    yPos += 8;
    
    // Fecha de impresión
    const fechaImpresion = new Date().toLocaleDateString('es-HN');
    doc.text(`Impreso en: ${fechaImpresion}`, 15, yPos);
    doc.text('Página 1 de 1', rightX, yPos, { align: 'right' });
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

  private numeroALetras(numero: number): string {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (numero === 0) return 'cero lempiras con 00 centavos';

    let entero = Math.floor(numero);
    const decimales = Math.round((numero - entero) * 100);

    let resultado = '';

    // Convertir parte entera
    if (entero >= 1000000) {
      const millones = Math.floor(entero / 1000000);
      resultado += this.convertirGrupo(millones) + (millones === 1 ? ' millón ' : ' millones ');
      entero %= 1000000;
    }

    if (entero >= 1000) {
      const miles = Math.floor(entero / 1000);
      if (miles === 1) {
        resultado += 'mil ';
      } else {
        resultado += this.convertirGrupo(miles) + ' mil ';
      }
      entero %= 1000;
    }

    if (entero > 0) {
      resultado += this.convertirGrupo(entero);
    }

    // Capitalizar primera letra
    resultado = resultado.trim();
    if (resultado) {
      resultado = resultado.charAt(0).toUpperCase() + resultado.slice(1);
    }

    // Agregar moneda y centavos
    const centavosStr = decimales.toString().padStart(2, '0');
    return `${resultado} lempiras con ${centavosStr} centavos`;
  }

  private convertirGrupo(numero: number): string {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    let resultado = '';

    const c = Math.floor(numero / 100);
    const d = Math.floor((numero % 100) / 10);
    const u = numero % 10;

    // Centenas
    if (c > 0) {
      if (numero === 100) {
        resultado += 'cien';
      } else {
        resultado += centenas[c];
      }
    }

    // Decenas y unidades
    if (d === 1) {
      resultado += (resultado ? ' ' : '') + especiales[u];
    } else {
      if (d > 0) {
        resultado += (resultado ? ' ' : '') + decenas[d];
      }
      if (u > 0) {
        if (d === 2) {
          resultado = resultado.replace('veinte', 'veinti') + unidades[u];
        } else {
          resultado += (resultado && d > 0 ? ' y ' : (resultado ? ' ' : '')) + unidades[u];
        }
      }
    }

    return resultado;
  }
}