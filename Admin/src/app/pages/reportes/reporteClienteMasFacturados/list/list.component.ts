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
export class ReporteClientesMasFacturadosComponent{
  clientes: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  fechaInicio: string | null = null;
  fechaFin: string | null = null;

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) {}

  generarReporte(){
    this.cargando = true;

    const params: any = {}
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteClientesMasFacturados`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        this.clientes = data;
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
      titulo: 'Clientes Más Facturados',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de productos: ${this.clientes.length}`,
      filtros: this.construirFiltros()
    }

    const tableData: TableData = {
      head:[
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Nombres', styles: { cellWidth: 40 } },
          { content: 'Apellidos', styles: { cellWidth: 40 } },
          { content: 'Nombre Del Negocio', styles: { cellWidth: 60 } },
          { content: 'Telefono', styles: { cellWidth: 35 } },
          { content: 'Total Facturado', styles: { halign: 'right', cellWidth: 25 } },
          { content: 'Cantidad Compras', styles: { halign: 'right', cellWidth: 25 } }
        ]
      ],
      body: this.clientes.map((cliente, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center', cellWidth: 15 } },
        { content: cliente.clie_Nombres, styles: { cellWidth: 40 } },
        { content: cliente.clie_Apellidos, styles: { cellWidth: 40 } },
        { content: cliente.clie_NombreNegocio, styles: { cellWidth: 60 } },
        { content: cliente.clie_Telefono, styles: { cellWidth: 35 } },
        { content: cliente.totalFacturado, styles: { halign: 'right', cellWidth: 25 } },
        { content: cliente.cantidadCompras, styles: { halign: 'right', cellWidth: 25 } }
      ])
    }
    
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.clientes);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  }

  private construirFiltros() {
    const filtros: any[] = [];
    if (this.fechaInicio) {
      filtros.push({ label: 'Fecha Inicio', value: this.fechaInicio });
    }
    if (this.fechaFin) {
      filtros.push({ label: 'Fecha Fin', value: this.fechaFin });
    }

    return filtros;
  }

  limpiarFiltros() {
    this.fechaInicio = null;
    this.fechaFin = null;
  }
}
