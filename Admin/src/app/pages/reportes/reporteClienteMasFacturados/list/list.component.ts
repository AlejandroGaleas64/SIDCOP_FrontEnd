import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ReporteClientesMasFacturadosComponent implements OnDestroy {
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

  generarReporte() {
    this.cargando = true;

    const params: any = {};
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;

    console.log('Generando reporte con parámetros:', params);

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
        console.error('Error completo:', {
          url: error.url,
          status: error.status,
          message: error.message,
          error: error.error
        });
        this.cargando = false;
      }
    });
  }

  async generarPdf() {
    const config: ReportConfig = {
      titulo: 'Clientes Más Facturados',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de clientes: ${this.clientes.length}`,
    };

    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Nombres', styles: { cellWidth: 40 } },
          { content: 'Apellidos', styles: { cellWidth: 40 } },
          { content: 'Nombre Del Negocio', styles: { cellWidth: 60 } },
          { content: 'Telefono', styles: { cellWidth: 35 } },
          { content: 'Total Facturado', styles: { halign: 'right', cellWidth: 35 } },
          { content: 'Cantidad Compras', styles: { halign: 'right', cellWidth: 42 } }
        ]
      ],
      body: this.clientes.map((cliente, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center', cellWidth: 15 } },
        { content: cliente.clie_Nombres, styles: { cellWidth: 40 } },
        { content: cliente.clie_Apellidos, styles: { cellWidth: 40 } },
        { content: cliente.clie_NombreNegocio, styles: { cellWidth: 60 } },
        { content: cliente.clie_Telefono, styles: { cellWidth: 35 } },
        { content: cliente.totalFacturado, styles: { halign: 'right', cellWidth: 35 } },
        { content: cliente.cantidadCompras, styles: { halign: 'right', cellWidth: 42 } }
      ])
    };
    
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.clientes, {
        margin: { left: 15, right: 15, bottom: 30, top: 45 },
        tableWidth: 'auto',
        halign: 'right' // Esto centra la tabla en la página
      });
      const pdfUrl = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  }

  private validarCampo(valor: any): string {
    if (valor === null || valor === undefined || valor === '' || valor === 'null') {
      return 'N/A';
    }
    return valor.toString().trim();
  }

  private formatearTelefono(telefono: any): string {
    if (!telefono || telefono === 'null' || telefono === null || telefono === undefined) {
      return 'N/A';
    }
    
    const tel = telefono.toString().trim();
    
    // Si tiene 8 dígitos, formato hondureño: ####-####
    if (tel.length === 8 && /^\d{8}$/.test(tel)) {
      return `${tel.substring(0, 4)}-${tel.substring(4)}`;
    }
    
    // Si tiene más de 8 dígitos, mostrar con guiones cada 4
    if (tel.length > 8 && /^\d+$/.test(tel)) {
      return tel.replace(/(\d{4})/g, '$1-').replace(/-$/, '');
    }
    
    return tel;
  }

  private formatearMoneda(monto: any): string {
    if (monto === null || monto === undefined || isNaN(Number(monto))) {
      return 'L 0.00';
    }
    
    const numero = Number(monto);
    return `L ${numero.toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  private formatearCantidad(cantidad: any): string {
    if (cantidad === null || cantidad === undefined || isNaN(Number(cantidad))) {
      return '0';
    }
    
    const numero = Number(cantidad);
    return numero.toLocaleString('es-HN');
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return '';
    
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-HN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return fecha;
    }
  }

  private construirTextoFiltros(): string {
    const filtros: string[] = [];
    
    if (this.fechaInicio && this.fechaFin) {
      filtros.push(`Período: ${this.formatearFecha(this.fechaInicio)} - ${this.formatearFecha(this.fechaFin)}`);
    } else if (this.fechaInicio) {
      filtros.push(`Desde: ${this.formatearFecha(this.fechaInicio)}`);
    } else if (this.fechaFin) {
      filtros.push(`Hasta: ${this.formatearFecha(this.fechaFin)}`);
    }
    
    return filtros.join(' | ');
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
    this.clientes = [];
    this.pdfUrl = null;
  }

  limpiarReporte() {
    this.clientes = [];
    this.pdfUrl = null;
  }

  ngOnDestroy() {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl.toString());
    }
  }
}