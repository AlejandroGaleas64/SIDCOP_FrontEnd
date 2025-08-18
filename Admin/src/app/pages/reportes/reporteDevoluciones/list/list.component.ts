import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

// Interfaz para tipado de datos
interface Devolucion {
  devo_Id: number;
  clie_Id: number;
  nombre_Completo: string;
  clie_NombreNegocio: string;
  fact_Id: number;
  fact_Numero: string;
  nombreVendedor: string;
  ruta_Id: number;
  ruta_Descripcion: string;
  sucu_Id: number;
  sucu_Descripcion: string;
  devo_Fecha: string;
  devo_Motivo: string;
  usuarioCreacion: string;
  usua_Creacion: number;
  devo_FechaCreacion: string;
  usuarioModificacion: string;
  usua_Modificacion: number;
  devo_FechaModificacion: string;
  devo_Estado: number;
  productos_Devueltos: string;
}

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ReporteDevolucionesComponent {
  devoluciones: Devolucion[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) {}

  generarReporte() {
    this.cargando = true;

    this.http.get<Devolucion[]>(`${environment.apiBaseUrl}/Reportes/ReporteDevoluciones`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.devoluciones = data;
        this.generarPdf();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al generar el reporte:', error);
        this.cargando = false;
      }
    });
  }

  async generarPdf() {
    const config: ReportConfig = {
      titulo: 'Reporte de Devoluciones',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de devoluciones: ${this.devoluciones.length}`,
    };

    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 10 } },
          { content: 'Cliente/Negocio', styles: { cellWidth: 50 } },
          { content: 'Vendedor', styles: { cellWidth: 35 } },
          { content: 'Ruta', styles: { cellWidth: 30 } },
          { content: 'Fecha Devolución', styles: { halign: 'center', cellWidth: 25 } },
          { content: 'Motivo', styles: { cellWidth: 50 } },
          { content: 'Productos Devueltos', styles: { cellWidth: 70 } }
        ]
      ],
      body: this.devoluciones.map((devolucion, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center', cellWidth: 10 } },
        { 
          content: devolucion.clie_NombreNegocio || devolucion.nombre_Completo || 'N/A', 
          styles: { cellWidth: 50 } 
        },
        { 
          content: devolucion.nombreVendedor || 'N/A', 
          styles: { cellWidth: 35 } 
        },
        { 
          content: devolucion.ruta_Descripcion || 'N/A', 
          styles: { cellWidth: 30 } 
        },
        { 
          content: this.formatearFecha(devolucion.devo_Fecha), 
          styles: { halign: 'center', cellWidth: 25 } 
        },
        { 
          content: devolucion.devo_Motivo || 'N/A', 
          styles: { cellWidth: 50 } 
        },
        { 
          content: devolucion.productos_Devueltos || 'N/A', 
          styles: { cellWidth: 70 } 
        }
      ])
    };
    
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.devoluciones);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  }

  private formatearFecha(fecha: string): string {
    if (!fecha || fecha === '0001-01-01T00:00:00') return 'N/A';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  }

  // Método para limpiar recursos al destruir el componente
  ngOnDestroy() {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl.toString());
    }
  }
}