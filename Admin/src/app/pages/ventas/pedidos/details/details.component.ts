import {
  Component,
  Output,
  EventEmitter,
  Input,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Pedido } from 'src/app/Modelos/ventas/Pedido.Model';
import { environment } from 'src/environments/environment.prod';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss',
})
export class DetailsComponent implements OnChanges {
  @Input() PedidoData: Pedido | null = null;
  @Output() onClose = new EventEmitter<void>();

  PedidoDetalle: Pedido | null = null;
  productos: any[] = [];
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';
  referenciasLista = [];
  clientesLista = [];
  referenciasNombre: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['PedidoData'] && changes['PedidoData'].currentValue) {
      this.cargarDetallesSimulado(changes['PedidoData'].currentValue);
    }
  }

  // Simulación de carga
  cargarDetallesSimulado(data: Pedido): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.PedidoDetalle = { ...data };
        this.productos = JSON.parse(this.PedidoDetalle.detallesJson ?? '[]');
        this.cargando = false;
      } catch (error) {
        console.error('Error al cargar detalles del pedido:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles del pedido.';
        this.cargando = false;
      }
    }, 500);
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

    // ===== MÉTODOS PRIVADOS PARA PDF (basados en PdfReportService) =====
  
    private readonly COLORES = {
    dorado: '#D6B68A',
    azulOscuro: '#141a2f',
    blanco: '#FFFFFF',
    grisClaro: '#F8F9FA',
    grisTexto: '#666666'
  };
  
    private async cargarLogo(): Promise<string | null> {
      if (!this.configuracionEmpresa?.coFa_Logo) {
        console.log('No hay logo configurado');
        return null;
      }
  
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              console.error('No se pudo obtener el contexto del canvas');
              resolve(null);
              return;
            }
            
            const maxWidth = 120;
            const maxHeight = 60;
            let { width, height } = img;
            
            if (width > height) {
              if (width > maxWidth) {
                height = height * (maxWidth / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = width * (maxHeight / height);
                height = maxHeight;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, width, height);
            
            const dataUrl = canvas.toDataURL('image/png', 0.8);
            console.log('Logo procesado correctamente desde URL');
            resolve(dataUrl);
          } catch (e) {
            console.error('Error al procesar el logo:', e);
            resolve(null);
          }
        };
        
        img.onerror = (error) => {
          console.error('Error al cargar el logo desde URL:', error);
          resolve(null);
        };
        
        try {
          const logoUrl = this.configuracionEmpresa.coFa_Logo;
          console.log('Intentando cargar logo desde:', logoUrl);
          
          if (logoUrl.startsWith('http')) {
            img.src = logoUrl;
          } else if (logoUrl.startsWith('data:')) {
            img.src = logoUrl;
          } else {
            img.src = `data:image/png;base64,${logoUrl}`;
          }
        } catch (e) {
          console.error('Error al configurar src del logo:', e);
          resolve(null);
        }
      });
    }
  

  

  
  constructor(private http: HttpClient) {
    this.cargarConfiguracionEmpresa();
  }


  private configuracionEmpresa: any = null;

   private cargarConfiguracionEmpresa() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/ConfiguracionFactura/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.configuracionEmpresa = data[0];
        }
      },
      error: (error) => {
        console.error('Error al cargar configuración de empresa:', error);
      }
    });
  }

  imprimirPedido(): void {
    const doc = new jsPDF();

    // Crear encabezado
    this.crearEncabezado(doc).then((yPos) => {
      // Detalles del pedido
      this.agregarDetallesPedido(doc, yPos);

      // Detalles de los productos
      this.agregarProductos(doc, yPos + 20);

      // Agregar pie de página
      this.crearPiePagina(doc, { pageNumber: 1 });

      // Generar el PDF
      const blobUrl = doc.output('bloburl');
window.open(blobUrl, '_blank');
    });
  }

 private async crearEncabezado(doc: jsPDF): Promise<number> {
  doc.setDrawColor(this.COLORES.dorado);
  doc.setLineWidth(2);
  doc.line(20, 35, doc.internal.pageSize.width - 20, 35);

  const logoDataUrl = await this.cargarLogo();
  if (logoDataUrl) {
    doc.addImage(logoDataUrl, 'PNG', 20, 5, 30, 25);
  }

  const pageWidth = doc.internal.pageSize.width;

  doc.setTextColor(this.COLORES.azulOscuro);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  const nombreEmpresa = this.configuracionEmpresa?.coFa_NombreEmpresa || 'Empresa S.A.';
  doc.text(nombreEmpresa, pageWidth / 2, 15, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`Factura No. ${this.PedidoData?.pedi_Id}`, pageWidth / 2, 27, { align: 'center' });

  return 40;
}


