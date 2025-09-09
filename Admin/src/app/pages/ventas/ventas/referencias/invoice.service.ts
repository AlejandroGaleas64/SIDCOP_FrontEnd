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
      const doc = new jsPDF('p', 'mm', 'a4');
 
      // Crear encabezado de factura (primera página)
      const startY = await this.crearEncabezadoFactura(doc);

      // Crear tabla de productos con paginación automática
      // El pie de página estático se agrega en cada página dentro del método crearTablaProductos
      const tableY = await this.crearTablaProductos(doc, startY);
      
      // Crear pie de factura con totales (solo en la última página)
      // El pie de página con totales se agrega después de la tabla
      this.crearPieFactura(doc, tableY);
      
      // Agregar numeración de páginas en todas las páginas
      this.agregarNumeracionPaginas(doc);

      const filename = this.generateFilename(`Factura_${this.facturaDetalle?.fact_Numero || 'SinNumero'}`, 'pdf');
      doc.save(filename);

      return { success: true, message: `Factura PDF generada: ${filename}` };

    } catch (error) {
      console.error('Error generando factura PDF:', error);
      return { success: false, message: 'Error al generar la factura PDF' };
    }
  }
  
  // Método para agregar numeración de páginas en todas las páginas
  private agregarNumeracionPaginas(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(this.COLORES.grisTexto);
      
      // Información de generación en la parte inferior izquierda
      doc.text(`Generado: ${fechaTexto} ${horaTexto}`, 20, doc.internal.pageSize.height - 10);
      
      // Numeración de página en la parte inferior derecha
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
    }
  }

  private async crearEncabezadoFactura(doc: jsPDF): Promise<number> {
    if (!this.facturaDetalle) return 30;

    let yPos = 34; // Reducido de 38 a 25 para subir todo el contenido
    const pageWidth = doc.internal.pageSize.width;
    const centerX = pageWidth / 2;

    // Cargar y agregar logo
    const logoDataUrl = await this.cargarLogo();
    if (this.facturaDetalle.coFa_Logo) {
      try {
        doc.addImage(this.facturaDetalle.coFa_Logo, 'PNG', centerX - 20, 2, 40, 25); // Ajustado Y de 5 a 2
      } catch (e) {
        console.error('Error al agregar logo:', e);
      }
    }

    
    // Información de la empresa (centrada)

    doc.setTextColor(this.COLORES.azulOscuro);
    doc.setFont('Satoshi', 'bold');
    doc.setFontSize(14);
    doc.text(this.facturaDetalle.coFa_NombreEmpresa, centerX - 80, yPos + 5); // Reducido de +8 a +5

    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(9);
    
    // RTN de la empresa (si existe)
    if (this.facturaDetalle.coFa_RTN) {
      doc.text(`RTN: ${this.facturaDetalle.coFa_RTN}`, centerX - 80, yPos + 8);
      //yPos += 5; // Agregar espacio adicional si se muestra el RTN
    }
    
    doc.text(this.facturaDetalle.coFa_DireccionEmpresa, centerX - 80, yPos + 12); // Reducido de +16 a +12
    
    // Teléfonos de la empresa (mostrar ambos si existen)
    let telefonoEmpresaTexto = `Tel: ${this.facturaDetalle.coFa_Telefono1}`;
    if (this.facturaDetalle.coFa_Telefono2 && this.facturaDetalle.coFa_Telefono2.trim() !== '') {
      telefonoEmpresaTexto += ` / ${this.facturaDetalle.coFa_Telefono2}`;
    }
    doc.text(telefonoEmpresaTexto, centerX-80, yPos + 16);
    
    // Email
    doc.text(`Email: ${this.facturaDetalle.coFa_Correo}`, centerX-80, yPos + 20);

    // Información de la factura (centrada)
    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(10);

    //yPos; // Reducido de 30 a 25

    // Número de factura
    doc.setTextColor(this.COLORES.azulOscuro);
    doc.setFont('Satoshi', 'bold');
    doc.setFontSize(16);
    doc.text(`Factura Comercial`, centerX+25, yPos-16, );
    //doc.setFontSize(12);
    doc.text(`No. ${this.facturaDetalle.fact_Numero}`, centerX+15, yPos-10, );
    
    // Fecha de emisión
    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(9);

   //rango autorizado
    const rangoInicial = this.formatearRangoAutorizado(this.facturaDetalle.fact_RangoInicialAutorizado, this.facturaDetalle.fact_Numero);
    const rangoFinal = this.formatearRangoAutorizado(this.facturaDetalle.fact_RangoFinalAutorizado, this.facturaDetalle.fact_Numero);

    doc.text(`Rango Autorizado ${rangoInicial} - ${rangoFinal}`, centerX+15, yPos, );

    //fecha limite
    doc.text(`Fecha límite de emisión: ${this.formatearFecha(this.facturaDetalle.fact_FechaLimiteEmision)}`, centerX+15, yPos+4,); 
    
    //fecha 
    doc.text(`Fecha: ${this.formatearFecha(this.facturaDetalle.fact_FechaEmision)}`, centerX+15, yPos+8, );
    
    // Tipo de venta con formato condicional
    const tipoVenta = this.formatearTipoVenta(this.facturaDetalle.fact_TipoVenta);
    doc.text(`Tipo: ${tipoVenta}`, centerX+15, yPos+12, );
    
    // CAI
    doc.text(`CAI: ${this.facturaDetalle.regC_Descripcion}`, centerX+15, yPos + 16, );
    
    // Sucursal (si existe)
    if (this.facturaDetalle.sucu_Descripcion) {
      //yPos += 5; // Agregar espacio adicional
      doc.text(`Sucursal: ${this.facturaDetalle.sucu_Descripcion}`, centerX+15, yPos + 20, );
    }

    yPos += 22; // Reducido de 45 a 30

    // Línea separadora
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(1);
    doc.line(25, yPos, pageWidth - 20, yPos);
    yPos += 5; // Reducido de 10 a 5

    // Información del cliente
    yPos += 1; // Reducido de 2 a 1

    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(10);
    
    // Cliente
    doc.setFont('Satoshi', 'normal');
    doc.text(`Cliente: ${this.facturaDetalle.cliente}`, centerX -80, yPos);
    
    // RTN del cliente (si existe)
    if (this.facturaDetalle.clie_RTN && this.facturaDetalle.clie_RTN.trim() !== '') {
      doc.setFont('Satoshi', 'normal');
      doc.text(`RTN: ${this.facturaDetalle.clie_RTN}`, centerX -80, yPos + 4);
    }
    
    // Dirección
    doc.setFont('Satoshi', 'normal');
    doc.text(`Dirección: ${this.facturaDetalle.diCl_DireccionExacta}`, centerX -80, yPos + 8);
    
    // Teléfono
    doc.setFont('Satoshi', 'normal');
    doc.text(`Teléfono: ${this.facturaDetalle.clie_Telefono}`, centerX +15 , yPos);

    // Información del vendedor
    doc.setFont('Satoshi', 'normal');
    doc.text(`Vendedor: ${this.facturaDetalle.vendedor}`, centerX +15 , yPos + 4);
    
    doc.text(`Teléfono: ${this.facturaDetalle.vend_Telefono}`, centerX +15, yPos + 8);

    yPos += 35; // Reducido de 50 a 35

    // Línea separadora
    //doc.line(15, yPos, pageWidth - 15, yPos);
    yPos += 5; // Reducido de 10 a 5 para disminuir el espacio entre la línea y la tabla

    return yPos;
  }

  private async crearTablaProductos(doc: jsPDF, startY: number) {
    if (!this.facturaDetalle || !this.facturaDetalle.detalleFactura.length) return startY;

    const headers = ['Descripción', 'Cant.', 'Precio.','Desc.','ISV.','Total'];
    const rows = this.facturaDetalle.detalleFactura.map(item => {
      // Agregar un asterisco (*) al nombre del producto si tiene impuesto
      const tieneImpuesto = item.prod_PagaImpuesto === 'S';
      const descripcion = tieneImpuesto ? `${item.prod_Descripcion} *` : item.prod_Descripcion;
      
      return [
        descripcion,
        item.faDe_Cantidad.toString(),
        `L.${item.faDe_PrecioUnitario.toFixed(2)}`,
        `L.${item.faDe_Descuento.toFixed(2)}`,
        `L.${item.faDe_Impuesto.toFixed(2)}`,
        `L.${item.faDe_Subtotal.toFixed(2)}`
      ];
    });

    // Configurar la tabla con paginación automática
    autoTable(doc, {
      startY: startY-24,
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
        0: { halign: 'left' as any, cellWidth: 50 },   // Descripción
        1: { halign: 'right' as any, cellWidth: 15 },   // Cantidad
        2: { halign: 'right' as any, cellWidth: 25 },   // Precio
        3: { halign: 'right' as any, cellWidth: 25 },   // Descuento
        4: { halign: 'right' as any, cellWidth: 25 },   // ISV
        5: { halign: 'right' as any, cellWidth: 25 }    // Total
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      tableWidth: 'auto',
      pageBreak: 'auto' as any,
      showHead: 'everyPage' as any,
      margin: { top: 40, bottom: 60, left: 25, right: 58 },
      didDrawPage: (data) => {
        // Agregar encabezado en páginas adicionales
        if (data.pageNumber > 1 && this.facturaDetalle) {
          // Reiniciar los estilos de texto para el encabezado
          doc.setFont('Satoshi', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(this.COLORES.azulOscuro);
          
          const pageWidth = doc.internal.pageSize.width;
          const centerX = pageWidth / 2;
          
          // Usar operador de encadenamiento opcional para evitar errores de null
          const nombreEmpresa = this.facturaDetalle?.coFa_NombreEmpresa || 'Factura';
          const numeroFactura = this.facturaDetalle?.fact_Numero || '';
          
          doc.text(nombreEmpresa, centerX, 20, { align: 'center' });
          doc.setFont('Satoshi', 'normal');
          doc.text(`Factura No. ${numeroFactura} (Continuación)`, centerX, 30, { align: 'center' });
          
          // Línea separadora
          doc.setDrawColor(this.COLORES.dorado);
          doc.setLineWidth(1);
          doc.line(15, 35, pageWidth - 15, 35);
        }
        
        // Pie de página estático (en todas las páginas)
        if (this.facturaDetalle) {
          const pageWidth = doc.internal.pageSize.width;
          const pageHeight = doc.internal.pageSize.height;
          const centerX = pageWidth / 2;
          const pieHeight = 40; // Altura reservada para el pie de página
          
          // Línea separadora para el pie de página
          doc.setDrawColor(this.COLORES.dorado);
          doc.setLineWidth(1);
          doc.line(15+5, pageHeight - pieHeight, pageWidth - 15-5, pageHeight - pieHeight);
          
          
          // Información del pie de página
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(this.COLORES.grisTexto);
          
          // Texto del pie de página
          doc.text('Gracias por su compra', centerX, pageHeight - pieHeight + 10, { align: 'center' });
          doc.text('Conserve su factura para cualquier reclamo', centerX, pageHeight - pieHeight + 15, { align: 'center' });
          
        }
      },
    });

    let finalY = (doc as any).lastAutoTable.finalY;
    
    // Agregar nota explicativa sobre el asterisco en la última página
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(this.COLORES.grisTexto);
    doc.text('* Producto gravado con impuesto', 25, finalY + 5);
    
    // Actualizar la posición final
    finalY += 8;
    
    return finalY;
  }

  private crearPieFactura(doc: jsPDF, yPos: number) {
    if (!this.facturaDetalle) return;

    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    yPos += 80; // Espacio entre la tabla y el pie

    // Línea separadora
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(1);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 4;

    // Totales (alineados a la derecha)
    const valueX = pageWidth - 38; // Posición para los valores monetarios (ajustado para no sobrepasar el borde)
    const labelX = pageWidth - 100; // Posición para las etiquetas (ajustado para mejor alineación)
    
    // Establecer estilo para totales
    doc.setFont('Satoshi', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(this.COLORES.azulOscuro);

    
    // Subtotal
    doc.text('Subtotal:', labelX, yPos, );
    doc.text(`L. ${this.facturaDetalle.fact_Subtotal.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Descuento
    doc.text('Descuento:', labelX, yPos, );
    doc.text(`L. ${this.facturaDetalle.fact_TotalDescuento.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Importe Exento (siempre mostrar)
    doc.text('Importe Exento:', labelX, yPos, );
    const importeExento = this.facturaDetalle.fact_ImporteExento || 0;
    doc.text(`L. ${importeExento.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Importe Gravado 15% (siempre mostrar)
    doc.text('Importe Gravado 15%:', labelX, yPos, );
    const importeGravado15 = this.facturaDetalle.fact_ImporteGravado15 || 0;
    doc.text(`L. ${importeGravado15.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Importe Gravado 18% (siempre mostrar)
    doc.text('Importe Gravado 18%:', labelX, yPos, );
    const importeGravado18 = this.facturaDetalle.fact_ImporteGravado18 || 0;
    doc.text(`L. ${importeGravado18.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Importe Exonerado (siempre mostrar)
    doc.text('Importe Exonerado:', labelX, yPos, );
    const importeExonerado = this.facturaDetalle.fact_ImporteExonerado || 0;
    doc.text(`L. ${importeExonerado.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Impuesto 15% (siempre mostrar)
    doc.text('Impuesto 15%:', labelX, yPos, );
    doc.text(`L. ${this.facturaDetalle.fact_TotalImpuesto15.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Impuesto 18% (siempre mostrar)
    doc.text('Impuesto 18%:', labelX, yPos, );
    doc.text(`L. ${this.facturaDetalle.fact_TotalImpuesto18.toFixed(2)}`, valueX, yPos, );
    yPos += 5;
    
    // Espacio antes del total final
    yPos += 3;
    
    // Total final
    doc.setFont('Satoshi', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', labelX, yPos, );
    doc.text(`L. ${this.facturaDetalle.fact_Total.toFixed(2)}`, valueX, yPos, );
    
    // Agregar espacio antes de la información adicional
    yPos += 15;
    
    // Información adicional
    // Definimos una nueva posición para las etiquetas de la información adicional
    const infoLabelX = pageWidth - 120; // Posición para etiquetas de información adicional
    
    // Autorizado por (alineado como los totales)
    if (this.facturaDetalle.fact_AutorizadoPor) {
      doc.setFont('helvetica', 'bold');
      doc.text('Autorizado por:', infoLabelX, yPos, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`${this.facturaDetalle.fact_AutorizadoPor}`, valueX, yPos, { align: 'right' });
    }
    
    // La numeración de páginas se manejará en el método generarFacturaPDF
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

  /**
   * Formatea un rango autorizado añadiendo el prefijo del número de factura
   * y asegurando que tenga 8 dígitos al final
   * @param rangoNumerico Número del rango (ej: "2000")
   * @param numeroFactura Número de factura completo (ej: "111-004-01-00002121")
   * @returns Rango formateado (ej: "111-004-01-00002000")
   */
  private formatearRangoAutorizado(rangoNumerico: string, numeroFactura: string): string {
    if (!rangoNumerico || !numeroFactura) return rangoNumerico || '';
    
    // Extraer el prefijo del número de factura (ej: "111-004-01-")
    const prefijo = numeroFactura.match(/^(\d{3}-\d{3}-\d{2}-)/)?.[0];
    if (!prefijo) return rangoNumerico;
    
    // Asegurar que el número tenga 8 dígitos
    const numeroFormateado = rangoNumerico.padStart(8, '0');
    
    return `${prefijo}${numeroFormateado}`;
  }
  
  /**
   * Convierte el código de tipo de venta a su formato legible
   * @param tipo Código del tipo de venta ('co' para Contado, 'cr' para Crédito)
   * @returns Texto formateado del tipo de venta
   */
  private formatearTipoVenta(tipo: string): string {
    if (!tipo) return 'N/A';
    
    // Convertir a minúsculas para comparación
    const tipoLower = tipo.toLowerCase().trim();
    
    switch (tipoLower) {
      case 'co':
        return 'Contado';
      case 'cr':
        return 'Crédito';
      default:
        return tipo; // Devolver el valor original si no coincide
    }
  }
}
