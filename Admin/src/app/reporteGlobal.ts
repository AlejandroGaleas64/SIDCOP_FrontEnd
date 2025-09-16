// src/app/core/services/pdf-report.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { obtenerUsuario } from 'src/app/core/utils/user-utils';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';

export interface ReportConfig {
  titulo: string;
  orientacion?: 'portrait' | 'landscape';
  mostrarResumen?: boolean;
  textoResumen?: string;
}

export interface TableColumn {
  content: string;
  styles?: any;
}

export interface TableData {
  head: TableColumn[][];
  body: any[][];
}

@Injectable({
  providedIn: 'root'
})
export class PdfReportService {
  private configuracionEmpresa: any = null;
  private logoDataUrl: string | null = null;

  // Colores del tema
  private readonly COLORES = {
    dorado: '#D6B68A',
    azulOscuro: '#141a2f',
    blanco: '#FFFFFF',
    grisClaro: '#F8F9FA',
    grisTexto: '#666666'
  };

  constructor(
    private http: HttpClient,
    private imageUploadService: ImageUploadService
  ) {
    this.cargarConfiguracionEmpresa();
  }

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
        
        // Usar exactamente la misma lógica que configuración de factura details
        const logoUrl = this.imageUploadService.getImageUrl(logoPath);
        
        
        img.src = logoUrl;
      } catch (e) {
        console.error('Error al configurar src del logo:', e);
        resolve(null);
      }
    });
  }

  private crearEncabezadoPorPagina(doc: jsPDF, config: ReportConfig): void {
    // Línea separadora en la parte inferior del encabezado
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(2);
    doc.line(20, 35, doc.internal.pageSize.width - 20, 35);

    // Agregar logo si está disponible
    if (this.logoDataUrl) {
      try {
        doc.addImage(this.logoDataUrl, 'PNG', 20, 5, 30, 25);
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
    doc.text(config.titulo, pageWidth / 2, 27, { align: 'center' });
  }

  async generarReportePDF(
    config: ReportConfig, 
    tableData: TableData, 
    datosReporte: any[] = [],
    tableStyles?: any
  ): Promise<Blob> {
    
    const doc = new jsPDF(config.orientacion || 'landscape');
    
    // Asegurar que el logo esté cargado antes de generar el PDF
    if (this.configuracionEmpresa?.coFa_Logo && !this.logoDataUrl) {
      await this.precargarLogo();
    }

    // Crear encabezado inicial
    this.crearEncabezadoPorPagina(doc, config);

    // Configuración por defecto de la tabla
    const defaultTableStyles = {
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: 'linebreak',
        halign: 'left',
        valign: 'middle',
        lineColor: false, // Sin bordes internos
        lineWidth: 0,
      },
      headStyles: {
        fillColor: this.COLORES.azulOscuro,
        textColor: this.COLORES.dorado,
        fontStyle: 'bold',
        fontSize: 9,
        lineColor: false,
        lineWidth: 0,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      // Sin bordes exteriores tampoco
      tableLineColor: false,
      tableLineWidth: 0,
      margin: { left: 15, right: 15, bottom: 30, top: 45 }, // top: 45 para dar espacio al encabezado
      tableWidth: 'auto',
      showHead: 'everyPage',
      pageBreak: 'auto',
      didDrawPage: (data: any) => {
        // Si no es la primera página, crear el encabezado
        if (data.pageNumber > 1) {
          this.crearEncabezadoPorPagina(doc, config);
        }
      }
    };

    // Mergear estilos personalizados con los por defecto
    const finalTableStyles = { ...defaultTableStyles, ...tableStyles };

    // Crear la tabla comenzando después del encabezado
    autoTable(doc, {
      startY: 45, // Posición fija después del encabezado
      head: tableData.head,
      body: tableData.body,
      ...finalTableStyles
    });

    // Resumen final (si está configurado)
    if (config.mostrarResumen && config.textoResumen) {
      const finalY = (doc as any).lastAutoTable.finalY;
      if (finalY < doc.internal.pageSize.height - 40) {
        doc.setFontSize(10);
        doc.setTextColor(this.COLORES.azulOscuro);
        doc.setFont('helvetica', 'bold');
        doc.text(config.textoResumen, 20, finalY + 15);
      }
    }

    const totalPages = doc.getNumberOfPages();
  
    // Recorrer todas las páginas para añadir la numeración correcta
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      doc.setPage(pageNum);
      this.crearPiePaginaConTotal(doc, pageNum, totalPages, datosReporte);
    }

    // Retornar el blob del PDF
    return doc.output('blob');
  }

  private crearPiePaginaConTotal(doc: jsPDF, pageNumber: number, totalPages: number, datosReporte?: any[]) {
    doc.setFontSize(8);
    doc.setTextColor(this.COLORES.grisTexto);
    
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    
    // Información del usuario
    const usuarioCreacion = obtenerUsuario() || 'N/A';
    doc.text(`Generado por: ${usuarioCreacion} | ${fechaTexto} ${horaTexto}`, 20, doc.internal.pageSize.height - 12);
    
    // Paginación con total correcto
    doc.text(`Página ${pageNumber}/${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 12, { align: 'right' });
  }

  // Método de utilidad para formatear números
  formatearNumero(numero: number | null | undefined): string {
    if (numero === null || numero === undefined || isNaN(numero)) {
      return '0.00';
    }
    return numero.toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Método de utilidad para truncar texto
  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  // Getter para acceder a los colores desde los componentes
  get colores() {
    return this.COLORES;
  }
}