private agregarDetallesPedido(doc: jsPDF, yPos: number): void {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const fechaPedido = this.PedidoDetalle?.pedi_FechaPedido;
  const fechaEntrega = this.PedidoDetalle?.pedi_FechaEntrega;

  doc.text(`Negocio: ${this.PedidoDetalle?.clie_NombreNegocio}`, 20, yPos);
  doc.text(`Fecha Pedido: ${fechaPedido}`, 130, yPos);

  yPos += 8;
  doc.text(`Vendedor: ${this.PedidoDetalle?.vend_Nombres} ${this.PedidoDetalle?.vend_Apellidos}`, 20, yPos);
  doc.text(`Fecha Entrega: ${fechaEntrega}`, 130, yPos);

  yPos += 10;
  doc.setDrawColor(this.COLORES.dorado);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, doc.internal.pageSize.width - 20, yPos);
}


private agregarProductos(doc: jsPDF, yPos: number): void {
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalle de Productos', 20, yPos);
  yPos += 6;

  // Encabezados
  doc.setFillColor(220, 220, 220); // gris claro
  doc.setDrawColor(180, 180, 180);
  doc.rect(20, yPos, 170, 8, 'FD'); // fila de encabezado
  doc.text('Descripción', 22, yPos + 6);
  doc.text('Precio', 100, yPos + 6);
  doc.text('Cantidad', 130, yPos + 6);
  doc.text('Monto', 160, yPos + 6);
  yPos += 10;

  let subtotal = 0;

  doc.setFont('helvetica', 'normal');

  this.productos.forEach((producto) => {
    const monto = producto.precio * producto.cantidad;
    subtotal += monto;

    doc.rect(20, yPos, 170, 8); // fila producto
    doc.text(`${producto.descripcion}`, 22, yPos + 6);
    doc.text(`${producto.precio.toFixed(2)}`, 100, yPos + 6);
    doc.text(`${producto.cantidad}`, 130, yPos + 6);
    doc.text(`${monto.toFixed(2)}`, 160, yPos + 6);

    yPos += 9;
  });

  const impuesto = subtotal * 0.15;
  const total = subtotal + impuesto;

  // Línea final
  yPos += 2;
  doc.setDrawColor(this.COLORES.dorado);
  doc.line(20, yPos, doc.internal.pageSize.width - 20, yPos);
  yPos += 6;

  // Totales
  doc.setFont('helvetica', 'bold');
  doc.text('Subtotal:', 130, yPos);
  doc.text(`${subtotal.toFixed(2)}`, 160, yPos);
  yPos += 6;

  doc.text('Impuesto (15%):', 130, yPos);
  doc.text(`${impuesto.toFixed(2)}`, 160, yPos);
  yPos += 6;

  doc.text('Total:', 130, yPos);
  doc.text(`${total.toFixed(2)}`, 160, yPos);
}



  private crearPiePagina(doc: jsPDF, data: any): void {
    const fecha = new Date();
    const fechaTexto = fecha.toLocaleDateString('es-HN');
    const horaTexto = fecha.toLocaleTimeString('es-HN');
    const totalPages = doc.getNumberOfPages();

    doc.setFontSize(8);
    doc.setTextColor(this.COLORES.grisTexto);
  //  doc.text(`Generado por: Usuario | Fecha: ${fechaTexto} ${horaTexto}`, 20, doc.internal.pageSize.height - 12);
    doc.text(`Página ${data.pageNumber}/${totalPages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 12, { align: 'right' });
  }

  // ...




   formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
