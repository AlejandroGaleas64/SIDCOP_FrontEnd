// reporte-vendedores-ventas.component.ts - CON FILTROS DE VENDEDOR Y SUCURSAL
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-reporte-vendedores-ventas',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteVendedoresVentasComponent implements OnInit {
  vendedores: any[] = [];
  sucursales: any[] = [];
  vendedoresFiltro: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  sucu_Id: number | null = null;
  vendedorId: number | null = null;
  
  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) {}

  ngOnInit() {
    this.cargarSucursales();
    this.cargarVendedores();
  }

  cargarSucursales() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.sucursales = data;
      },
      error: (error) => {
        console.error('Error al cargar sucursales:', error);
      }
    });
  }

  cargarVendedores() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.vendedoresFiltro = data;
      },
      error: (error) => {
        console.error('Error al cargar vendedores:', error);
      }
    });
  }

  generarReporte() {
    this.cargando = true;
    
    // Parámetros para el SP
    const params: any = {};
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;
    if (this.sucu_Id) params.sucu_Id = this.sucu_Id;
    if (this.vendedorId) params.vendedorId = this.vendedorId;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteVendedoresTotalVentas`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        //console.log('Parámetros de reporte:', params);
        //console.log('Datos del reporte:', data);
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
      textoResumen: `Total de ventas: ${this.vendedores.reduce((total, vendedor) => total + (vendedor.ventas || 0), 0)}`,
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

  private construirFiltros() {
    const filtros: any[] = [];
    if (this.fechaInicio) {
      filtros.push({ label: 'Fecha Inicio', value: this.fechaInicio });
    }
    if (this.fechaFin) {
      filtros.push({ label: 'Fecha Fin', value: this.fechaFin });
    }
    if (this.sucu_Id) {
      const sucursal = this.sucursales.find(s => s.sucu_Id === this.sucu_Id);
      filtros.push({ 
        label: 'Sucursal', 
        value: sucursal ? sucursal.sucu_Descripcion : this.sucu_Id.toString() 
      });
    }
    if (this.vendedorId) {
      const vendedor = this.vendedoresFiltro.find(v => v.vend_Id === this.vendedorId);
      filtros.push({ 
        label: 'Vendedor', 
        value: vendedor ? vendedor.vend_Descripcion : this.vendedorId.toString() 
      });
    }

    return filtros;
  }

  limpiarFiltros() {
    this.fechaInicio = null;
    this.fechaFin = null;
    this.sucu_Id = null;
    this.vendedorId = null;
  }
}