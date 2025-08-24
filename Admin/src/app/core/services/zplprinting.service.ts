import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ZplPrintConfig {
  printerName?: string;
  printerIp?: string;
  printerPort?: number;
  copies?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ZplPrintingService {

  constructor(private http: HttpClient) {}

  /**
   * Convierte un número a letras en español (Honduras)
   */
  private convertirNumeroALetras(numero: number): string {
    const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const especiales = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    if (numero === 0) return 'cero';
    if (numero === 100) return 'cien';
    if (numero === 1000) return 'mil';

    let resultado = '';
    const entero = Math.floor(numero);
    const decimal = Math.round((numero - entero) * 100);

    // Procesar parte entera
    if (entero >= 1000) {
      const miles = Math.floor(entero / 1000);
      if (miles === 1) {
        resultado += 'mil ';
      } else {
        resultado += this.convertirNumeroALetras(miles) + ' mil ';
      }
    }

    const resto = entero % 1000;
    if (resto >= 100) {
      const c = Math.floor(resto / 100);
      resultado += centenas[c] + ' ';
    }

    const restoDecenas = resto % 100;
    if (restoDecenas >= 20) {
      const d = Math.floor(restoDecenas / 10);
      const u = restoDecenas % 10;
      resultado += decenas[d];
      if (u > 0) {
        resultado += ' y ' + unidades[u];
      }
    } else if (restoDecenas >= 10) {
      resultado += especiales[restoDecenas - 10];
    } else if (restoDecenas > 0) {
      resultado += unidades[restoDecenas];
    }

    // Agregar decimales si existen
    if (decimal > 0) {
      resultado += ' con ' + decimal.toString().padStart(2, '0') + '/100';
    }

    return resultado.trim();
  }

  /**
   * Formatea fecha para ZPL
   */
  private formatDate(fecha: string | Date | null): string {
    if (!fecha) return new Date().toLocaleDateString('es-HN');
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return new Date().toLocaleDateString('es-HN');
    return dateObj.toLocaleDateString('es-HN');
  }

  /**
   * Formatea hora para ZPL
   */
  private formatTime(fecha: string | Date | null): string {
    if (!fecha) return new Date().toLocaleTimeString('es-HN');
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return new Date().toLocaleTimeString('es-HN');
    return dateObj.toLocaleTimeString('es-HN');
  }

  /**
   * Genera el código ZPL para la factura
   */
  generateInvoiceZPL(invoiceData: any): string {
    // Extraer información de la empresa
    const empresaNombre = invoiceData.coFa_NombreEmpresa || 'SIDCOP';
    const empresaDireccion = invoiceData.coFa_DireccionEmpresa || 'Col. Satelite Norte, Bloque 3';
    const empresaRTN = invoiceData.coFa_RTN || '08019987654321';
    const empresaTelefono = invoiceData.coFa_Telefono1 || '2234-5678';
    const empresaCorreo = invoiceData.coFa_Correo || 'info@sidcop.com';

    // Información de la factura
    const factNumero = invoiceData.fact_Numero || 'F001-0000001';
    const factTipo = invoiceData.fact_TipoVenta || 'EFECTIVO';
    const factFecha = this.formatDate(invoiceData.fact_FechaEmision);
    const factHora = this.formatTime(invoiceData.fact_FechaEmision);
    const cai = invoiceData.regC_Descripcion || 'ABC123-XYZ456-789DEF';
    const tipoDocumento = invoiceData.fact_TipoDeDocumento || 'FACTURA';

    // Información del cliente
    const clienteCodigo = invoiceData.clie_Id || '00000000';
    const clienteNombre = invoiceData.cliente || 'Cliente General';
    const clienteRTN = invoiceData.clie_RTN || '';
    const clienteTelefono = invoiceData.clie_Telefono || '';
    const clienteDireccion = invoiceData.diCl_DireccionExacta || '';

    const fechaLimiteEmision = invoiceData.regC_FechaFinalEmision || '31/12/2024';
    const desde = invoiceData.regC_RangoInicial || 'F001-00000001';
    const hasta = invoiceData.regC_RangoFinal || 'F001-99999999';

    // Información del vendedor y sucursal
    const vendedorNombre = invoiceData.vendedor || 'Vendedor';
    const sucursalNombre = invoiceData.sucu_Descripcion || 'Principal';

    // Totales con más detalle
    const subtotal = (invoiceData.fact_Subtotal || 0).toFixed(2);
    const impuesto15 = (invoiceData.fact_TotalImpuesto15 || 0).toFixed(2);
    const impuesto18 = (invoiceData.fact_TotalImpuesto18 || 0).toFixed(2);
    const descuento = (invoiceData.fact_TotalDescuento || 0).toFixed(2);
    const total = (invoiceData.fact_Total || 0).toFixed(2);
    const importeExento = (invoiceData.fact_ImporteExento || 0).toFixed(2);
    const importeExonerado = (invoiceData.fact_ImporteExonerado || 0).toFixed(2);
    const importeGravado15 = (invoiceData.fact_ImporteGravado15 || 0).toFixed(2);
    const importeGravado18 = (invoiceData.fact_ImporteGravado18 || 0).toFixed(2);

    // Productos - MOSTRAR TODOS LOS PRODUCTOS
    const detalles = invoiceData.detalleFactura || [];

    let productosZPL = '';
    let yPosition = 870; // Posición inicial de productos

    // Procesar TODOS los productos
    for (const detalle of detalles) {
      const producto = detalle.prod_Descripcion || 'Producto';
      const codigoProducto = detalle.prod_CodigoBarra || '';
      const cantidad = detalle.faDe_Cantidad?.toString() || '1';
      const precioUnitario = (detalle.faDe_PrecioUnitario || 0).toFixed(2);
      const totalItem = (detalle.faDe_Subtotal || 0).toFixed(2);

      // Producto con múltiples líneas (máximo 5 líneas, ancho 160 dots para dejar espacio a las otras columnas)
      productosZPL += `^FO0,${yPosition}^CF0,22,24^FB160,5,0,L,0^FD${producto}^FS\n`;
      
      // Cantidad, Precio y Monto alineados a la primera línea del producto
      productosZPL += `^FO165,${yPosition}^CF0,22,24^FD${cantidad}^FS\n`;
      productosZPL += `^FO210,${yPosition}^CF0,22,24^FDL${precioUnitario}^FS\n`;
      productosZPL += `^FO295,${yPosition}^CF0,22,24^FDL${totalItem}^FS\n`;

      // Calcular espacio necesario para el producto (más preciso para ancho menor)
      let lineasProducto = Math.ceil(producto.length / 18); // ~18 caracteres por línea con ancho 160 dots
      if (lineasProducto > 5) lineasProducto = 5; // Máximo 5 líneas
      if (lineasProducto < 1) lineasProducto = 1; // Mínimo 1 línea
      
      yPosition += (lineasProducto * 24); // 24 dots por línea para fuente 22,24

      // Código de producto (mismo tamaño de fuente, debajo del producto)
      if (codigoProducto.length > 0) {
        yPosition += 6; // Pequeño espacio antes del código
        productosZPL += `^FO0,${yPosition}^CF0,22,24^FDCod: ${codigoProducto}^FS\n`;
        yPosition += 24; // Espacio del código
      }

      // Más espacio entre productos para mejor legibilidad
      yPosition += 25;
    }

    // Calcular posición para totales dinámicamente
    yPosition += 20; // Espacio antes de totales
    const totalesY = yPosition;

    // Generar sección de totales dinámicamente
    let totalesZPL = '';
    let totalY = totalesY + 15; // Posición inicial de totales

    // Definir ancho del área de impresión (ajusta según tu etiqueta)
    const anchoEtiqueta = 360; // ancho en puntos
    const margenDerecho = 10;
    const anchoTexto = anchoEtiqueta - margenDerecho;

    // MOSTRAR TODOS LOS CAMPOS alineados a la derecha
    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDSubtotal: L${subtotal}^FS\n`;
    totalY += 25;

    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDTotalDescuento: -L${descuento}^FS\n`;
    totalY += 25;

    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDImporte Exento: L${importeExento}^FS\n`;
    totalY += 25;

    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDImporte Exonerado: L${importeExonerado}^FS\n`;
    totalY += 25;

    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDImporte Gravado 15%: L${importeGravado15}^FS\n`;
    totalY += 25;

    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDImporte Gravado 18%: L${importeGravado18}^FS\n`;
    totalY += 25;

    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDTotal Impuesto 15%: L${impuesto15}^FS\n`;
    totalY += 25;

    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDTotal Impuesto 18%: L${impuesto18}^FS\n`;
    totalY += 25;

    // Línea divisoria antes del total
    totalY += 5;
    const lineaY = totalY;
    totalesZPL += `^FO${margenDerecho},${lineaY}^GB${anchoTexto},2,2^FS\n`;
    totalY += 10;

    // Total final alineado a la derecha y destacado
    totalesZPL += `^FO${margenDerecho},${totalY}^FB${anchoTexto},1,0,R^CF0,22,24^FDTotal: L${total}^FS\n`;
    totalY += 25;

    // Total en letras
    const totalNum = parseFloat(total.replace('L', '')) || 0;
    const totalEnLetras = `Son: ${this.convertirNumeroALetras(totalNum)} lempiras`;
    totalesZPL += `^FO0,${totalY}^FB${anchoEtiqueta},2,0,C,0^CF0,22,24^FD${totalEnLetras}^FS\n`;
    totalY += 50;

    // Footer con posiciones dinámicas
    const footerY = totalY + 50;

    // Generar footer ZPL
    let footerZPL = '';
    let currentFooterY = footerY + 15;

    footerZPL += `^FO0,${currentFooterY}^FB${anchoEtiqueta},2,0,C,0^CF0,22,24^FDFechaLimite Emision: ${fechaLimiteEmision}^FS\n`;
    currentFooterY += 45;

    footerZPL += `^FO0,${currentFooterY}^FB${anchoEtiqueta},1,0,C,0^CF0,22,24^FDRango Autorizado:^FS\n`;
    currentFooterY += 25;

    footerZPL += `^FO0,${currentFooterY}^FB${anchoEtiqueta},1,0,C,0^CF0,22,24^FDDesde: ${desde}^FS\n`;
    currentFooterY += 25;

    footerZPL += `^FO0,${currentFooterY}^FB${anchoEtiqueta},1,0,C,0^CF0,22,24^FDHasta: ${hasta}^FS\n`;
    currentFooterY += 25;

    currentFooterY += 10;

    footerZPL += `^FO0,${currentFooterY}^FB${anchoEtiqueta},3,0,C,0^CF0,22,24^FDOriginal: Cliente, Copia 1: Obligado Tributario Emisor Copia 2: Archivo^FS\n`;
    currentFooterY += 75;

    currentFooterY += 10;

    footerZPL += `^FO0,${currentFooterY}^FB${anchoEtiqueta},2,0,C,0^CF0,22,24^FDLA FACTURA ES BENEFICIO DE TODOS, ¡"EXIJALA"!^FS\n`;
    currentFooterY += 50;

    currentFooterY += 10;

    // Calcular la altura total de la etiqueta
    const alturaTotal = footerY + 300;

    // Logo GFA
    const logoZPL = `^FX ===== LOGO CENTRADO =====
^FO130,60
^GFA,1950,1666,17,
,::::::M07U018O0M0EU01EO0L01EV0FO00000807EV0F802L00001807CV0FC06L00001C0FCV07E07L00003C1FCV07E07L00003C1F8V03F0FL00003E3FW03F0F8K00003E3F0001F8Q01F8F8K00003E3E00071CR0F8F8K00007E3C000E0CR078F8K00007E21801E0CQ0318F8K00003E07001ES03C0F8K00003E0F003ES01E0F8K00003E3F003ES01F0F8K00043C3E007CS01F8F0800000061C7E007CT0FC70C000000618FE007CT0FE21C000000F00FC007CT07E01C000000F81F80078T07E03C000000F81F80078T03F03C000000F81F000F8T01F07C000000FC1E000FV0F07C000000FC12000FV0907C0000007C06000EV0C0FC0000007C0E001EV0E0FC0000007C1E001C0000FFFF8M0F0F80000003C3C00380007F7FFEM0F8F80000003C7C0070001E03C1FM0FC7K0001CFC00FE003807C078L07C7040000608FC01FFC06007C078L07E60C0000701F80787E0C0078078L07E01C0000781F80F01F180078078L03F03C00007C1F00E00F980078078L03F07C00007E1F004007F000F00FM01F0F800007E1E200003F060F01EL010F1F800003F1C6K0F8F0F03CL01871F800003F00EK079F0FFF8L01C13F000001F80EK03FE1EFEM01E03F000001F81EL0FC1E3CM01F03E000000F83EN01C3CM01F07E000000783EN03C1EM01F87C000000383EN03C1EM01F83K01C087EN0381EN0F82070000F007EN0780FN0FC03E0000FC07CN0780FN0FC0FE00007F07CN0700F8M07C1FC00007F8784M0F0078L047C3F800003FC78CM0E0078L063C7F800001FE71CM0E003CL071CFF000000FE43CM0C003EL0708FE0000007E03CP01EL0F81F80000001F03CP01FL0F81FK0K07CQ0F8K0F81L0070007C2P07800C10FC003C00003F007C3P03C00C18FC01F800003FC07C7P01E00C187C0FF000001FF0FC7Q0F81C3C7C1FF000000FF87C78P07E383C7C3FE0000007FC78F8P01FE03C7C7FC0000003FC78F8T03E3CFFK0000FE70F88R043E18FEK00003E20F8CR047E08F8K0M0F8ER0E7EO0M0F8FQ01E7EO0000FE00F8FQ03E3E01FEK0000FFC0F8F8P03E3E0FFCK00007FF0F0F8P07E3C1FF8K00003FF870FCP07E1C3FFL00000FFC60FCP07C087FEL000003FC007C6M01CFC00FF8L0K0FC007C7CL0F8FC00FEM0O07E3FK03F8F8Q0L03C03C3FC00007F0F80F8N0K0FFF83C1FE0001FE0F07FFCM0K07FFE1C0FF0003FE060FFFCM0K03FFF0C07F8003FC041FFF8M0L0FFF0003F8007F8001FFEN0L01FC0000FC007E00007FO0P0E003C007801ER0O0FFCN07FEQ0N03FFE00038000FFF8P0N0FFFC00078000FFFEP0M01FFF80F0781E03FFFP0N07FE0FFC38FFC0FF8P0Q03FFE00FFFT0Q0FFFC007FFCS0P01FFF0003FFFS0Q07FC0000FFCS0,
^FS`;

    return `^XA
^LL${alturaTotal}
^LH0,0

${logoZPL}

^FX ===== HEADER EMPRESA CENTRADO =====
^CF0,24,24
^FO0,190^FB360,2,0,C,0^FH^FD${empresaNombre}^FS

^CF0,22,24
^FO0,225^FB360,1,0,C,0^FH^FDCasa Matriz^FS
^FO0,250^FB360,2,0,C,0^FH^FD${empresaDireccion}^FS

^CF0,22,24
^FO0,290^FB360,1,0,C,0^FH^FDTel: ${empresaTelefono}^FS
^FO0,315^FB360,1,0,C,0^FH^FD${empresaCorreo}^FS
^FO0,340^FB360,1,0,C,0^FH^FD${empresaRTN}^FS

^FO0,365^GB360,2,2^FS

^FX ===== INFORMACION DE FACTURA IZQUIERDA =====
^CF0,22,24
^FO0,390^FB360,2,0,L,0^FDCAI: ${cai}^FS
^FO0,440^FB360,2,0,L,0^FDNo. Factura: ${factNumero}^FS
^FO0,490^FB360,1,0,L,0^FDFecha Emision: ${factFecha}^FS
^FO0,515^FB360,1,0,L,0^FDTipo Venta: ${factTipo}^FS
^FO0,540^FB360,1,0,L,0^FDCliente: ${clienteNombre}^FS
^FO0,565^FB360,1,0,L,0^FDCodigo Cliente: ${clienteCodigo}^FS
^FO0,590^FB360,2,0,L,0^FDDireccion cliente: ${clienteDireccion}^FS
^FO0,640^FB360,1,0,L,0^FDRTN cliente: ${clienteRTN}^FS
^FO0,665^FB360,1,0,L,0^FDVendedor: ${vendedorNombre}^FS
^FO0,690^FB360,1,0,L,0^FDNo Orden de compra exenta:^FS
^FO0,715^FB360,2,0,L,0^FDNo Constancia de reg de exonerados:^FS
^FO0,765^FB360,1,0,L,0^FDNo Registro de la SAG:^FS

^FX ===== TABLA PRODUCTOS (4 COLUMNAS) =====
^FO0,810^GB360,2,2^FS
^FO0,825^CF0,22,24^FDProd^FS
^FO165,825^CF0,22,24^FDCant^FS
^FO210,825^CF0,22,24^FDPrecio^FS
^FO295,825^CF0,22,24^FDMonto^FS
^FO0,845^GB360,1,1^FS

^FX ===== PRODUCTOS =====
${productosZPL}

^FX ===== TOTALES =====
^FO0,${totalesY}^GB360,2,2^FS
${totalesZPL}

^FX ===== FOOTER =====
^FO0,${footerY}^GB360,2,2^FS
${footerZPL}

^XZ`;
  }

  /**
   * Imprime usando el protocolo raw socket (requiere servidor backend)
   */
  printViaRawSocket(zplCode: string, printerIp: string, printerPort: number = 9100): Observable<any> {
    return this.http.post('/api/print/raw-socket', {
      zplCode,
      printerIp,
      printerPort
    });
  }

  /**
   * Imprime usando el sistema nativo de impresión del navegador
   */
  printViaBrowser(zplCode: string): void {
    // Crear una ventana nueva para imprimir
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Impresión ZPL</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                white-space: pre-wrap; 
                margin: 20px;
                font-size: 12px;
              }
              .zpl-container {
                border: 1px solid #ccc;
                padding: 10px;
                background-color: #f9f9f9;
              }
            </style>
          </head>
          <body>
            <h3>Código ZPL generado</h3>
            <div class="zpl-container">${zplCode}</div>
            <script>
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  }

  /**
   * Descarga el código ZPL como archivo
   */
  downloadZPL(zplCode: string, filename: string = 'factura.zpl'): void {
    const blob = new Blob([zplCode], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Copia el código ZPL al portapapeles
   */
  async copyZPLToClipboard(zplCode: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(zplCode);
      return true;
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err);
      return false;
    }
  }

  /**
   * Método principal para imprimir facturas
   */
  printInvoice(invoiceData: any, config: ZplPrintConfig = {}): void {
    const zplCode = this.generateInvoiceZPL(invoiceData);
    
    if (config.printerIp) {
      // Impresión directa via socket
      this.printViaRawSocket(zplCode, config.printerIp, config.printerPort).subscribe({
        next: (response) => {
          console.log('Impresión exitosa:', response);
        },
        error: (error) => {
          console.error('Error en impresión:', error);
          // Fallback a descarga
          this.downloadZPL(zplCode, `factura_${invoiceData.fact_Numero || 'sin_numero'}.zpl`);
        }
      });
    } else {
      // Descarga directa del archivo ZPL
      this.downloadZPL(zplCode, `factura_${invoiceData.fact_Numero || 'sin_numero'}.zpl`);
    }
  }
}