import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfReportService, ReportConfig, TableData } from 'src/app/reporteGlobal';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';

// reporte-vendedores.component.ts - VERSIÓN CON CELDAS COMBINADAS
interface FilaTabla {
  content: string;
  styles?: any;
  rowSpan?: number;
}

@Component({
  selector: 'app-list',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})

export class ReporteVendedoresPorRutaComponent implements OnInit {
  vendedores: any[] = [];
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

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReporteVendedoresPorRuta`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
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

  // Ordenar los datos para agrupar por DNI, Vendedor y Ruta
  private ordenarDatos(vendedores: any[]): any[] {
    return vendedores.sort((a, b) => {
      // Primero por DNI
      if (a.Vend_DNI !== b.Vend_DNI) {
        return a.Vend_DNI.localeCompare(b.Vend_DNI);
      }
      // Luego por Vendedor
      if (a.Vendedor !== b.Vendedor) {
        return a.Vendedor.localeCompare(b.Vendedor);
      }
      // Finalmente por Ruta
      if (a.Ruta_Descripcion !== b.Ruta_Descripcion) {
        return a.Ruta_Descripcion.localeCompare(b.Ruta_Descripcion);
      }
      // Por último por vendedor
      return a.prod_DescripcionCorta.localeCompare(b.prod_DescripcionCorta);
    });
  }

  // Generar las filas con rowSpan para celdas combinadas
  private generarFilasConRowSpan(): FilaTabla[][] {
  const filas: FilaTabla[][] = [];
  let contador = 0;

  // Ordenar por Ruta_Descripcion para agrupar correctamente
  const vendedoresOrdenados = [...this.vendedores].sort((a, b) => {
    if (a.Ruta_Descripcion !== b.Ruta_Descripcion) {
      return a.Ruta_Descripcion.localeCompare(b.Ruta_Descripcion);
    }
    return 0;
  });

  for (let i = 0; i < vendedoresOrdenados.length; i++) {
    const vendedor = vendedoresOrdenados[i];
    const fila: FilaTabla[] = [];

    // Calcular rowSpan para Ruta_Descripcion
    const rowSpanRuta = this.calcularRowSpanRuta(i, vendedoresOrdenados);

    // Columna #
    contador++;
    fila.push({
      content: contador.toString(),
      styles: { halign: 'center', valign: 'middle' }
    });

    // Columna Ruta_Descripcion (solo se muestra cuando rowSpan > 0)
    if (rowSpanRuta > 0) {
      fila.push({
        content: vendedor.Ruta_Descripcion || 'N/A',
        rowSpan: rowSpanRuta,
        styles: { valign: 'middle' }
      });
    }

    // Si no se muestra la ruta en esta fila, agregar celda vacía para mantener el orden
    else {
      fila.push({ content: '', styles: {} });
    }

    // Columna Vend_DNI (siempre se muestra)
    fila.push({
      content: vendedor.Vend_DNI || 'N/A'
    });

    // Columna Vend_Codigo (siempre se muestra)
    fila.push({
      content: vendedor.Vend_Codigo || 'N/A'
    });

    // Columna Vendedor (siempre se muestra)
    fila.push({
      content: vendedor.Vendedor || 'N/A'
    });

    filas.push(fila);
  }

  return filas;
}

// Calcular rowSpan para Ruta_Descripcion
private calcularRowSpanRuta(indiceActual: number, vendedores: any[]): number {
  const actual = vendedores[indiceActual];
  if (indiceActual > 0) {
    const anterior = vendedores[indiceActual - 1];
    if (anterior.Ruta_Descripcion === actual.Ruta_Descripcion) {
      return 0;
    }
  }
  // Contar cuántas filas consecutivas tienen la misma ruta
  let count = 1;
  for (let i = indiceActual + 1; i < vendedores.length; i++) {
    if (vendedores[i].Ruta_Descripcion !== actual.Ruta_Descripcion) break;
    count++;
  }
  return count;
}
  // Calcular cuántas filas debe abarcar una celda
  private calcularRowSpan(indiceActual: number, campo: string, ...camposAdicionales: string[]): number {
    const vendedorActual = this.vendedores[indiceActual];
    
    // Verificar si debemos mostrar esta celda
    if (indiceActual > 0) {
      const vendedorAnterior = this.vendedores[indiceActual - 1];
      
      // Verificar si algún campo de dependencia cambió
      for (const campoAdicional of camposAdicionales) {
        if (vendedorAnterior[campoAdicional] !== vendedorActual[campoAdicional]) {
          // Si cambió un campo de dependencia, mostrar esta celda
          break;
        }
      }
      
      // Si todos los campos de dependencia son iguales
      const todosLosCamposDependenciaIguales = camposAdicionales.every(campoAdicional => 
        vendedorAnterior[campoAdicional] === vendedorActual[campoAdicional]
      );
      
      // Y el campo actual también es igual, entonces no mostrar
      if (todosLosCamposDependenciaIguales && vendedorAnterior[campo] === vendedorActual[campo]) {
        return 0; // No mostrar esta celda
      }
    }

    // Contar cuántas filas consecutivas tienen el mismo valor para este campo y sus dependencias
    let count = 1;
    for (let i = indiceActual + 1; i < this.vendedores.length; i++) {
      const siguientevendedor = this.vendedores[i];
      
      // Verificar si el campo actual es diferente
      if (siguientevendedor[campo] !== vendedorActual[campo]) break;
      
      // Verificar si algún campo de dependencia es diferente
      let algunCampoDependendenciaDiferente = false;
      for (const campoAdicional of camposAdicionales) {
        if (siguientevendedor[campoAdicional] !== vendedorActual[campoAdicional]) {
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
      titulo: 'REPORTE DE VENDEDORES POR RUTA',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de vendedores: ${this.vendedores.length}`,
    };

    // DATOS DE LA TABLA CON CELDAS COMBINADAS
    const filasConRowSpan = this.generarFilasConRowSpan();
    
    const tableData: TableData = {
      head: [
        [
          { content: '#', styles: { halign: 'center', cellWidth: 20 } },
          { content: 'Ruta', styles: { cellWidth: 60, halign: 'center' } },
          { content: 'DNI', styles: { cellWidth: 50, halign: 'center' } },
          { content: 'Codigo Vendedor', styles: { cellWidth: 50, halign: 'center' } },
          { content: 'Vendedor', styles: { cellWidth: 90, halign: 'center' } }
        ]
      ],
      body: filasConRowSpan
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

  limpiarFiltros() {
    this.rutaSeleccionada = null;
  }
}