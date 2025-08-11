import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ReporteDevolucionesComponent {
  devoluciones: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) {}

  generarReporte() {
    this.cargando = true;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteDevoluciones`, {
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
      filtros: []
    }

    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Cliente/Negocio', styles: { cellWidth: 45 } },
          { content: 'Fecha Devolución', styles: { halign: 'center', cellWidth: 30 } },
          { content: 'Motivo', styles: { cellWidth: 40 } },
          { content: 'Productos Devueltos', styles: { cellWidth: 80 } },
          { content: 'Vendedor', styles: { cellWidth: 30 } }
        ]
      ],
      body: this.devoluciones.map((devolucion, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center', cellWidth: 15 } },
        { content: devolucion.clie_NombreNegocio || 'N/A', styles: { cellWidth: 45 } },
        { content: this.formatearFecha(devolucion.devo_Fecha), styles: { halign: 'center', cellWidth: 30 } },
        { content: devolucion.devo_Motivo || 'N/A', styles: { cellWidth: 40 } },
        { content: devolucion.productos_Devueltos || 'N/A', styles: { cellWidth: 80 } },
        { content: devolucion.nombre_Completo || 'N/A', styles: { cellWidth: 30 } }
      ])
    }
    
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
}