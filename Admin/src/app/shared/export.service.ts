import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { obtenerUsuario } from 'src/app/core/utils/user-utils'; // Cambiado a obtenerUsuario
import * as XLSX from 'xlsx';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

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
export class ExportService {
  private configuracionEmpresa: any = null;
  private logoDataUrl: string | null = null; // Precargar el logo una sola vez

  // Colores del tema (mismos del PdfReportService)
  private readonly COLORES = {
    dorado: '#D6B68A',
    azulOscuro: '#141a2f',
    blanco: '#FFFFFF',
    grisClaro: '#F8F9FA',
    grisTexto: '#666666'
  };

  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) {
    this.cargarConfiguracionEmpresa();
  }

  // ===== MÉTODOS PÚBLICOS DE EXPORTACIÓN =====

  async exportToExcel(config: ExportConfig): Promise<ExportResult> {
    try {
      this.validateConfig(config);
      
      // Crear un nuevo workbook
      const workbook = XLSX.utils.book_new();
      
      // Crear los datos de la hoja de cálculo
      const worksheetData = await this.prepararDatosExcel(config);
      
      // Crear la hoja de trabajo
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Aplicar estilos y configuración
      this.aplicarEstilosExcel(worksheet, config);
      
      // Agregar la hoja al workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Datos');
      
      // Generar el archivo
      const filename = this.generateFilename(config.filename, 'xlsx');
      XLSX.writeFile(workbook, filename);
      
      return { success: true, message: `Archivo Excel exportado: ${filename}` };
      
    } catch (error) {
      console.error('Error exportando Excel:', error);
      return { success: false, message: 'Error al exportar archivo Excel' };
    }
  }

  async exportToPDF(config: ExportConfig): Promise<ExportResult> { 
    try {
      this.validateConfig(config);
      
      const doc = new jsPDF('portrait');
      
      // Asegurar que el logo esté cargado antes de generar el PDF
      if (this.configuracionEmpresa?.coFa_Logo && !this.logoDataUrl) {
        console.log('🖼️ Iniciando carga de logo para PDF...');
        await this.precargarLogo();
      }

      // Crear encabezado inicial
      this.crearEncabezadoPorPagina(doc, config);

      // Configuración de la tabla con callback para encabezados en nuevas páginas
      const tableData = this.prepararDatosTabla(config);
      
      // Crear la tabla comenzando después del encabezado
      autoTable(doc, {
        startY: 45, // Posición fija después del encabezado
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
        margin: { left: 15, right: 15, bottom: 30, top: 45 }, // top: 45 para dar espacio al encabezado
        tableWidth: 'auto' as any,
        showHead: 'everyPage' as any,
        pageBreak: 'auto' as any,
        didDrawPage: (data: any) => {
          // Si no es la primera página, crear el encabezado
          if (data.pageNumber > 1) {
            this.crearEncabezadoPorPagina(doc, config);
          }
        }
      });

      const totalPages = doc.getNumberOfPages();

      // Recorrer todas las páginas para añadir la numeración correcta
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        doc.setPage(pageNum);
        this.crearPiePaginaConTotal(doc, pageNum, totalPages, config.data);
      }
      
      const filename = this.generateFilename(config.filename, 'pdf');
      doc.save(filename);
      
      return { success: true, message: `Archivo PDF exportado: ${filename}` };
      
    } catch (error) {
      console.error('Error exportando PDF:', error);
      return { success: false, message: 'Error al exportar archivo PDF' };
    }
  }

  async exportToCSV(config: ExportConfig): Promise<ExportResult> {
    try {
      this.validateConfig(config);
      
      // Preparar los datos CSV
      const csvContent = this.generarContenidoCSV(config);
      
      // Crear y descargar el archivo
      const filename = this.generateFilename(config.filename, 'csv');
      this.descargarArchivo(csvContent, filename, 'text/csv');
      
      return { success: true, message: `Archivo CSV exportado: ${filename}` };
      
    } catch (error) {
      console.error('Error exportando CSV:', error);
      return { success: false, message: 'Error al exportar archivo CSV' };
    }
  }

  // ===== MÉTODOS PRIVADOS PARA EXCEL =====

  private async prepararDatosExcel(config: ExportConfig): Promise<any[][]> {
    const data: any[][] = [];
    let currentRow = 0;
    
    // Espacios para el logo y título
    data[currentRow++] = [];
    data[currentRow++] = [];
    data[currentRow++] = [];
    
    // Título de la empresa centrado
    const nombreEmpresa = this.configuracionEmpresa?.coFa_NombreEmpresa || 'Nombre de Empresa';
    data[currentRow++] = [nombreEmpresa];
    
    // Título del reporte
    data[currentRow++] = [config.title];
    
    // Espacios
    data[currentRow++] = [];
    
    // Metadata si existe
    if (config.metadata) {
      if (config.metadata.department) {
        data[currentRow++] = [`Departamento: ${config.metadata.department}`];
      }
      
      if (config.metadata.user) {
        data[currentRow++] = [`Usuario: ${config.metadata.user}`];
      }
      
      if (config.metadata.additionalInfo) {
        data[currentRow++] = [config.metadata.additionalInfo];
      }
      
      data[currentRow++] = []; // Espacio adicional
    }
    
    // Encabezados de la tabla
    const headers = config.columns.map(col => col.header);
    data[currentRow++] = headers;
    
    // Datos de la tabla
    config.data.forEach(item => {
      const row = config.columns.map(col => {
        const value = item[col.key];
        return this.formatearValorExcel(value);
      });
      data[currentRow++] = row;
    });
    
    // Pie de página
    data[currentRow++] = [];
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    const usuarioActual = obtenerUsuario() || 'Sistema'; // Usando obtenerUsuario
    data[currentRow++] = [`Generado por: ${usuarioActual} | ${fechaTexto} ${horaTexto}`];
    
    return data;
  }

  private aplicarEstilosExcel(worksheet: XLSX.WorkSheet, config: ExportConfig): void {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    
    // Configurar anchos de columna
    const colWidths = config.columns.map(col => ({
      wch: col.width ? col.width / 5 : 15 // Convertir aproximado de puntos a caracteres
    }));
    worksheet['!cols'] = colWidths;
    
    // Encontrar la fila de encabezados (buscar la primera fila que contenga todos los headers)
    let headerRow = -1;
    const headers = config.columns.map(col => col.header);
    
    for (let row = 0; row <= range.e.r; row++) {
      let matchCount = 0;
      for (let col = 0; col < headers.length; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        if (cell && cell.v === headers[col]) {
          matchCount++;
        }
      }
      if (matchCount === headers.length) {
        headerRow = row;
        break;
      }
    }
    
    // Aplicar estilos a las celdas
    for (let row = 0; row <= range.e.r; row++) {
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];
        
        if (cell) {
          // Inicializar el objeto de estilo si no existe
          if (!cell.s) cell.s = {};
          
          // Estilos para el título de la empresa (fila 3, índice 3)
          if (row === 3) {
            cell.s = {
              font: { bold: true, sz: 18, color: { rgb: '141a2f' } },
              alignment: { horizontal: 'center' }
            };
          }
          // Estilos para el título del reporte (fila 4, índice 4)
          else if (row === 4) {
            cell.s = {
              font: { bold: true, sz: 14, color: { rgb: '141a2f' } },
              alignment: { horizontal: 'center' }
            };
          }
          // Estilos para los encabezados de la tabla
          else if (row === headerRow) {
            cell.s = {
              font: { bold: true, color: { rgb: 'D6B68A' } },
              fill: { fgColor: { rgb: '141a2f' } },
              alignment: { horizontal: 'center' }
            };
          }
          // Estilos para las filas de datos (alternadas)
          else if (row > headerRow && row < range.e.r - 1) {
            const isEvenRow = (row - headerRow) % 2 === 0;
            cell.s = {
              fill: isEvenRow ? { fgColor: { rgb: 'F8F9FA' } } : { fgColor: { rgb: 'FFFFFF' } },
              alignment: { 
                horizontal: config.columns[col]?.align || 'left',
                vertical: 'center'
              }
            };
          }
        }
      }
    }
    
    // Ajustar el rango de impresión
    worksheet['!printHeader'] = `1:${headerRow + 1}`;
  }

  private formatearValorExcel(valor: any): any {
    if (valor === null || valor === undefined) {
      return '';
    }
    
    // Si es un número, mantenerlo como número para Excel
    if (typeof valor === 'number') {
      return valor;
    }
    
    // Si es una fecha, convertirla apropiadamente
    if (valor instanceof Date) {
      return valor;
    }
    
    // Para todo lo demás, convertir a string y limpiar
    return String(valor).trim();
  }

  // ===== MÉTODOS PRIVADOS PARA CSV =====

  private generarContenidoCSV(config: ExportConfig): string {
    const rows: string[] = [];
    
    // Encabezados
    const headers = config.columns.map(col => this.escaparCSV(col.header));
    rows.push(headers.join(','));
    
    // Datos
    config.data.forEach(item => {
      const row = config.columns.map(col => {
        const value = item[col.key];
        return this.escaparCSV(this.formatearValorCSV(value));
      });
      rows.push(row.join(','));
    });
    
    return rows.join('\n');
  }

  private formatearValorCSV(valor: any): string {
    if (valor === null || valor === undefined) {
      return '';
    }
    
    return String(valor).trim();
  }

  private escaparCSV(valor: string): string {
    if (!valor) return '';
    
    // Si el valor contiene coma, comillas o salto de línea, debe estar entre comillas
    if (valor.includes(',') || valor.includes('"') || valor.includes('\n')) {
      // Escapar las comillas duplicándolas
      const valorEscapado = valor.replace(/"/g, '""');
      return `"${valorEscapado}"`;
    }
    
    return valor;
  }

  private descargarArchivo(contenido: string, nombreArchivo: string, tipoMime: string): void {
    const blob = new Blob([contenido], { type: tipoMime + ';charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', nombreArchivo);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  // ===== MÉTODOS PRIVADOS PARA PDF (basados en PdfReportService) =====

  private cargarConfiguracionEmpresa() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/ConfiguracionFactura/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.configuracionEmpresa = data[0];
          // Precargar el logo una sola vez
          this.precargarLogo();
        }
      },
      error: (error) => {
        console.error('Error al cargar configuración de empresa:', error);
      }
    });
  }

  private async precargarLogo(): Promise<void> {
    if (!this.configuracionEmpresa?.coFa_Logo) {
      console.log('No hay logo configurado');
      this.logoDataUrl = null;
      return;
    }

    this.logoDataUrl = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          // Usar un contexto 2d con configuración de alta calidad
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            console.error('No se pudo obtener el contexto del canvas');
            resolve(null);
            return;
          }
          
          // Aumentar las dimensiones máximas para mejor calidad
          const maxWidth = 200; // Increased for better quality
          const maxHeight = 100; // Increased for better quality
          let { width, height } = img;
          
          // Mantener la relación de aspecto original
          const aspectRatio = width / height;
          
          // Redimensionar manteniendo la relación de aspecto
          if (width > height) {
            if (width > maxWidth) {
              height = maxWidth / aspectRatio;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = maxHeight * aspectRatio;
              height = maxHeight;
            }
          }
          
          // Asegurar que las dimensiones sean números enteros para evitar problemas de renderizado
          width = Math.round(width);
          height = Math.round(height);
          
          // Configurar el canvas con las dimensiones calculadas
          canvas.width = width;
          canvas.height = height;
          
          // Activar suavizado de alta calidad (con verificación de tipo)
          if (ctx) {
            // Aplicar configuración de alta calidad
            (ctx as CanvasRenderingContext2D).imageSmoothingEnabled = true;
            (ctx as CanvasRenderingContext2D).imageSmoothingQuality = 'high';
            
            // Limpiar el canvas antes de dibujar
            ctx.clearRect(0, 0, width, height);
            
            // Dibujar la imagen con alta calidad
            ctx.drawImage(img, 0, 0, width, height);
          }
          
          // Generar la URL de datos con máxima calidad (1.0)
          const dataUrl = canvas.toDataURL('image/png', 1.0);
          console.log('Logo precargado correctamente con alta calidad');
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
        const logoPath = this.configuracionEmpresa.coFa_Logo;
        console.log('Intentando precargar logo desde:', logoPath);
        
        // Usar exactamente la misma lógica que configuración de factura details
        const logoUrl = this.imageUploadService.getImageUrl(logoPath);
        
        console.log('📍 URL construida para el logo:', logoUrl);
        console.log('📁 Ruta original del logo:', logoPath);
        
        img.src = logoUrl;
      } catch (e) {
        console.error('Error al configurar src del logo:', e);
        resolve(null);
      }
    });
  }

  private crearEncabezadoPorPagina(doc: jsPDF, config: ExportConfig): void {
    // Línea separadora en la parte inferior del encabezado
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(2);
    doc.line(20, 35, doc.internal.pageSize.width - 20, 35);

    // Agregar logo si está disponible
    if (this.logoDataUrl) {
      try {
        // Usar mejor calidad de compresión para la imagen en el PDF
        doc.addImage({
          imageData: this.logoDataUrl,
          format: 'PNG',
          x: 20,
          y: 5,
          width: 30,
          height: 25,
          alias: 'logo'         // Alias para reutilizar la misma imagen si aparece varias veces
        });
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
  }

  private crearPiePaginaConTotal(doc: jsPDF, pageNumber: number, totalPages: number, datosReporte?: any[]) {
    doc.setFontSize(8);
    doc.setTextColor(this.COLORES.grisTexto);
    
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    
    // Información del usuario
    const usuarioCreacion = obtenerUsuario() || 'Sistema'; // Usando obtenerUsuario
    doc.text(`Generado por: ${usuarioCreacion} | ${fechaTexto} ${horaTexto}`, 20, doc.internal.pageSize.height - 12);
    
    // Paginación con total correcto
    doc.text(`Página ${pageNumber}/${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 12, { align: 'right' });
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

  // ===== MÉTODOS DE UTILIDAD =====

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

  // Método de utilidad para formatear números (compatible con PdfReportService)
  formatearNumero(numero: number | null | undefined): string {
    if (numero === null || numero === undefined || isNaN(numero)) {
      return '0.00';
    }
    return numero.toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Método de utilidad para truncar texto (compatible con PdfReportService)
  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Getter para acceder a los colores desde los componentes
  get colores() {
    return this.COLORES;
  }
}