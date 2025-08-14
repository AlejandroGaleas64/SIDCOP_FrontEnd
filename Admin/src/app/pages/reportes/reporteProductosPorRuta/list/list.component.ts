// reporte-productos.component.ts - VERSIÓN CON CELDAS COMBINADAS
import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';

interface FilaTabla {
  content: string;
  styles?: any;
  rowSpan?: number;
}

@Component({
  selector: 'app-reporte-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
      // Primero por DNI
      if (a.vend_DNI !== b.vend_DNI) {
        return a.vend_DNI.localeCompare(b.vend_DNI);
      }
      // Luego por Vendedor
      if (a.nombreCompleto !== b.nombreCompleto) {
        return a.nombreCompleto.localeCompare(b.nombreCompleto);
      }
      // Finalmente por Ruta
      if (a.ruta_Descripcion !== b.ruta_Descripcion) {
        return a.ruta_Descripcion.localeCompare(b.ruta_Descripcion);
      }
      // Por último por Producto
      return a.prod_DescripcionCorta.localeCompare(b.prod_DescripcionCorta);
    });
  }

  // Generar las filas con rowSpan para celdas combinadas
  private generarFilasConRowSpan(): FilaTabla[][] {
    const filas: FilaTabla[][] = [];
    let contadorVendedores = 0;
    
    for (let i = 0; i < this.productos.length; i++) {
      const producto = this.productos[i];
      const fila: FilaTabla[] = [];

    // Columna # (solo se muestra cuando es un nuevo vendedor)
    const rowSpanDNI = this.calcularRowSpan(i, 'vend_DNI');
    if (rowSpanDNI > 0) {
      contadorVendedores++;
      fila.push({
        content: contadorVendedores.toString(),
        rowSpan: rowSpanDNI,
        styles: { halign: 'center', valign: 'middle' }
      });
    }

      // Columna DNI
      if (rowSpanDNI > 0) {
        fila.push({
          content: producto.vend_DNI || 'N/A',
          rowSpan: rowSpanDNI,
          styles: { halign: 'center', valign: 'middle' }
        });
      }

      // Columna Vendedor
      const rowSpanVendedor = this.calcularRowSpan(i, 'nombreCompleto', 'vend_DNI');
      if (rowSpanVendedor > 0) {
        fila.push({
          content: producto.nombreCompleto || 'N/A',
          rowSpan: rowSpanVendedor,
          styles: { halign: 'center', valign: 'middle' }
        });
      }

      // Columna Ruta
      const rowSpanRuta = this.calcularRowSpan(i, 'ruta_Descripcion', 'vend_DNI', 'nombreCompleto');
      if (rowSpanRuta > 0) {
        fila.push({
          content: producto.ruta_Descripcion || 'N/A',
          rowSpan: rowSpanRuta,
          styles: { halign: 'center', valign: 'middle' }
        });
      }

      // Columna Producto (siempre se muestra)
      fila.push({
        content: producto.prod_DescripcionCorta || 'N/A'
      });

      // Columna Cantidad (siempre se muestra)
      fila.push({
        content: (producto.cantidadVendida || 0).toString(),
        styles: { halign: 'center' }
      });

      filas.push(fila);
    }

    return filas;
  }

  // Calcular cuántas filas debe abarcar una celda
  private calcularRowSpan(indiceActual: number, campo: string, ...camposAdicionales: string[]): number {
    const productoActual = this.productos[indiceActual];
    
    // Verificar si debemos mostrar esta celda
    if (indiceActual > 0) {
      const productoAnterior = this.productos[indiceActual - 1];
      
      // Verificar si algún campo de dependencia cambió
      for (const campoAdicional of camposAdicionales) {
        if (productoAnterior[campoAdicional] !== productoActual[campoAdicional]) {
          // Si cambió un campo de dependencia, mostrar esta celda
          break;
        }
      }
      
      // Si todos los campos de dependencia son iguales
      const todosLosCamposDependenciaIguales = camposAdicionales.every(campoAdicional => 
        productoAnterior[campoAdicional] === productoActual[campoAdicional]
      );
      
      // Y el campo actual también es igual, entonces no mostrar
      if (todosLosCamposDependenciaIguales && productoAnterior[campo] === productoActual[campo]) {
        return 0; // No mostrar esta celda
      }
    }

    // Contar cuántas filas consecutivas tienen el mismo valor para este campo y sus dependencias
    let count = 1;
    for (let i = indiceActual + 1; i < this.productos.length; i++) {
      const siguienteProducto = this.productos[i];
      
      // Verificar si el campo actual es diferente
      if (siguienteProducto[campo] !== productoActual[campo]) break;
      
      // Verificar si algún campo de dependencia es diferente
      let algunCampoDependendenciaDiferente = false;
      for (const campoAdicional of camposAdicionales) {
        if (siguienteProducto[campoAdicional] !== productoActual[campoAdicional]) {
          algunCampoDependendenciaDiferente = true;
          break;
        }
      }
      
      if (algunCampoDependendenciaDiferente) break;
      count++;
    }

    return count;
  }

  async generarPDF() {
    // CONFIGURACIÓN DEL REPORTE
    const config: ReportConfig = {
      titulo: 'REPORTE DE PRODUCTOS VENDIDOS POR RUTA',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de productos vendidos: ${this.productos.reduce((total, producto) => total + (producto.cantidadVendida || 0), 0)}`
    };

    // DATOS DE LA TABLA CON CELDAS COMBINADAS
    const filasConRowSpan = this.generarFilasConRowSpan();
    
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 20 } },
          { content: 'DNI', styles: { cellWidth: 50, halign: 'center' } },
          { content: 'Vendedor', styles: { cellWidth: 65, halign: 'center' } },
          { content: 'Ruta', styles: { cellWidth: 50, halign: 'center' } },
          { content: 'Producto', styles: { cellWidth: 60, halign: 'center' } },
          { content: 'Cantidad', styles: { cellWidth: 20, halign: 'center' } }
        ]
      ],
      body: filasConRowSpan
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
    this.rutaSeleccionada = null;
  }
}