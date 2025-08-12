// reporte-productos.component.ts - VERSIÓN SIMPLIFICADA
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
@Component({
  selector: 'app-reporte-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteProductosVendidosComponent implements OnInit {
  productos: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  categorias: any[] = [];
  subcategorias: any[] = [];
  marcas: any[] = [];
  marcaSeleccionada: number | null = null;
  categoriaSeleccionada: number | null = null;
  subcategoriaSeleccionada: number | null = null;

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
    
    // Cargar marcas y categorías y subcategorias para los filtros
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

    this.http.get<any[]>(`${environment.apiBaseUrl}/Subcategoria/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.subcategorias = data;
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
    if (this.categoriaSeleccionada) params.categoriaId = this.categoriaSeleccionada;
    if (this.subcategoriaSeleccionada) params.subcategoriaId = this.subcategoriaSeleccionada;
    if (this.marcaSeleccionada) params.marcaId = this.marcaSeleccionada;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteProductosVendidos`, {
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
      textoResumen: `Total de productos: ${this.productos.length} \n Total de productos vendidos: ${this.productos.reduce((total, producto) => total + (producto.cantidadVendida || 0), 0)}`
    };

    //  DATOS DE LA TABLA
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Código', styles: { halign: 'center', cellWidth: 30 } },
          { content: 'Descripción', styles: { halign: 'center', cellWidth: 65 } },
          { content: 'Marca', styles: { halign: 'center', cellWidth: 36 } },
          { content: 'Categoría', styles: { halign: 'center', cellWidth: 36 } },
          { content: 'Subcategoría', styles: { halign: 'center', cellWidth: 36 } },
          { content: 'Cantidad Vendida', styles: { halign: 'center', cellWidth: 45 } }
        ]
      ],
      body: this.productos.map((p, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center' } },
        { content: p.prod_Codigo || 'N/A', styles: { halign: 'center' } },
        { content: this.pdfService.truncateText(p.prod_DescripcionCorta || '', 40), styles: { halign: 'center' } },
        { content: p.marc_Descripcion || 'N/A', styles: { halign: 'center' } },
        { content: p.cate_Descripcion || 'N/A', styles: { halign: 'center' } },
        { content: p.subc_Descripcion || 'N/A', styles: { halign: 'center' } },
        { content: p.cantidadVendida || 0, styles: { halign: 'center' } }
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

  limpiarFiltros() {
    this.marcaSeleccionada = null;
    this.categoriaSeleccionada = null;
    this.subcategoriaSeleccionada = null;
  }
}