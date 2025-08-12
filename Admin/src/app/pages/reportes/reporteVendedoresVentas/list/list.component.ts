// reporte-productos.component.ts - VERSIÓN SIMPLIFICADA
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
@Component({
  selector: 'app-reporte-vendedores-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteVendedoresVentasComponent implements OnInit {
  vendedores: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  
  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService // ¡Inyectar el servicio!
  ) {}

  ngOnInit() {
    // this.cargarDatosIniciales();
  }

  // cargarDatosIniciales() {
  //   this.cargando = true;
    
  //   // Cargar marcas y categorías para los filtros
  //   this.http.get<any[]>(`${environment.apiBaseUrl}/Marcas/Listar`, {
  //     headers: { 'x-api-key': environment.apiKey }
  //   }).subscribe({
  //     next: (data) => {
  //       this.marcas = data;
  //     },
  //     error: (error) => {
  //       console.error('Error al cargar marcas:', error);
  //     }
  //   });

  //   this.http.get<any[]>(`${environment.apiBaseUrl}/Categorias/Listar`, {
  //     headers: { 'x-api-key': environment.apiKey }
  //   }).subscribe({
  //     next: (data) => {
  //       this.categorias = data;
  //       this.cargando = false;
  //     },
  //     error: (error) => {
  //       console.error('Error al cargar categorías:', error);
  //       this.cargando = false;
  //     }
  //   });
  // }

  generarReporte() {
    this.cargando = true;
    
    // Parámetros para el SP
    const params: any = {};
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteVendedoresTotalVentas`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        this.vendedores = data;
        this.generarPDF();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al generar reporte:', error);
        this.cargando = false;
      }
    });
  }

  async generarPDF() {
    // CONFIGURACIÓN DEL REPORTE
    const config: ReportConfig = {
      titulo: 'REPORTE DE VENTAS POR VENDEDOR',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de ventas: ${this.vendedores.reduce((total, vendedor) => total + (vendedor.ventas || 0), 0)}`
    };

    //  DATOS DE LA TABLA
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Código', styles: { halign: 'center', cellWidth: 35 } },
          { content: 'DNI', styles: { halign: 'center', cellWidth: 40 } },
          { content: 'Vendedor', styles: { halign: 'center', cellWidth: 70 } },
          { content: 'Telefono', styles: { halign: 'center', cellWidth: 25 } },
          { content: 'Correo electrónico', styles: { halign: 'center', cellWidth: 60 } },
          { content: 'Ventas', styles: { halign: 'center', cellWidth: 20 } }
        ]
      ],
      body: this.vendedores.map((v, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center' } },
        { content: v.vend_Codigo || 'N/A', styles: { halign: 'center' } },
        { content: v.vend_DNI || 'N/A', styles: { halign: 'center' } },
        { content: this.pdfService.truncateText(v.nombreCompleto || '', 40), styles: { halign: 'center' } },
        { content: v.vend_Telefono || 'N/A', styles: { halign: 'center' } },
        { content: v.vend_Correo || 'N/A', styles: { halign: 'center' } },
        { content: v.ventas || 0, styles: { halign: 'center' } }
      ])
    };

    // GENERAR EL PDF
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.vendedores);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  }

  limpiarFiltros() {
    this.fechaInicio = null;
    this.fechaFin = null;
  }
}