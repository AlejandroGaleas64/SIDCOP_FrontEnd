import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ConfiguracionFactura {
  coFa_NombreEmpresa: string;
  coFa_DireccionEmpresa: string;
  coFa_RTN: string;
  coFa_Correo: string;
  coFa_Telefono1: string;
  coFa_Telefono2: string;
  coFa_Logo: string;
  colo_Descripcion: string;
  muni_Descripcion: string;
  depa_Descripcion: string;
}

interface Producto {
  secuencia: number;
  prod_Id: number;
  prod_Codigo: string;
  prod_CodigoBarra: string;
  prod_Descripcion: string;
  prod_DescripcionCorta: string;
  prod_Imagen: string;
  prod_PrecioUnitario: number;
  prod_CostoTotal: number;
  prod_PagaImpuesto: string;
  prod_esPromo: string;
  marc_Id: number;
  marc_Descripcion: string;
  cate_Id: number;
  cate_Descripcion: string;
  subc_Id: number;
  subc_Descripcion: string;
  prov_Id: number;
  prov_NombreEmpresa: string;
  impu_Id: number;
  impu_Descripcion: string;
  usua_Creacion: number;
  usuarioCreacion: string;
  prod_FechaCreacion: string;
  usua_Modificacion: number;
  usuarioModificacion: string;
  prod_FechaModificacion: string;
}

interface Marca {
  marc_Id: number;
  marc_Descripcion: string;
}

interface Categoria {
  cate_Id: number;
  cate_Descripcion: string;
}

interface FiltrosReporte {
  fechaInicio: string;
  fechaFin: string;
  marcaId: number | null;
  categoriaId: number | null;
}

