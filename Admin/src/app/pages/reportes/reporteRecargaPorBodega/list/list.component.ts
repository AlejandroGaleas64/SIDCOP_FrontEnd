import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

@Component({
  selector: 'app-reporte-recargos',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteRecargasPorBodegaComponent implements OnInit {
  recargos: any[] = [];
  bodegas: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;
  bodeSelectedId: number | null = null;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) {}

  ngOnInit() {
    this.cargarBodegas();
  }

  cargarBodegas() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Bodega/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.bodegas = data,
      error: (error) => console.error('Error al cargar bodegas:', error)
    });
  }

  onBodegaChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.bodeSelectedId = value ? parseInt(value) : null;
    console.log('Bodega seleccionada:', this.bodeSelectedId);
  }

 // En tu componente Angular
generarReporte() {
  // Validación reforzada
  if (this.bodeSelectedId === null || this.bodeSelectedId === undefined || isNaN(this.bodeSelectedId)) {
    console.error('ID de bodega inválido:', this.bodeSelectedId);
    return;
  }

  this.cargando = true;

  // Usar parámetro con el nombre exacto que espera el backend
  const params = { bodega: this.bodeSelectedId };

  this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteRecargasPorBodega`, {
    headers: { 'x-api-key': environment.apiKey },
    params: params
  }).subscribe({
    next: (data) => {
      this.recargos = data;
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
    const bodegaSeleccionada = this.bodegas.find(b => b.bode_Id === this.bodeSelectedId!);
    const bode_Descripcion = bodegaSeleccionada?.bode_Descripcion || 'N/A';

    const config: ReportConfig = {
      titulo: 'Reporte de Recargos',
      orientacion: 'portrait', // Cambiado a landscape por más columnas
      mostrarResumen: true,
      textoResumen: `Total de recargas: ${this.recargos.length}`,
     
    }

    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 10 } },
          { content: 'Productos', styles: { halign: 'center', cellWidth: 65 } },
          { content: 'Observaciones', styles: { cellWidth: 45 } },
          { content: 'Confirmación', styles: { halign: 'center', cellWidth: 30 } },
          { content: 'Fecha', styles: { halign: 'center', cellWidth: 25 } },
        ]
      ],
      body: this.recargos.map((recargo, index) => [
        { content: (index + 1).toString(), styles: { halign: 'center', cellWidth: 10 } },
        { content: recargo.prod_DescripcionCorta || 'N/A', styles: { cellWidth: 65 } },
        { content: recargo.reca_Observaciones || 'N/A', styles: { cellWidth: 45 } },
        { content: this.formatearConfirmacion(recargo.reca_Confirmacion), styles: { halign: 'center', cellWidth: 30 } },
        { content: this.formatearFecha(recargo.reca_Fecha), styles: { halign: 'center', cellWidth: 25 } },
      ])
    }
    
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.recargos);
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

private formatearConfirmacion(confirmacion: any): string {
  if (confirmacion === null || confirmacion === undefined || confirmacion === '') {
    return 'N/A';
  }
  
  // Convertir a string y obtener el primer carácter en mayúscula
  const valor = confirmacion.toString().toUpperCase().charAt(0);
  
  switch (valor) {
    case 'A':
      return 'Aprobado';
    case 'E':
      return 'Entregado';
    case 'P':
      return 'Pendiente';
    case 'R':
      return 'Rechazado';
    default:
      return 'Desconocido';
  }
}

  limpiarReporte() {
    this.recargos = [];
    this.pdfUrl = null;
    this.bodeSelectedId = null;
  }
}