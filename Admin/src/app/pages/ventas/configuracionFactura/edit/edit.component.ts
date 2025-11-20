import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ImageUploadService } from 'src/app/core/services/image-upload.service';
import { SvgPreviewComponent } from '../svg-preview/svg-preview.component';
import Cropper from 'cropperjs';

@Component({
  selector: 'app-edit-config-factura',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NgSelectModule,
    NgxMaskDirective,
    SvgPreviewComponent
  ],
  templateUrl: './edit.component.html',
  styleUrls: ['./edit.component.scss'],
  providers: [provideNgxMask()]
})
export class EditConfigFacturaComponent implements OnChanges {
  @Input() configFacturaData: any | null = null;
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();

  configFactura: any = {
    coFa_Id: 0,
    coFa_NombreEmpresa: '',
    coFa_DireccionEmpresa: '',
    coFa_RTN: '',
    coFa_Correo: '',
    coFa_Telefono1: '',
    coFa_Telefono2: '',
    coFa_Logo: '',
    coFa_LogoZPL: '',
    coFa_DiasDevolucion: 0,
    coFa_RutaMigracion: '',
    colo_Id: 0,
    usua_Creacion: 0,
    usua_Modificacion: 0,
    coFa_FechaCreacion: new Date(),
    coFa_FechaModificacion: new Date()
  };

  configFacturaOriginal: any = {};

  // Catálogos
  colonia: any[] = [];

  logoSeleccionado = false;

  // Cropper functionality
  @ViewChild('imageCropper', { static: false }) imageCropper!: ElementRef;
  showCropper = false;
  cropper: any;
  selectedFile: File | null = null;
  
  // SVG preview properties
  isSvgFile = false;
  svgPreviewUrl: string | null = null;

  // Controla si usar el ZPL personalizado (true) o generar automáticamente (false)
  useCustomZPL = false;

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mostrarAlertaError = false;
  mostrarAlertaWarning = false;
  mostrarConfirmacionEditar = false;

