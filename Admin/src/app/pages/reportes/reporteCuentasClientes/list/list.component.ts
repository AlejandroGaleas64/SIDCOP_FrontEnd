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
  selector: 'app-reporte-cuentas-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteCuentasClientesComponent implements OnInit {
  cuentas: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  clientes: any[] = [];
  clienteSeleccionado: number | null = null;

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

    // Cargar clientes para los filtros
    this.http.get<any[]>(`${environment.apiBaseUrl}/Cliente/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.clientes = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar clientes:', error);
        this.cargando = false;
      }
    });
  }

  generarReporte() {
    this.cargando = true;
    
    // Parámetros para el SP
    const params: any = {};
    if (this.clienteSeleccionado) params.clienteId = this.clienteSeleccionado;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteCuentasPorCliente`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        this.cuentas = data;
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
      titulo: 'REPORTE DE CUENTAS POR CLIENTE',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de cuentas: ${this.cuentas.length}`
    };

    //  DATOS DE LA TABLA
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 8 } },
          { content: 'Cliente', styles: { cellWidth: 20 } },
          { content: 'Negocio', styles: { cellWidth: 18 } },
          { content: 'Factura', styles: { cellWidth: 15 } },
          { content: 'Emisión', styles: { cellWidth: 20 } },
          { content: 'Vencimiento', styles: { cellWidth: 20 } },
          { content: 'Valor', styles: { halign: 'right', cellWidth: 20 } },
          { content: 'Saldo', styles: { halign: 'right', cellWidth: 20 } },
          { content: 'Anulada', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Saldada', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Fecha de Pago', styles: { cellWidth: 20 } },
          { content: 'Monto', styles: { halign: 'right', cellWidth: 20 } },
          { content: 'Forma de Pago', styles: { cellWidth: 20 } },
          { content: 'Observaciones', styles: { cellWidth: 23 } },
          { content: '¿Pago Anulado?', styles: { halign: 'center', cellWidth: 16 } }
        ]
      ],
      body: this.cuentas.map((c, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center' } },
        this.pdfService.truncateText(c.cliente || '', 40),
        c.clie_NombreNegocio || 'N/A',
        c.fact_Numero || 'N/A',
        c.cpCo_FechaEmision || 'N/A',
        c.cpCo_FechaVencimiento || 'N/A',
        { content: `L. ${this.pdfService.formatearNumero(c.cpCo_Valor)}`, styles: { halign: 'right' } },
        { content: `L. ${this.pdfService.formatearNumero(c.cpCo_Saldo)}`, styles: { halign: 'right' } },
        { content: c.anulada, styles: { halign: 'center' } },
        { content: c.saldada, styles: { halign: 'center' } },
        c.pago_Fecha || 'N/A',
        { content: `L. ${this.pdfService.formatearNumero(c.pago_Monto)}`, styles: { halign: 'right' } },
        c.pago_FormaPago || 'N/A',
        c.pago_Observaciones || 'N/A',
        { content: c.anulado, styles: { halign: 'center' } }
      ])
    };

    // GENERAR EL PDF
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.cuentas);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  }

  limpiarFiltros() {
    this.clienteSeleccionado = null;
  }
}