import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class ReporteRecargasPorBodegaComponent implements OnInit, OnDestroy {
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

  generarReporte() {
    this.cargando = true;

    // Si no se selecciona bodega (null), se envía parámetro vacío para listar todo
    const params: any = {};
    if (this.bodeSelectedId !== null && this.bodeSelectedId !== undefined && !isNaN(this.bodeSelectedId)) {
      params.bodega = this.bodeSelectedId;
    }

    console.log('Generando reporte con parámetros:', params);

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
    const bodegaSeleccionada = this.bodegas.find(b => b.bode_Id === this.bodeSelectedId);
    const bode_Descripcion = bodegaSeleccionada?.bode_Descripcion || 'Todas las Bodegas';

    const config: ReportConfig = {
      titulo: 'Reporte de Recargos por Bodega',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Bodega: ${bode_Descripcion} - Total de recargos: ${this.recargos.length}`,
    };

    // Anchos optimizados para landscape (aproximadamente 270-280 unidades totales)
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 20 } },
          { content: 'Bodega', styles: { halign: 'center', cellWidth: 33 } },
          { content: 'Productos', styles: { halign: 'center', cellWidth: 90 } },
          { content: 'Observaciones', styles: { halign: 'center', cellWidth: 45 } },
          { content: 'Estado', styles: { halign: 'center', cellWidth: 35 } },
          { content: 'Fecha', styles: { halign: 'center', cellWidth: 35 } },
        ]
      ],
      body: this.recargos.map((recargo, index) => [
        { 
          content: (index + 1).toString(), 
          styles: { halign: 'center', cellWidth: 20, fontSize: 9 } 
        },
        { 
          content: this.validarCampo(recargo.bode_Descripcion), 
          styles: { halign: 'left', cellWidth: 33, fontSize: 8, valign: 'top' } 
        },
        { 
          content: this.formatearProductos(recargo.prod_DescripcionCorta), 
          styles: { halign: 'left', cellWidth: 90, fontSize: 7, valign: 'top', lineHeight: 1.2 } 
        },
        { 
          content: this.validarCampo(recargo.reca_Observaciones), 
          styles: { halign: 'left', cellWidth: 45, fontSize: 7, valign: 'top', lineHeight: 1.2 } 
        },
        { 
          content: this.formatearConfirmacion(recargo.reca_Confirmacion), 
          styles: { halign: 'center', cellWidth: 35, fontSize: 8, valign: 'middle' } 
        },
        { 
          content: this.formatearFecha(recargo.reca_Fecha), 
          styles: { halign: 'center', cellWidth: 35, fontSize: 8, valign: 'middle' } 
        },
      ])
    };
    
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.recargos);
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
    return valor.toString();
  }

  private formatearProductos(productos: string): string {
    if (!productos || productos === 'null' || productos === null || productos === undefined) {
      return 'N/A';
    }
    
    // Si los productos vienen separados por ';' los convertimos a saltos de línea
    let productosFormateados = productos
      .replace(/;\s*/g, '\n• ') // Reemplaza '; ' con salto de línea y bullet
      .trim();
    
    // Si no empieza con bullet, lo agregamos
    if (!productosFormateados.startsWith('•')) {
      productosFormateados = '• ' + productosFormateados;
    }
    
    return productosFormateados;
  }

  private formatearFecha(fecha: string): string {
    if (!fecha || fecha === '0001-01-01T00:00:00' || fecha === null || fecha === undefined || fecha === 'null') {
      return 'N/A';
    }
    
    try {
      const date = new Date(fecha);
      if (isNaN(date.getTime())) {
        return 'N/A';
      }
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  private formatearConfirmacion(confirmacion: any): string {
    if (confirmacion === null || confirmacion === undefined || confirmacion === '' || confirmacion === 'null') {
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
        return 'N/A';
    }
  }

  limpiarReporte() {
    this.recargos = [];
    this.pdfUrl = null;
    this.bodeSelectedId = null;
  }

  ngOnDestroy() {
    if (this.pdfUrl) {
      URL.revokeObjectURL(this.pdfUrl.toString());
    }
  }

  private construirFiltros() {
    const filtros: any[] = [];
    if (this.bodeSelectedId !== null && this.bodeSelectedId !== undefined) {
      const bodega = this.bodegas.find(b => b.bode_Id === this.bodeSelectedId);
      filtros.push({ label: 'Bodega', value: bodega ? bodega.bode_Descripcion : 'Todas las Bodegas' });
    }
    return filtros;
  }
}