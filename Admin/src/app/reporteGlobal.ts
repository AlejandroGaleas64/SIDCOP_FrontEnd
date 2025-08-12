// src/app/core/services/pdf-report.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {  obtenerUsuario } from 'src/app/core/utils/user-utils';

export interface ReportConfig {
  titulo: string;
  filtros?: { label: string; valor: string }[];
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

  private async crearEncabezado(doc: jsPDF, config: ReportConfig): Promise<number> {
    // Línea separadora en la parte inferior del encabezado
    doc.setDrawColor(this.COLORES.dorado);
    doc.setLineWidth(2);
    doc.line(20, 35, doc.internal.pageSize.width - 20, 35);

    // Cargar y agregar logo
    const logoDataUrl = await this.cargarLogo();
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', 20, 5, 30, 25);
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
    doc.text(config.titulo, pageWidth / 2, 27, { align: 'center' });

    let yPos = 45;

    // Filtros aplicados (si existen)
    if (config.filtros && config.filtros.length > 0) {
      doc.setTextColor(this.COLORES.grisTexto);
      doc.setFontSize(10);
      doc.text('Filtros aplicados:', 20, yPos);
      yPos += 6;

      config.filtros.forEach(filtro => {
        doc.text(`• ${filtro.label}: ${filtro.valor}`, 25, yPos);
        yPos += 6;
      });
      
      yPos += 10; // Espacio adicional después de los filtros
    }

    return yPos;
  }

  private crearPiePagina(doc: jsPDF, data: any, datosReporte?: any[]) {
    doc.setFontSize(8);
    doc.setTextColor(this.COLORES.grisTexto);
    
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    const totalPages = doc.getNumberOfPages();
    
    // Información del usuario
    const usuarioCreacion = obtenerUsuario() || 'N/A';
    doc.text(`Generado por:  ${usuarioCreacion} | ${fechaTexto} ${horaTexto}`, 20, doc.internal.pageSize.height - 12);
    
    // Paginación
    doc.text(`Página ${data.pageNumber}/${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 12, { align: 'right' });
  }

  async generarReportePDF(
    config: ReportConfig, 
    tableData: TableData, 
    datosReporte: any[] = [],
    tableStyles?: any
  ): Promise<Blob> {
    
    const doc = new jsPDF(config.orientacion || 'landscape');
    
    // Crear encabezado y obtener posición Y donde empezar la tabla
    const startY = await this.crearEncabezado(doc, config);

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
      margin: { left: 15, right: 15, bottom: 30 },
      tableWidth: 'auto',
      showHead: 'everyPage',
      pageBreak: 'auto',
      didDrawPage: (data: any) => {
        this.crearPiePagina(doc, data, datosReporte);
      }
    };

    // Mergear estilos personalizados con los por defecto
    const finalTableStyles = { ...defaultTableStyles, ...tableStyles };

    // Crear la tabla
    autoTable(doc, {
      startY: startY,
      head: tableData.head,
      body: tableData.body,
      ...finalTableStyles
    });

    // Resumen final (si está configurado)
    if (config.mostrarResumen && config.textoResumen) {
      const finalY = (doc as any).lastAutoTable.finalY;
      if (finalY < doc.internal.pageSize.height - 30) {
        doc.setFontSize(10);
        doc.setTextColor(this.COLORES.azulOscuro);
        doc.setFont('helvetica', 'bold');
        doc.text(config.textoResumen, 20, finalY + 15);
      }
    }

    // Retornar el blob del PDF
    return doc.output('blob');
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