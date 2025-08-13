
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



export class ReportePedidosPorFechaComponent{
  pedidos: any[] = [];
  pdfUrl: SafeResourceUrl | null = null;
  cargando = false;

  // Filtros
  fechaInicio: string | null = null;
  fechaFin: string | null = null;
  contadorpedidos = 0;

  constructor(
    private http: HttpClient, 
    private sanitizer: DomSanitizer,
    private pdfService: PdfReportService
  ) {}

  generarReporte(){
    this.cargando = true;

    const params: any = {}
    if (this.fechaInicio) params.fechaInicio = this.fechaInicio;
    if (this.fechaFin) params.fechaFin = this.fechaFin;

    this.http.get<any[]>(`${environment.apiBaseUrl}/Reportes/ReportePedidosPorFecha`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
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
    const keys = ['Pedi_FechaPedido', 'Vendedor', 'Negocio', 'Cliente'];
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
    const rowSpanVendedor = this.calcularRowSpanPedidos(i, 'Vendedor', 'Pedi_FechaPedido');
    const rowSpanNegocio = this.calcularRowSpanPedidos(i, 'Negocio', 'Pedi_FechaPedido', 'Vendedor');
    const rowSpanCliente = this.calcularRowSpanPedidos(i, 'Cliente', 'Pedi_FechaPedido', 'Vendedor', 'Negocio');

    // Solo en la primera fila del grupo, agregamos las celdas con rowSpan
    if (rowSpanFecha > 0) {
      contador++;
      fila.push({
        content: contador.toString(),
        rowSpan: rowSpanFecha,
        styles: { halign: 'center', valign: 'middle', cellWidth: 15 }
      });
      fila.push({
        content: pedido.Pedi_FechaPedido || 'N/A',
        rowSpan: rowSpanFecha,
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
        styles: { valign: 'middle', cellWidth: 60 }
      });
      fila.push({
        content: pedido.Cliente || 'N/A',
        rowSpan: rowSpanCliente,
        styles: { valign: 'middle', cellWidth: 35 }
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
        styles: { valign: 'middle', cellWidth: 60 }
      });
      fila.push({
        content: pedido.Cliente || 'N/A',
        rowSpan: rowSpanCliente,
        styles: { valign: 'middle', cellWidth: 35 }
      });
    } else if (rowSpanNegocio > 0) {
      fila.push({
        content: pedido.Negocio || 'N/A',
        rowSpan: rowSpanNegocio,
        styles: { valign: 'middle', cellWidth: 60 }
      });
      fila.push({
        content: pedido.Cliente || 'N/A',
        rowSpan: rowSpanCliente,
        styles: { valign: 'middle', cellWidth: 35 }
      });
    } else if (rowSpanCliente > 0) {
      fila.push({
        content: pedido.Cliente || 'N/A',
        rowSpan: rowSpanCliente,
        styles: { valign: 'middle', cellWidth: 35 }
      });
    }
    // Producto (siempre se muestra)
    fila.push({
      content: pedido.Producto || 'N/A',
      styles: { cellWidth: 40 }
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



// private generarFilasConRowSpan(): any[][] {
//   const filas: any[][] = [];
//   let contador = 0;

//   // Ordenar los pedidos por los campos de agrupación para asegurar agrupamiento correcto
//   const pedidosOrdenados = [...this.pedidos].sort((a, b) => {
//     const keys = ['Pedi_FechaPedido', 'Vendedor', 'Negocio', 'Cliente'];
//     for (const key of keys) {
//       if (a[key] < b[key]) return -1;
//       if (a[key] > b[key]) return 1;
//     }
//     return 0;
//   });

//   this.pedidos = pedidosOrdenados;

//   for (let i = 0; i < this.pedidos.length; i++) {
//     const pedido = this.pedidos[i];
//     const fila: any[] = [];

//     // Calcular rowSpans
//     const rowSpanFecha = this.calcularRowSpanPedidos(i, 'Pedi_FechaPedido');
//     const rowSpanVendedor = this.calcularRowSpanPedidos(i, 'Vendedor', 'Pedi_FechaPedido');
//     const rowSpanNegocio = this.calcularRowSpanPedidos(i, 'Negocio', 'Pedi_FechaPedido', 'Vendedor');
//     const rowSpanCliente = this.calcularRowSpanPedidos(i, 'Cliente', 'Pedi_FechaPedido', 'Vendedor', 'Negocio');

//     // Solo en la primera fila del grupo, agregamos las celdas con rowSpan
//     if (rowSpanFecha > 0) {
//       contador++;
//       fila.push({
//         content: contador.toString(),
//         rowSpan: rowSpanFecha,
//         styles: { halign: 'center', valign: 'middle', cellWidth: 15 }
//       });
//       fila.push({
//         content: pedido.Pedi_FechaPedido || 'N/A',
//         rowSpan: rowSpanFecha,
//         styles: { valign: 'middle', cellWidth: 40 }
//       });
//       fila.push({
//         content: pedido.Vendedor || 'N/A',
//         rowSpan: rowSpanVendedor,
//         styles: { valign: 'middle', cellWidth: 40 }
//       });
//       fila.push({
//         content: pedido.Negocio || 'N/A',
//         rowSpan: rowSpanNegocio,
//         styles: { valign: 'middle', cellWidth: 60 }
//       });
//       fila.push({
//         content: pedido.Cliente || 'N/A',
//         rowSpan: rowSpanCliente,
//         styles: { valign: 'middle', cellWidth: 35 }
//       });
//     } else if (rowSpanVendedor > 0) {
//       // Si solo cambia el vendedor, agregamos solo desde vendedor en adelante
//       fila.push({
//         content: pedido.Vendedor || 'N/A',
//         rowSpan: rowSpanVendedor,
//         styles: { valign: 'middle', cellWidth: 40 }
//       });
//       fila.push({
//         content: pedido.Negocio || 'N/A',
//         rowSpan: rowSpanNegocio,
//         styles: { valign: 'middle', cellWidth: 60 }
//       });
//       fila.push({
//         content: pedido.Cliente || 'N/A',
//         rowSpan: rowSpanCliente,
//         styles: { valign: 'middle', cellWidth: 35 }
//       });
//     } else if (rowSpanNegocio > 0) {
//       // Si solo cambia el negocio, agregamos solo desde negocio en adelante
//       fila.push({
//         content: pedido.Negocio || 'N/A',
//         rowSpan: rowSpanNegocio,
//         styles: { valign: 'middle', cellWidth: 60 }
//       });
//       fila.push({
//         content: pedido.Cliente || 'N/A',
//         rowSpan: rowSpanCliente,
//         styles: { valign: 'middle', cellWidth: 35 }
//       });
//     } else if (rowSpanCliente > 0) {
//       // Si solo cambia el cliente, agregamos solo cliente
//       fila.push({
//         content: pedido.Cliente || 'N/A',
//         rowSpan: rowSpanCliente,
//         styles: { valign: 'middle', cellWidth: 35 }
//       });
//     }
//     // Producto (siempre se muestra)
//     fila.push({
//       content: pedido.Producto || 'N/A',
//       styles: { cellWidth: 40 }
//     });

//     // Cantidad (siempre se muestra)
//     fila.push({
//       content: pedido.Cantidad != null ? pedido.Cantidad.toString() : '',
//       styles: { halign: 'right', cellWidth: 20 }
//     });

//     // Asegúrate de que cada fila tenga exactamente 7 columnas
//     while (fila.length < 7) {
//       fila.unshift({ content: '', styles: {} });
//     }

//     filas.push(fila);
//   }

//   return filas;
// }
//   private generarFilasConRowSpan(): any[][] {
//   const filas: any[][] = [];
//   let contador = 0;

//   // Agrupar por Pedi_FechaPedido, Vendedor, Negocio, Cliente
//   const grupos = this.pedidos.reduce((acc, pedido) => {
//     const key = [
//       pedido.Pedi_FechaPedido,
//       pedido.Vendedor,
//       pedido.Negocio,
//       pedido.Cliente
//     ].join('|');
//     if (!acc[key]) acc[key] = [];
//     acc[key].push(pedido);
//     return acc;
//   }, {} as { [key: string]: any[] });

//   Object.values(grupos).forEach((grupo: any) => {
//     const rowSpan = grupo.length;
//     grupo.forEach((pedido: any, idx: number) => {
//       const fila: any[] = [];
//       if (idx === 0) {
//         contador++;
//         fila.push({ content: contador.toString(), rowSpan, styles: { halign: 'center', cellWidth: 15, valign: 'middle' } });
//         fila.push({ content: pedido.Pedi_FechaPedido, rowSpan, styles: { cellWidth: 40, valign: 'middle' } });
//         fila.push({ content: pedido.Vendedor, rowSpan, styles: { cellWidth: 40, valign: 'middle' } });
//         fila.push({ content: pedido.Negocio, rowSpan, styles: { cellWidth: 60, valign: 'middle' } });
//         fila.push({ content: pedido.Cliente, rowSpan, styles: { cellWidth: 35, valign: 'middle' } });
//       } else {
//         // 5 empty cells for the rowspanned columns
//         for (let i = 0; i < 5; i++) fila.push({ content: '', styles: {} });
//       }
//       // Always push Producto and Cantidad
//       fila.push({ content: pedido.Producto, styles: { cellWidth: 40 } });
//       fila.push({ content: pedido.Cantidad, styles: { halign: 'right', cellWidth: 20 } });
//       filas.push(fila);
//     });
//     // grupo.forEach((pedido: any, idx: number) => {
//     //   const fila: any[] = [];
//     //   // # (solo en la primera fila del grupo)
//     //   if (idx === 0) {
//     //     contador++;
//     //     fila.push({
//     //       content: contador.toString(),
//     //       rowSpan,
//     //       styles: { halign: 'center', cellWidth: 15, valign: 'middle' }
//     //     });
//     //     fila.push({
//     //       content: pedido.Pedi_FechaPedido,
//     //       rowSpan,
//     //       styles: { cellWidth: 40, valign: 'middle' }
//     //     });
//     //     fila.push({
//     //       content: pedido.Vendedor,
//     //       rowSpan,
//     //       styles: { cellWidth: 40, valign: 'middle' }
//     //     });
//     //     fila.push({
//     //       content: pedido.Negocio,
//     //       rowSpan,
//     //       styles: { cellWidth: 60, valign: 'middle' }
//     //     });
//     //     fila.push({
//     //       content: pedido.Cliente,
//     //       rowSpan,
//     //       styles: { cellWidth: 35, valign: 'middle' }
//     //     });
//     //   }
//     //   // Si no es la primera fila del grupo, agregar celdas vacías para mantener el orden
//     //   else {
//     //     for (let i = 0; i < 5; i++) fila.push({ content: '', styles: {} });
//     //   }
//     //   // Producto y Cantidad siempre se muestran
//     //   fila.push({
//     //     content: pedido.Producto,
//     //     styles: { cellWidth: 40 }
//     //   });
//     //   fila.push({
//     //     content: pedido.Cantidad,
//     //     styles: { halign: 'right', cellWidth: 20 }
//     //   });
//     //   filas.push(fila);
//     // });
//   });

//   return filas;
// }

  async generarPdf() {


    const filasConRowSpan = this.generarFilasConRowSpan();
    console.log(filasConRowSpan);
    
    const config: ReportConfig = {
      titulo: 'Pedidos Segun Fecha',
      orientacion: 'landscape',
      mostrarResumen: true,
      textoResumen: `Total de pedidos: ${this.contadorpedidos}`,
      filtros: this.construirFiltros()
    }

    

    const tableData: TableData = {
      head:[
        [
          { content: '#', styles: { halign: 'center', cellWidth: 15 } },
          { content: 'Fecha', styles: { cellWidth: 40 } },
          { content: 'Vendedor', styles: { cellWidth: 40 } },
          { content: 'Negocio', styles: { cellWidth: 60 } },
          { content: 'Cliente', styles: { cellWidth: 35 } },
          { content: 'Producto', styles: {cellWidth: 40 } },
          { content: 'Cantidad', styles: { halign: 'right', cellWidth: 20 } }
        ]
      ],
      body:filasConRowSpan
      // this.pedidos.map((cliente, index) => [
      //   { content: (index + 1).toString(), styles: { halign: 'center', cellWidth: 15 } },
      //   { content: cliente.Pedi_FechaPedido, styles: { cellWidth: 40 } },
      //   { content: cliente.Vendedor, styles: { cellWidth: 40 } },
      //   { content: cliente.Negocio, styles: { cellWidth: 60 } },
      //   { content: cliente.Cliente, styles: { cellWidth: 35 } },
      //   { content: cliente.Producto, styles: {cellWidth: 40 } },
      //   { content: cliente.Cantidad, styles: { halign: 'right', cellWidth: 20 } }
      // ])
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

    return filtros;
  }

  limpiarFiltros() {
    this.fechaInicio = null;
    this.fechaFin = null;
  }
}