  mensajeExito = '';
  mensajeError = '';
  mensajeWarning = '';

  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['configFacturaData']?.currentValue) {
      this.configFactura = { ...this.configFacturaData };
      this.configFacturaOriginal = { ...this.configFacturaData };
      this.logoSeleccionado = !!this.configFactura.coFa_Logo;
      this.mostrarErrores = false;
      this.cerrarAlerta();
      this.listarColonias();
    }
  }

  // Función de búsqueda para colonias (igual que en crear)
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  // Función para ordenar por municipio y departamento (igual que en crear)
  ordenarPorMunicipioYDepartamento(colonias: any[]): any[] {
    return colonias.sort((a, b) => {
      // Primero por departamento
      if (a.depa_Descripcion < b.depa_Descripcion) return -1;
      if (a.depa_Descripcion > b.depa_Descripcion) return 1;
      // Luego por municipio
      if (a.muni_Descripcion < b.muni_Descripcion) return -1;
      if (a.muni_Descripcion > b.muni_Descripcion) return 1;
      return 0;
    });
  }

  // Cargar colonias (igual que en crear)
  listarColonias(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => this.colonia = this.ordenarPorMunicipioYDepartamento(data),
      error: (error) => console.error('Error cargando colonias:', error)
    });
  }

  // Variable para dirección inicial
  direccionExactaInicial: string = '';

  // Método cuando se selecciona una colonia (igual que en crear)
  onColoniaSeleccionada(colo_Id: number) {
    const coloniaSeleccionada = this.colonia.find((c: any) => c.colo_Id === colo_Id);

    if (coloniaSeleccionada) {
      this.direccionExactaInicial = coloniaSeleccionada.colo_Descripcion;
      this.configFactura.coFa_DireccionEmpresa = coloniaSeleccionada.colo_Descripcion;
    } else {
      this.direccionExactaInicial = '';
      this.configFactura.coFa_DireccionEmpresa = '';
    }
  }

  private centrarLogoZPL(zplCode: string): string {
    try {
      // Constantes para papel de 3 pulgadas
      const PAPER_WIDTH_INCHES = 2;
      const DPI = 203; // DPI estándar de impresoras Zebra
      const PAPER_WIDTH_DOTS = PAPER_WIDTH_INCHES * DPI; // 609 dots

      // Buscar el comando ^GFA que contiene la información del gráfico
      // Formato: ^GFA,a,b,c,data
      // donde b = bytes por fila, c = bytes por fila (generalmente igual a b)
      const gfaMatch = zplCode.match(/\^GFA,(\d+),(\d+),(\d+),/);
      
      if (!gfaMatch) {
        console.warn('No se encontró comando ^GFA en el código ZPL');
        return zplCode;
      }

      const bytesPerRow = parseInt(gfaMatch[3]);
      
      // Calcular el ancho del logo en dots
      // Cada byte representa 8 dots (pixels)
      const logoWidthDots = bytesPerRow * 8;
      
      console.log('Ancho del papel:', PAPER_WIDTH_DOTS, 'dots');
      console.log('Ancho del logo:', logoWidthDots, 'dots');
      
      // Calcular posición X para centrar
      const posicionX = Math.max(0, Math.round((PAPER_WIDTH_DOTS - logoWidthDots) / 2));
      
      console.log('Posición X calculada para centrar:', posicionX);
      
      // Reemplazar ^FO0,0 con la posición centrada
      // Mantener Y en 0 o un margen pequeño si lo deseas
      const marginTop = 20; // Puedes ajustar este valor para margen superior
      zplCode = zplCode.replace(/\^FO\d+,\d+/, `^FO${posicionX},${marginTop}`);
      
      return zplCode;
    } catch (error) {
      console.error('Error al centrar logo ZPL:', error);
      // Si hay error, devolver el código original
      return zplCode;
    }
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Ya no validamos el aspecto ratio, permitimos cualquier tamaño
      this.selectedFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        // Check if it's an SVG file
        this.isSvgFile = file.type === 'image/svg+xml';
        
        // Create a preview for SVG files
        if (this.isSvgFile) {
          this.svgPreviewUrl = e.target.result;
        }
        
        // Show cropper for all file types
        this.imageCropper.nativeElement.src = e.target.result;
        this.showCropper = true;
        
        setTimeout(() => {
          if (this.cropper) {
            this.cropper.destroy();
          }
          this.cropper = new Cropper(this.imageCropper.nativeElement, {
            // aspectRatio libre - el usuario puede seleccionar cualquier tamaño
            viewMode: 1,
            autoCropArea: 0.8, // Área de recorte inicial al 80%
            responsive: true,
            background: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
            minCropBoxWidth: 50, // Tamaño mínimo del área de recorte
            minCropBoxHeight: 50,
          });
        }, 100);
      };
      
      reader.readAsDataURL(file);
    }
  }

  cerrarModalCropper() {
    this.showCropper = false;
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
    // Don't reset selectedFile or svgPreviewUrl when closing the cropper
    // as we want to keep the preview visible
  }

  async cropAndUpload() {
    if (this.cropper && this.selectedFile) {
      try {
        // Obtener las dimensiones del área recortada
        const croppedData = this.cropper.getData();
        
        // Obtener la imagen recortada como blob manteniendo las proporciones originales
        // pero con un ancho máximo de 500px para optimización
        const canvas = this.cropper.getCroppedCanvas({
          maxHeight: 170, // Ancho máximo para optimizar el tamaño del archivo
          maxWidth: 300,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });

        canvas.toBlob(async (blob: Blob | null) => {
          if (blob) {
            // Crear un nuevo archivo con la imagen recortada
            const croppedFile = new File([blob], this.selectedFile!.name, {
              type: this.selectedFile!.type,
              lastModified: Date.now()
            });

            try {
              console.log('Iniciando subida de imagen...');
              console.log('Dimensiones del recorte:', {
                width: Math.round(croppedData.width),
                height: Math.round(croppedData.height)
              });
              
              // Subir imagen al backend usando ImageUploadService
              const imagePath = await this.imageUploadService.uploadImageAsync(croppedFile);
              console.log('Imagen subida exitosamente. Ruta:', imagePath);
              this.configFactura.coFa_Logo = imagePath;
              
              // Convertir la imagen a formato ZPL usando Labelary API
              console.log('Convirtiendo imagen a ZPL usando Labelary API...');
              const zplCode = await this.convertImageToZPLWithLabelary(croppedFile);
              this.configFactura.coFa_LogoZPL = zplCode;
              
              this.logoSeleccionado = true;
              console.log('Logo asignado a configFactura.coFa_Logo:', this.configFactura.coFa_Logo);
              console.log('Logo ZPL generado (primeros 100 caracteres):', this.configFactura.coFa_LogoZPL.substring(0, 100));
              console.log('Longitud del ZPL:', this.configFactura.coFa_LogoZPL.length);
              this.cerrarModalCropper();
            } catch (error) {
              console.error('Error al subir la imagen:', error);
              this.mostrarAlertaError = true;
              this.mensajeError = 'Error al subir la imagen. Por favor, inténtelo de nuevo.';
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            }
          }
        }, this.selectedFile.type, 0.9);
      } catch (error) {
        console.error('Error al procesar la imagen:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al procesar la imagen. Por favor, inténtelo de nuevo.';
        setTimeout(() => {
          this.mostrarAlertaError = false;
          this.mensajeError = '';
        }, 5000);
      }
    }
  }

  /**
   * Convierte una imagen a formato ZPL usando la API de Labelary
   * @param imageFile Archivo de imagen a convertir
   * @returns Código ZPL como string
   */
  private async convertImageToZPLWithLabelary(imageFile: File): Promise<string> {
    try {
      // Crear FormData para enviar la imagen
      const formData = new FormData();
      formData.append('file', imageFile);

      // Llamar a la API de Labelary
      const response = await fetch('http://api.labelary.com/v1/graphics', {
        method: 'POST',
        headers: {
          'Accept': 'application/zpl'
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Error en la API de Labelary: ${response.status} ${response.statusText}`);
      }

      // Obtener el código ZPL de la respuesta
      let zplCode = await response.text();
      console.log('ZPL generado por Labelary (primeros 200 caracteres):', zplCode.substring(0, 200));
      
      // Centrar el logo en papel de 3 pulgadas
      zplCode = this.centrarLogoZPL(zplCode);
      console.log('ZPL centrado (primeros 200 caracteres):', zplCode.substring(0, 200));
      
      return zplCode;
    } catch (error) {
      console.error('Error al convertir imagen a ZPL con Labelary:', error);
      throw new Error('No se pudo convertir la imagen a formato ZPL. Por favor, inténtelo de nuevo.');
    }
  }

  getImageDisplayUrl(imagePath: string): string {
    return this.imageUploadService.getImageUrl(imagePath);
  }

  validarEdicion(): void {
    this.mostrarErrores = true;

    if (this.validarCampos()) {
      if (this.hayDiferencias()) {
        this.mostrarConfirmacionEditar = true;
      } else {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'No se han detectado cambios.';
        setTimeout(() => this.cerrarAlerta(), 4000);
      }
    } else {
      // El mensaje de error ya se establece en validarCampos()
      setTimeout(() => this.cerrarAlerta(), 4000);
    }
  }

  // Método para validar todos los campos obligatorios - MEJORADO
  private validarCampos(): boolean {
    const errores: string[] = [];

    // Validar campos básicos requeridos
    if (!this.configFactura.coFa_NombreEmpresa.trim()) {
      errores.push('Nombre de la empresa');
    }

    if (!this.configFactura.coFa_DireccionEmpresa.trim()) {
      errores.push('Dirección de la empresa');
    }

    if (!this.configFactura.coFa_RTN.trim()) {
      errores.push('RTN');
    } else if (!this.isValidRTN(this.configFactura.coFa_RTN)) {
      errores.push('RTN debe tener exactamente 14 dígitos');
    }

    if (!this.configFactura.coFa_Correo.trim()) {
      errores.push('Correo electrónico');
    } else if (!this.isValidEmail(this.configFactura.coFa_Correo)) {
      errores.push('Correo electrónico debe tener un formato válido');
    }

    if (!this.configFactura.coFa_Telefono1.trim()) {
      errores.push('Teléfono principal');
    }

    if (!this.configFactura.coFa_Logo) {
      errores.push('Logo');
    }

    if (!this.configFactura.coFa_DiasDevolucion) {
      errores.push('Días de Devolución');
    }

    if (!this.configFactura.coFa_RutaMigracion.trim()) {
      errores.push('Ruta de Migración');
    }

    if (this.configFactura.colo_Id === 0) {
      errores.push('Colonia');
    }

    if (errores.length > 0) {
      this.mensajeWarning = `Por favor corrija los siguientes campos: ${errores.join(', ')}`;
      this.mostrarAlertaWarning = true;
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      return false;
    }

    return true;
  }

  // Validación RTN - solo números y máximo 14 dígitos
  onRTNInput(event: any): void {
    let value = event.target.value;
    // Remover todo lo que no sean números
    value = value.replace(/\D/g, '');
    // Limitar a 14 dígitos
    if (value.length > 14) {
      value = value.substring(0, 14);
    }
    this.configFactura.coFa_RTN = value;
    event.target.value = value;
  }

  // Validación de correo electrónico - MEJORADA
  isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  // Verificar si RTN tiene exactamente 14 dígitos - MEJORADA
  isValidRTN(rtn: string): boolean {
    if (!rtn || rtn.trim() === '') return false;
    return rtn.length === 14 && /^\d{14}$/.test(rtn);
  }

  // Método para validar RTN en tiempo real
  getRTNValidationClass(): string {
    if (!this.mostrarErrores) return '';
    return this.isValidRTN(this.configFactura.coFa_RTN) ? 'is-valid' : 'is-invalid';
  }

  // Método para validar email en tiempo real
  getEmailValidationClass(): string {
    if (!this.mostrarErrores) return '';
    return this.isValidEmail(this.configFactura.coFa_Correo) ? 'is-valid' : 'is-invalid';
  }

  // Objeto para almacenar los cambios detectados
  cambiosDetectados: any = {};

  hayDiferencias(): boolean {
    const a = this.configFactura;
    const b = this.configFacturaOriginal;
    this.cambiosDetectados = {};

    // Verificar cada campo y almacenar los cambios
    if (a.coFa_NombreEmpresa !== b.coFa_NombreEmpresa) {
      this.cambiosDetectados.nombreEmpresa = {
        anterior: b.coFa_NombreEmpresa,
        nuevo: a.coFa_NombreEmpresa,
        label: 'Nombre de la Empresa'
      };
    }

    if (a.coFa_DireccionEmpresa !== b.coFa_DireccionEmpresa) {
      this.cambiosDetectados.direccion = {
        anterior: b.coFa_DireccionEmpresa,
        nuevo: a.coFa_DireccionEmpresa,
        label: 'Dirección'
      };
    }

    if (a.coFa_RTN !== b.coFa_RTN) {
      this.cambiosDetectados.rtn = {
        anterior: b.coFa_RTN,
        nuevo: a.coFa_RTN,
        label: 'RTN'
      };
    }

    if (a.coFa_Correo !== b.coFa_Correo) {
      this.cambiosDetectados.correo = {
        anterior: b.coFa_Correo,
        nuevo: a.coFa_Correo,
        label: 'Correo Electrónico'
      };
    }

    if (a.coFa_DiasDevolucion !== b.coFa_DiasDevolucion) {
      this.cambiosDetectados.diasDevolucion = {
        anterior: b.coFa_DiasDevolucion,
        nuevo: a.coFa_DiasDevolucion,
        label: 'Días de Devolución'
      };
    }

    if (a.coFa_Telefono1 !== b.coFa_Telefono1) {
      this.cambiosDetectados.telefono1 = {
        anterior: b.coFa_Telefono1,
        nuevo: a.coFa_Telefono1,
        label: 'Teléfono Principal'
      };
    }

    if (a.coFa_Telefono2 !== b.coFa_Telefono2) {
      this.cambiosDetectados.telefono2 = {
        anterior: b.coFa_Telefono2 || 'Sin teléfono',
        nuevo: a.coFa_Telefono2 || 'Sin teléfono',
        label: 'Teléfono Secundario'
      };
    }

    if (a.colo_Id !== b.colo_Id) {
      const coloniaAnterior = this.colonia.find(c => c.colo_Id === b.colo_Id);
      const coloniaNueva = this.colonia.find(c => c.colo_Id === a.colo_Id);

      this.cambiosDetectados.colonia = {
        anterior: coloniaAnterior ? `${coloniaAnterior.colo_Descripcion} - ${coloniaAnterior.muni_Descripcion} - ${coloniaAnterior.depa_Descripcion}` : 'No seleccionada',
        nuevo: coloniaNueva ? `${coloniaNueva.colo_Descripcion} - ${coloniaNueva.muni_Descripcion} - ${coloniaNueva.depa_Descripcion}` : 'No seleccionada',
        label: 'Colonia'
      };
    }

    if (a.coFa_RutaMigracion !== b.coFa_RutaMigracion) {
      this.cambiosDetectados.rutaMigracion = {
        anterior: b.coFa_RutaMigracion,
        nuevo: a.coFa_RutaMigracion,
        label: 'Ruta de Migración'
      };
    }

    if (a.coFa_Logo !== b.coFa_Logo) {
      this.cambiosDetectados.logo = {
        anterior: b.coFa_Logo ? 'Logo actual' : 'Sin logo',
        nuevo: a.coFa_Logo ? 'Nuevo logo' : 'Sin logo',
        label: 'Logo de la Empresa'
      };
    }

    return Object.keys(this.cambiosDetectados).length > 0;
  }


  // Método para obtener la lista de cambios como array
  obtenerListaCambios(): any[] {
    return Object.values(this.cambiosDetectados);
  }

  cancelarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
  }

  confirmarEdicion(): void {
    this.mostrarConfirmacionEditar = false;
    this.guardar();
  }

  private guardar(): void {
    // Validación final antes de guardar
    if (!this.validarCampos()) {
      return;
    }

    const body = {
      ...this.configFactura,
      usua_Modificacion: getUserId(),
      coFa_FechaModificacion: new Date().toISOString()
    };

    console.log('Body a enviar:', body);
    console.log('coFa_LogoZPL en body:', body.coFa_LogoZPL ? 'Presente (' + body.coFa_LogoZPL.length + ' caracteres)' : 'NO PRESENTE');

    this.http.put<any>(`${environment.apiBaseUrl}/ConfiguracionFactura/Actualizar`, body, {
      headers: {
        'X-Api-Key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      }
    }).subscribe({
      next: () => {
        this.mostrarAlertaExito = true;
        this.mensajeExito = 'Configuración actualizada exitosamente.';
        this.mostrarErrores = false;
        setTimeout(() => {
          this.onSave.emit(this.configFactura);
          this.cancelar();
        }, 3000);
      },
      error: (error) => {
        console.error('Error al actualizar:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al actualizar. Intente de nuevo.';
        setTimeout(() => this.cerrarAlerta(), 5000);
      }
    });
  }

  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaError = false;
    this.mostrarAlertaWarning = false;
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeWarning = '';
  }
}