@Component({
  selector: 'app-reporte-productos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ReporteProductosComponent implements OnInit {
  productos: Producto[] = [];
  marcas: Marca[] = [];
  categorias: Categoria[] = [];
  configuracionEmpresa: ConfiguracionFactura | null = null;
  
  filtros: FiltrosReporte = {
    fechaInicio: '',
    fechaFin: '',
    marcaId: null,
    categoriaId: null
  };
  
  mostrarOverlayCarga = false;
  mostrarAlertaError = false;
  mensajeError = '';
  fechaGeneracion = new Date();
  cargandoPDF = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  private cargarDatosIniciales(): void {
    this.cargarConfiguracionEmpresa();
    this.cargarMarcas();
    this.cargarCategorias();
  }

  private cargarConfiguracionEmpresa(): void {
    this.http.get<ConfiguracionFactura[]>(`${environment.apiBaseUrl}/ConfiguracionFactura/Listar`, {
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

  private cargarMarcas(): void {
    this.http.get<Marca[]>(`${environment.apiBaseUrl}/Marcas/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.marcas = data || [];
      },
      error: (error) => {
        console.error('Error al cargar marcas:', error);
      }
    });
  }

  private cargarCategorias(): void {
    this.http.get<Categoria[]>(`${environment.apiBaseUrl}/Categorias/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.categorias = data || [];
      },
      error: (error) => {
        console.error('Error al cargar categorías:', error);
      }
    });
  }

  generarReporte(): void {
    this.mostrarOverlayCarga = true;
    this.fechaGeneracion = new Date();
    
    const params: any = {};
    
    if (this.filtros.fechaInicio) {
      params.fechaInicio = this.filtros.fechaInicio;
    }
    if (this.filtros.fechaFin) {
      params.fechaFin = this.filtros.fechaFin;
    }
    if (this.filtros.marcaId) {
      params.marcaId = this.filtros.marcaId;
    }
    if (this.filtros.categoriaId) {
      params.categoriaId = this.filtros.categoriaId;
    }

    this.http.get<Producto[]>(`${environment.apiBaseUrl}/Productos/ReporteProductos`, {
      headers: { 'x-api-key': environment.apiKey },
      params: params
    }).subscribe({
      next: (data) => {
        this.productos = data || [];
        this.mostrarOverlayCarga = false;
      },
      error: (error) => {
        console.error('Error al generar reporte:', error);
        this.mostrarOverlayCarga = false;
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al generar el reporte. Por favor, inténtelo de nuevo más tarde.';
        this.productos = [];
      }
    });
  }

  limpiarFiltros(): void {
    this.filtros = {
      fechaInicio: '',
      fechaFin: '',
      marcaId: null,
      categoriaId: null
    };
    this.productos = [];
  }

  async exportarPDF(): Promise<void> {
    if (this.productos.length === 0) {
      return;
    }

    this.cargandoPDF = true;

    try {
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Configurar fuentes
      doc.setFont('helvetica');
      
      let yPosition = 20;
      
      // Logo de la empresa (si existe)
      if (this.configuracionEmpresa?.coFa_Logo) {
        try {
          const logoImg = await this.loadImage(this.configuracionEmpresa.coFa_Logo);
          doc.addImage(logoImg, 'JPEG', 15, yPosition, 30, 20);
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error);
        }
      }
      
      // Encabezado de la empresa
      if (this.configuracionEmpresa) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text(this.configuracionEmpresa.coFa_NombreEmpresa, pageWidth / 2, yPosition + 5, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        yPosition += 12;
        doc.text(`RTN: ${this.configuracionEmpresa.coFa_RTN}`, pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 5;
        const direccionCompleta = `${this.configuracionEmpresa.coFa_DireccionEmpresa}, ${this.getDireccionCompleta()}`;
        doc.text(`Dirección: ${direccionCompleta}`, pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 5;
        const telefonos = this.configuracionEmpresa.coFa_Telefono2 
          ? `${this.configuracionEmpresa.coFa_Telefono1} / ${this.configuracionEmpresa.coFa_Telefono2}`
          : this.configuracionEmpresa.coFa_Telefono1;
        doc.text(`Teléfonos: ${telefonos}`, pageWidth / 2, yPosition, { align: 'center' });
        
        yPosition += 5;
        doc.text(`Correo: ${this.configuracionEmpresa.coFa_Correo}`, pageWidth / 2, yPosition, { align: 'center' });
      }
      
      // Línea separadora
      yPosition += 10;
      doc.setLineWidth(0.5);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      
      // Título del reporte
      yPosition += 10;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('REPORTE DE PRODUCTOS', pageWidth / 2, yPosition, { align: 'center' });
      
      // Fecha de generación
      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de generación: ${this.fechaGeneracion.toLocaleDateString('es-HN')} ${this.fechaGeneracion.toLocaleTimeString('es-HN')}`, pageWidth / 2, yPosition, { align: 'center' });
      
      // Filtros aplicados
      if (this.hayFiltrosAplicados()) {
        yPosition += 10;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Filtros aplicados:', 15, yPosition);
        
        doc.setFont('helvetica', 'normal');
        yPosition += 5;
        
        if (this.filtros.fechaInicio) {
          doc.text(`• Fecha inicio: ${new Date(this.filtros.fechaInicio).toLocaleDateString('es-HN')}`, 20, yPosition);
          yPosition += 4;
        }
        if (this.filtros.fechaFin) {
          doc.text(`• Fecha fin: ${new Date(this.filtros.fechaFin).toLocaleDateString('es-HN')}`, 20, yPosition);
          yPosition += 4;
        }
        if (this.filtros.marcaId) {
          doc.text(`• Marca: ${this.getMarcaDescripcion(this.filtros.marcaId)}`, 20, yPosition);
          yPosition += 4;
        }
        if (this.filtros.categoriaId) {
          doc.text(`• Categoría: ${this.getCategoriaDescripcion(this.filtros.categoriaId)}`, 20, yPosition);
          yPosition += 4;
        }
      }
      
      // Total de registros
      yPosition += 8;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total de productos: ${this.productos.length}`, 15, yPosition);
      
      // Preparar datos para la tabla
      const headers = [
        ['#', 'Código', 'Código Barra', 'Descripción', 'Marca', 'Categoría', 'Precio', 'Costo', 'Impuesto', 'Proveedor', 'Fecha Creación']
      ];
      
      const data = this.productos.map(producto => [
        producto.secuencia.toString(),
        producto.prod_Codigo || '',
        producto.prod_CodigoBarra || 'N/A',
        this.truncateText(producto.prod_Descripcion, 25),
        producto.marc_Descripcion || 'N/A',
        producto.cate_Descripcion || 'N/A',
        `L. ${producto.prod_PrecioUnitario.toFixed(2)}`,
        `L. ${producto.prod_CostoTotal.toFixed(2)}`,
        producto.prod_PagaImpuesto,
        this.truncateText(producto.prov_NombreEmpresa || 'N/A', 20),
        new Date(producto.prod_FechaCreacion).toLocaleDateString('es-HN')
      ]);
      
      // Generar tabla
      yPosition += 10;
      autoTable(doc, {
        head: headers,
        body: data,
        startY: yPosition,
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [52, 58, 64],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 15 }, // #
          1: { cellWidth: 20 }, // Código
          2: { cellWidth: 25 }, // Código Barra
          3: { cellWidth: 45 }, // Descripción
          4: { cellWidth: 25 }, // Marca
          5: { cellWidth: 25 }, // Categoría
          6: { halign: 'right', cellWidth: 20 }, // Precio
          7: { halign: 'right', cellWidth: 20 }, // Costo
          8: { halign: 'center', cellWidth: 15 }, // Impuesto
          9: { cellWidth: 35 }, // Proveedor
          10: { halign: 'center', cellWidth: 25 } // Fecha
        },
        margin: { left: 15, right: 15 },
        pageBreak: 'auto',
        showHead: 'everyPage'
      });
      
      // Pie de página en todas las páginas
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        doc.text(`Generado el ${this.fechaGeneracion.toLocaleDateString('es-HN')} a las ${this.fechaGeneracion.toLocaleTimeString('es-HN')}`, 15, pageHeight - 10);
      }
      
      // Guardar el PDF
      const fileName = `Reporte_Productos_${this.fechaGeneracion.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.mostrarAlertaError = true;
      this.mensajeError = 'Error al generar el archivo PDF. Por favor, inténtelo de nuevo.';
    } finally {
      this.cargandoPDF = false;
    }
  }
  
  private loadImage(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = reject;
      img.src = url;
    });
  }
  
  private truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }

  hayFiltrosAplicados(): boolean {
    return !!(this.filtros.fechaInicio || this.filtros.fechaFin || this.filtros.marcaId || this.filtros.categoriaId);
  }

  getDireccionCompleta(): string {
    if (!this.configuracionEmpresa) return '';
    
    const direccionParts = [];
    if (this.configuracionEmpresa.colo_Descripcion) {
      direccionParts.push(this.configuracionEmpresa.colo_Descripcion);
    }
    if (this.configuracionEmpresa.muni_Descripcion) {
      direccionParts.push(this.configuracionEmpresa.muni_Descripcion);
    }
    if (this.configuracionEmpresa.depa_Descripcion) {
      direccionParts.push(this.configuracionEmpresa.depa_Descripcion);
    }
    
    return direccionParts.join(', ');
  }

  getMarcaDescripcion(marcaId: number): string {
    const marca = this.marcas.find(m => m.marc_Id === marcaId);
    return marca ? marca.marc_Descripcion : '';
  }

  getCategoriaDescripcion(categoriaId: number): string {
    const categoria = this.categorias.find(c => c.cate_Id === categoriaId);
    return categoria ? categoria.cate_Descripcion : '';
  }

  // Métodos para cálculos estadísticos
  calcularPromedioPrecios(): number {
    if (this.productos.length === 0) return 0;
    const total = this.productos.reduce((sum, producto) => sum + producto.prod_PrecioUnitario, 0);
    return total / this.productos.length;
  }

  contarProductosConImpuesto(): number {
    return this.productos.filter(producto => producto.prod_PagaImpuesto === 'Si').length;
  }

  contarMarcasUnicas(): number {
    const marcasUnicas = new Set(this.productos.map(producto => producto.marc_Id).filter(id => id !== null));
    return marcasUnicas.size;
  }
}