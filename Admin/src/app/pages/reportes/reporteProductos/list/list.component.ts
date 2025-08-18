// reporte-productos.component.ts - VERSIÓN SIMPLIFICADA
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';


@Component({
  selector: 'app-reporte-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteProductosComponent implements OnInit {
  productos: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  marcas: any[] = [];
  categorias: any[] = [];
  marcaSeleccionada: number | null = null;
  categoriaSeleccionada: number | null = null;

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService // ¡Inyectar el servicio!
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    this.cargando = true;
    
    // Cargar marcas y categorías para los filtros
    this.http.get<any[]>(`${environment.apiBaseUrl}/Marcas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.marcas = data;
      },
      error: (error) => {
        console.error('Error al cargar marcas:', error);
      }
    });

    this.http.get<any[]>(`${environment.apiBaseUrl}/Categorias/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.categorias = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
        this.cargando = false;
      }
    });
  }

  generarReporte() {
    this.cargando = true;
    
    // Parámetros para el SP
    const params: any = {};
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;
    if (this.marcaSeleccionada) params.marcaId = this.marcaSeleccionada;
    if (this.categoriaSeleccionada) params.categoriaId = this.categoriaSeleccionada;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteDeProductos`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        this.productos = data;
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
      titulo: 'REPORTE DE PRODUCTOS',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de productos: ${this.productos.length}`,
      filtros: this.construirFiltros()
    };

    //  DATOS DE LA TABLA
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Código', styles: { cellWidth: 25 } },
          { content: 'Descripción', styles: { cellWidth: 60 } },
          { content: 'Marca', styles: { cellWidth: 30 } },
          { content: 'Categoría', styles: { cellWidth: 30 } },
          { content: 'Subcategoría', styles: { cellWidth: 35 } },
          { content: 'Precio', styles: { halign: 'right', cellWidth: 25 } },
          { content: 'Costo', styles: { halign: 'right', cellWidth: 25 } },
          { content: 'Impuesto', styles: { halign: 'center', cellWidth: 20 } }
        ]
      ],
      body: this.productos.map((p, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center' } },
        p.prod_Codigo || 'N/A',
        this.pdfService.truncateText(p.prod_Descripcion || '', 40),
        p.marc_Descripcion || 'N/A',
        p.cate_Descripcion || 'N/A',
        p.subc_Descripcion || 'N/A',
        { content: `L. ${this.pdfService.formatearNumero(p.prod_PrecioUnitario)}`, styles: { halign: 'right' } },
        { content: `L. ${this.pdfService.formatearNumero(p.prod_CostoTotal)}`, styles: { halign: 'right' } },
        { content: p.prod_PagaImpuesto ? 'Sí' : 'No', styles: { halign: 'center' } }
      ])
    };

    // GENERAR EL PDF
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.productos);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  }

  //aqui van los filtros
  private construirFiltros(): { label: string; valor: string }[] {
    const filtros: { label: string; valor: string }[] = [];

    if (this.fechaInicio) {
      filtros.push({ label: 'Desde', valor: this.fechaInicio });
    }
    
    if (this.fechaFin) {
      filtros.push({ label: 'Hasta', valor: this.fechaFin });
    }
    
    if (this.marcaSeleccionada) {
      const marca = this.marcas.find(m => m.marc_Id === this.marcaSeleccionada);
      filtros.push({ label: 'Marca', valor: marca?.marc_Descripcion || 'N/A' });
    }
    
    if (this.categoriaSeleccionada) {
      const categoria = this.categorias.find(c => c.cate_Id === this.categoriaSeleccionada);
      filtros.push({ label: 'Categoría', valor: categoria?.cate_Descripcion || 'N/A' });
    }

    return filtros;
  }

  limpiarFiltros() {
    this.fechaInicio = null;
    this.fechaFin = null;
    this.marcaSeleccionada = null;
    this.categoriaSeleccionada = null;
  }
}