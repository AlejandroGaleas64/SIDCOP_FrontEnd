// reporte-productos.component.ts - VERSIÓN CON CELDAS COMBINADAS
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';


interface FilaTabla {
  content: string;
  styles?: any;
  rowSpan?: number;
}

@Component({
  selector: 'app-reporte-productos',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteProductosPorRutaComponent implements OnInit {
  productos: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  rutas: any[] = [];
  rutaSeleccionada: number | null = null;

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) {}

  ngOnInit() {
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales() {
    this.cargando = true;
    
    // Cargar Rutas
    this.http.get<any[]>(`${environment.apiBaseUrl}/Rutas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.rutas = data;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar rutas:', error);
        this.cargando = false;
      }
    });
  }

  generarReporte() {
    this.cargando = true;
    
    // Parámetros para el SP
    const params: any = {};
    if (this.rutaSeleccionada) params.rutaId = this.rutaSeleccionada;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteProductosPorRuta`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        this.productos = this.ordenarDatos(data);
        this.generarPDF();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al generar reporte:', error);
        this.cargando = false;
      }
    });
  }

  // Ordenar los datos para agrupar por DNI, Vendedor y Ruta
  private ordenarDatos(productos: any[]): any[] {
    return productos.sort((a, b) => {
      // Primero por Ruta
      if (a.ruta_Descripcion !== b.ruta_Descripcion) {
        return a.ruta_Descripcion.localeCompare(b.ruta_Descripcion);
      }
      // Luego por DNI
      if (a.vend_DNI !== b.vend_DNI) {
        return a.vend_DNI.localeCompare(b.vend_DNI);
      }
      // Después por Vendedor
      if (a.nombreCompleto !== b.nombreCompleto) {
        return a.nombreCompleto.localeCompare(b.nombreCompleto);
      }
      // Por último por Producto
      return a.prod_DescripcionCorta.localeCompare(b.prod_DescripcionCorta);
    });
  }

  // Generar las filas con rowSpan para celdas combinadas
  private generarFilasSinRowSpan(): any[][] {
    const filas: any[][] = [];
    let contadorRutas = 0;
    let rutaAnterior = '';
    
    for (let i = 0; i < this.productos.length; i++) {
      const producto = this.productos[i];
      const fila: any[] = [];

      // Incrementar contador solo cuando cambia la ruta
      if (producto.ruta_Descripcion !== rutaAnterior) {
        contadorRutas++;
        rutaAnterior = producto.ruta_Descripcion;
      }

      // Todas las columnas se muestran en cada fila (sin rowSpan)
      fila.push(contadorRutas.toString());
      fila.push(producto.ruta_Descripcion || 'N/A');
      fila.push(producto.vend_DNI || 'N/A');
      fila.push(producto.nombreCompleto || 'N/A');
      fila.push(producto.prod_DescripcionCorta || 'N/A');
      fila.push((producto.cantidadVendida || 0).toString());

      filas.push(fila);
    }

    return filas;
  }

  // 2. Método generarPDF() actualizado para usar filas sin rowSpan
  async generarPDF() {
    // CONFIGURACIÓN DEL REPORTE
    const config: ReportConfig = {
      titulo: 'REPORTE DE PRODUCTOS VENDIDOS POR RUTA',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de productos vendidos: ${this.productos.reduce((total, producto) => total + (producto.cantidadVendida || 0), 0)}`
    };

    // USAR EL MÉTODO SIN ROWSPAN
    const filasTabla = this.generarFilasSinRowSpan();

    // Construir fila de encabezados como primera fila del body
    const headerRow = [
      { content: '#', styles: { halign: 'center', fontStyle: 'bold'} },
      { content: 'Ruta', styles: { halign: 'center', fontStyle: 'bold'} },
      { content: 'DNI', styles: { halign: 'center', fontStyle: 'bold'} },
      { content: 'Vendedor', styles: { halign: 'center', fontStyle: 'bold'} },
      { content: 'Producto', styles: { halign: 'center', fontStyle: 'bold'} },
      { content: 'Cantidad', styles: { halign: 'center', fontStyle: 'bold' } }
    ];

    // tableData: encabezado incluido en body, headerRows = 1 para que se trate como encabezado
    const tableData: TableData = {
      head: [], // opcional, mantenemos vacío porque usamos body con headerRows
      body: [headerRow, ...filasTabla] as any
    };

    const headerRows = 1; // número de filas de encabezado en body

    // Estilos personalizados para resaltar cambios de ruta y vendedor
    const tableStyles = {
      didParseCell: (data: any) => {
        const rowIndex = data.row.index;
        const colIndex = data.column.index;

        // Si es fila de encabezado, aplicar estilo y salir
        if (rowIndex < headerRows) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = '#141a2f';
          data.cell.styles.textColor = '#d5b689';
          data.cell.styles.halign = 'center';
          return;
        }

        // Ajustar índice para acceder a filasTabla (sin incluir encabezado)
        const dataIndex = rowIndex - headerRows;

        // Variables para detectar cambios
        let esInicioDeNuevaRuta = false;
        let esInicioDeNuevoVendedor = false;

        const filaActual = filasTabla[dataIndex];
        const filaAnterior = dataIndex > 0 ? filasTabla[dataIndex - 1] : null;

        if (!filaAnterior) {
          esInicioDeNuevaRuta = true;
        } else {
          // Verificar si cambió la ruta (columna 1)
          if ((filaActual[1] || '') !== (filaAnterior[1] || '')) {
            esInicioDeNuevaRuta = true;
          }
          // Verificar si cambió el vendedor (misma ruta, distinto vendedor) (columna 3)
          else if ((filaActual[1] || '') === (filaAnterior[1] || '') && (filaActual[3] || '') !== (filaAnterior[3] || '')) {
            esInicioDeNuevoVendedor = true;
          }
        }

        // CASO 1: Nueva ruta completa - Estilo dorado para todas las columnas relevantes
        if (esInicioDeNuevaRuta) {
          if (colIndex <= 3) { // Columnas: #, Ruta, DNI, Vendedor
            data.cell.styles.textColor = [20, 25, 45]; // Color dorado (#D6B68A aproximado)
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // CASO 2: Nuevo vendedor en la misma ruta - Solo resaltar DNI y Vendedor
        else if (esInicioDeNuevoVendedor) {
          if (colIndex === 2 || colIndex === 3) { // Solo columnas DNI y Vendedor
            data.cell.styles.textColor = [20, 25, 45];
            data.cell.styles.fontStyle = 'bold';
          }
        }

        // Centrar contenido de ciertas columnas (#, DNI, Cantidad)
        if (colIndex === 0 || colIndex === 2 || colIndex === 5) {
          data.cell.styles.halign = 'center';
        }

        // Centrar contenido de ruta y vendedor también
        if (colIndex === 1 || colIndex === 3) {
          data.cell.styles.halign = 'center';
        }
      }
    };

    // GENERAR EL PDF
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.productos, tableStyles);
      const pdfUrl = URL.createObjectURL(pdfBlob);
      this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
    } catch (error) {
      console.error('Error al generar PDF:', error);
    }
  }

  limpiarFiltros() {
    this.rutaSeleccionada = null;
  }
}