
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


export class ReporteClientesPorCanalYFechaComponent implements OnInit {
  clientes: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  canales: any[] = [];
  
  canalSeleccionado: number | null = null;
  

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
    
    // Cargar canales y categorías para los filtros
    this.http.get<any[]>(`${environment.apiBaseUrl}/Canal/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.canales = data;
      },
      error: (error) => {
        console.error('Error al cargar canales:', error);
      }
    });

    this.cargando = false;
    
  }


  // Generar las filas con rowSpan para Canal y #
private generarFilasConRowSpan(): any[][] {
  const filas: any[][] = [];
  let contador = 0;

  for (let i = 0; i < this.clientes.length; i++) {
    const cliente = this.clientes[i];
    const fila: any[] = [];

    // Calcular rowSpan para Canal
    const rowSpanCanal = this.calcularRowSpanCanal(i, this.clientes);

    // Columna # y Canal solo en la primera fila del grupo
    if (rowSpanCanal > 0) {
      contador++;
      fila.push({
        content: contador.toString(),
        rowSpan: rowSpanCanal,
        styles: { halign: 'center' }
      });
      fila.push({
        content: cliente.Canal || 'N/A',
        rowSpan: rowSpanCanal,
        styles: {}
      });
    }

    // Columna Codigo Cliente (siempre)
    fila.push({
      content: cliente.Clie_Codigo || 'N/A'
    });

    // Columna Cliente (siempre)
    fila.push({
      content: cliente.Cliente || 'N/A'
    });

    // Columna Negocio (siempre)
    fila.push({
      content: cliente.Negocio || 'N/A'
    });

    // Columna Fecha de Ingreso (siempre)
    fila.push({
      content: cliente.Clie_FechaCreacion || 'N/A'
    });

    filas.push(fila);
  }

  return filas;
}

// Calcular rowSpan para Canal
private calcularRowSpanCanal(indiceActual: number, clientes: any[]): number {
  const actual = clientes[indiceActual];
  if (indiceActual > 0) {
    const anterior = clientes[indiceActual - 1];
    if (anterior.Canal === actual.Canal) {
      return 0;
    }
  }
  // Contar cuántas filas consecutivas tienen el mismo canal
  let count = 1;
  for (let i = indiceActual + 1; i < clientes.length; i++) {
    if (clientes[i].Canal !== actual.Canal) break;
    count++;
  }
  return count;
}


  generarReporte() {
    this.cargando = true;
    
    // Parámetros para el SP
    const params: any = {};
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;
    if (this.canalSeleccionado && this.canalSeleccionado != null) params.canaId = this.canalSeleccionado;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteClientesPorCanalesFecha`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        this.clientes = data;
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
      titulo: 'REPORTE DE clientes',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de clientes: ${this.clientes.length}`,
      filtros: this.construirFiltros()
    };

    const filasConRowSpan = this.generarFilasConRowSpan();

    //  DATOS DE LA TABLA
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Canal', styles: { cellWidth: 50 } },
          { content: 'Codigo Cliente', styles: { cellWidth: 40 } },
          { content: 'Cliente', styles: { cellWidth: 60 } },
          { content: 'Negocio', styles: { cellWidth: 60 } },
          { content: 'Fecha de Ingreso', styles: { cellWidth: 50 } },
          
        ]
      ],
      body: filasConRowSpan
      // this.clientes.map((p, index) => [
      //   { content: (index + 1).toString(), styles: { halign: 'center' } },

      //   p.Canal || 'N/A',
      //   p.Clie_Codigo,
      //   p.Cliente || 'N/A',
      //   p.Negocio || 'N/A',
      //   p.Clie_FechaCreacion || 'N/A',
        
      // ])
    };

    // GENERAR EL PDF
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.clientes);
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
    
    console.log('canalSeleccionado', this.canalSeleccionado);

    if (this.canalSeleccionado && this.canalSeleccionado != null) {
      const canal = this.canales.find(m => m.cana_Id == this.canalSeleccionado);
      filtros.push({ label: 'canal', valor: canal?.cana_Descripcion });
    }
    

    return filtros;
  }

  limpiarFiltros() {
    this.fechaInicio = null;
    this.fechaFin = null;
    this.canalSeleccionado = null;
    
  }
}