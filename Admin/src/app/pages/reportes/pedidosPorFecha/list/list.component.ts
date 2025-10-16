import { Component, OnInit } from '@angular/core';
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

export class ReportePedidosPorFechaComponent implements OnInit {
  pedidos: any[] = [];
  sucursales: any[] = [];
  vendedores: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  sucu_Id: number | null = null;
  vendedorId: number | null = null;
  contadorpedidos = 0;

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
        this.vendedores = data;
      },
      error: (error) => {
        console.error('Error al cargar vendedores:', error);
      }
    });
  }

  generarReporte(){
    this.cargando = true;

    const params: any = {}
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;
    if (this.sucu_Id) params.sucu_Id = this.sucu_Id;
    if (this.vendedorId) params.vendedorId = this.vendedorId;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReportePedidosPorFecha`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        //console.log('Parámetros de reporte:', params);
        //console.log('Datos del reporte:', data);
        this.pedidos = data;
        this.generarPdf();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al generar el reporte:', error);
        this.cargando = false;
      }
    });
  }

  // Helper: Calcula el rowSpan para una columna, considerando dependencias
  private calcularRowSpanPedidos(indiceActual: number, campo: string, ...camposAdicionales: string[]): number {
    const pedidos = this.pedidos;
    const actual = pedidos[indiceActual];

    // ¿Debemos mostrar esta celda?
    if (indiceActual > 0) {
      const anterior = pedidos[indiceActual - 1];
      // Si algún campo de dependencia cambió, mostrar la celda
      for (const campoDep of camposAdicionales) {
        if (anterior[campoDep] !== actual[campoDep]) break;
      }
      // Si todos los campos de dependencia son iguales y el campo actual también, no mostrar
      const iguales = camposAdicionales.every(dep => anterior[dep] === actual[dep]);
      if (iguales && anterior[campo] === actual[campo]) return 0;
    }

    // Contar cuántas filas consecutivas tienen el mismo valor para este campo y dependencias
    let count = 1;
    for (let i = indiceActual + 1; i < pedidos.length; i++) {
      const siguiente = pedidos[i];
      if (siguiente[campo] !== actual[campo]) break;
      let depDif = false;
      for (const campoDep of camposAdicionales) {
        if (siguiente[campoDep] !== actual[campoDep]) {
          depDif = true;
          break;
        }
      }
      if (depDif) break;
      count++;
    }
    return count;
  }

  // Genera las filas con rowSpan para la tabla de pedidos
  private generarFilasConRowSpan(): any[][] {
    const filas: any[][] = [];
    let contador = 0;

    // Ordenar los pedidos por los campos de agrupación para asegurar agrupamiento correcto
    const pedidosOrdenados = [...this.pedidos].sort((a, b) => {
      const keys = ['Pedi_FechaPedido', 'Sucursal', 'Vendedor', 'Negocio', 'Cliente'];
      for (const key of keys) {
        if (a[key] < b[key]) return -1;
        if (a[key] > b[key]) return 1;
      }
      return 0;
    });

    this.pedidos = pedidosOrdenados;

    for (let i = 0; i < this.pedidos.length; i++) {
      const pedido = this.pedidos[i];
      const fila: any[] = [];

      // Calcular rowSpans
      const rowSpanFecha = this.calcularRowSpanPedidos(i, 'Pedi_FechaPedido');
      const rowSpanSucursal = this.calcularRowSpanPedidos(i, 'Sucursal', 'Pedi_FechaPedido');
      const rowSpanVendedor = this.calcularRowSpanPedidos(i, 'Vendedor', 'Pedi_FechaPedido', 'Sucursal');
      const rowSpanNegocio = this.calcularRowSpanPedidos(i, 'Negocio', 'Pedi_FechaPedido', 'Sucursal', 'Vendedor');
      const rowSpanCliente = this.calcularRowSpanPedidos(i, 'Cliente', 'Pedi_FechaPedido', 'Sucursal', 'Vendedor', 'Negocio');

      // Solo en la primera fila del grupo, agregamos las celdas con rowSpan
      if (rowSpanFecha > 0) {
        contador++;
        fila.push({
          content: contador.toString(),
          rowSpan: rowSpanFecha,
          styles: { halign: 'center', valign: 'middle', cellWidth: 15 }
        });
        fila.push({
          content: this.formatearFecha(pedido.Pedi_FechaPedido) || 'N/A',
          rowSpan: rowSpanFecha,
          styles: { valign: 'middle', cellWidth: 35 }
        });
        fila.push({
          content: pedido.Sucursal || 'N/A',
          rowSpan: rowSpanSucursal,
          styles: { valign: 'middle', cellWidth: 40 }
        });
        fila.push({
          content: pedido.Vendedor || 'N/A',
          rowSpan: rowSpanVendedor,
          styles: { valign: 'middle', cellWidth: 40 }
        });
        fila.push({
          content: pedido.Negocio || 'N/A',
          rowSpan: rowSpanNegocio,
          styles: { valign: 'middle', cellWidth: 45 }
        });
        fila.push({
          content: pedido.Cliente || 'N/A',
          rowSpan: rowSpanCliente,
          styles: { valign: 'middle', cellWidth: 40 }
        });
        
      } else if (rowSpanSucursal > 0) {
        fila.push({
          content: pedido.Sucursal || 'N/A',
          rowSpan: rowSpanSucursal,
          styles: { valign: 'middle', cellWidth: 40 }
        });
        fila.push({
          content: pedido.Vendedor || 'N/A',
          rowSpan: rowSpanVendedor,
          styles: { valign: 'middle', cellWidth: 40 }
        });
        fila.push({
          content: pedido.Negocio || 'N/A',
          rowSpan: rowSpanNegocio,
          styles: { valign: 'middle', cellWidth: 45 }
        });
        fila.push({
          content: pedido.Cliente || 'N/A',
          rowSpan: rowSpanCliente,
          styles: { valign: 'middle', cellWidth: 40 }
        });
      } else if (rowSpanVendedor > 0) {
        fila.push({
          content: pedido.Vendedor || 'N/A',
          rowSpan: rowSpanVendedor,
          styles: { valign: 'middle', cellWidth: 40 }
        });
        fila.push({
          content: pedido.Negocio || 'N/A',
          rowSpan: rowSpanNegocio,
          styles: { valign: 'middle', cellWidth: 45 }
        });
        fila.push({
          content: pedido.Cliente || 'N/A',
          rowSpan: rowSpanCliente,
          styles: { valign: 'middle', cellWidth: 40 }
        });
      } else if (rowSpanNegocio > 0) {
        fila.push({
          content: pedido.Negocio || 'N/A',
          rowSpan: rowSpanNegocio,
          styles: { valign: 'middle', cellWidth: 45 }
        });
        fila.push({
          content: pedido.Cliente || 'N/A',
          rowSpan: rowSpanCliente,
          styles: { valign: 'middle', cellWidth: 40 }
        });
      } else if (rowSpanCliente > 0) {
        fila.push({
          content: pedido.Cliente || 'N/A',
          rowSpan: rowSpanCliente,
          styles: { valign: 'middle', cellWidth: 40 }
        });
      }
      
      // Producto (siempre se muestra)
      fila.push({
        content: pedido.Producto || 'N/A',
        styles: { cellWidth: 35 }
      });

      // Cantidad (siempre se muestra)
      fila.push({
        content: pedido.Cantidad != null ? pedido.Cantidad.toString() : '',
        styles: { halign: 'right', cellWidth: 20 }
      });
      
      filas.push(fila);
    }

    this.contadorpedidos = contador;

    return filas;
  }

  private formatearFecha(fecha: string): string {
    if (!fecha) return 'N/A';
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  async generarPdf() {
    const filasConRowSpan = this.generarFilasConRowSpan();
    //console.log(filasConRowSpan);
    
    const config: ReportConfig = {
      titulo: 'PEDIDOS SEGÚN FECHA',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de pedidos: ${this.contadorpedidos}`,
    }

    const tableData: TableData = {
      head:[
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Fecha', styles: { cellWidth: 35 } },
          { content: 'Sucursal', styles: { cellWidth: 40 } },
          { content: 'Vendedor', styles: { cellWidth: 40 } },
          { content: 'Negocio', styles: { cellWidth: 45 } },
          { content: 'Cliente', styles: { cellWidth: 40 } },
          { content: 'Producto', styles: { cellWidth: 35 } },
          { content: 'Cantidad', styles: { halign: 'right', cellWidth: 20 } }
        ]
      ],
      body: filasConRowSpan
    }
    
    try {
      const pdfBlob = await this.pdfService.generarReportePDF(config, tableData, this.pedidos);
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
      const vendedor = this.vendedores.find(v => v.vend_Id === this.vendedorId);
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