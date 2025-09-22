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
    
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 20 } },
          { content: 'Ruta', styles: { cellWidth: 50, halign: 'center' } },
          { content: 'DNI', styles: { cellWidth: 50, halign: 'center' } },
          { content: 'Vendedor', styles: { cellWidth: 65, halign: 'center' } },
          { content: 'Producto', styles: { cellWidth: 60, halign: 'center' } },
          { content: 'Cantidad', styles: { cellWidth: 20, halign: 'center' } }
        ]
      ],
      body: filasTabla
    };

    // Estilos personalizados para resaltar cambios de ruta y vendedor
    const tableStyles = {
      didParseCell: (data: any) => {
        const rowIndex = data.row.index;
        const colIndex = data.column.index;
        
        // Variables para detectar cambios
        let esInicioDeNuevaRuta = false;
        let esInicioDeNuevoVendedor = false;
        
        if (rowIndex === 0) {
          // Primera fila siempre es inicio de ruta
          esInicioDeNuevaRuta = true;
        } else if (rowIndex > 0) {
          // Comparar con la fila anterior
          const filaActual = filasTabla[rowIndex];
          const filaAnterior = filasTabla[rowIndex - 1];
          
          // Verificar si cambió la ruta
          if (filaActual[1] !== filaAnterior[1]) { // Columna 1 es la ruta
            esInicioDeNuevaRuta = true;
          }
          // Verificar si cambió el vendedor (pero la ruta es la misma)
          else if (filaActual[1] === filaAnterior[1] && filaActual[3] !== filaAnterior[3]) { // Misma ruta, distinto vendedor (columna 3)
            esInicioDeNuevoVendedor = true;
          }
        }
        
        // CASO 1: Nueva ruta completa - Estilo dorado para todas las columnas relevantes
        if (esInicioDeNuevaRuta) {
          if (colIndex <= 3) { // Columnas: #, Ruta, DNI, Vendedor
            data.cell.styles.textColor = [20, 25, 45]; // Color dorado (#D6B68A)
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // CASO 2: Nuevo vendedor en la misma ruta - Solo resaltar DNI y Vendedor
        else if (esInicioDeNuevoVendedor) {
          if (colIndex === 2 || colIndex === 3) { // Solo columnas DNI y Vendedor
            data.cell.styles.textColor = [20, 25, 45]; // Color dorado (#D6B68A)
            data.cell.styles.fontStyle = 'bold';
          }
        }
        
        // Centrar contenido de ciertas columnas
        if (colIndex === 0 || colIndex === 2 || colIndex === 5) { // #, DNI, Cantidad
          data.cell.styles.halign = 'center';
        }
        
        // Centrar contenido de ruta y vendedor también
        if (colIndex === 1 || colIndex === 3) { // Ruta, Vendedor
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