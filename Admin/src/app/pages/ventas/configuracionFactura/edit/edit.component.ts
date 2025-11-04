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

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      // Validar el tamaño de la imagen antes de continuar
      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        img.onload = () => {
          // Validar que la imagen sea cuadrada (aspect ratio 1:1)
          const aspectRatio = img.width / img.height;
          const isCuadrada = Math.abs(aspectRatio - 1) < 0.01; // Tolerancia del 1%
          
          if (!isCuadrada) {
            this.mostrarAlertaError = true;
            this.mensajeError = `La imagen debe ser cuadrada (misma anchura y altura). La imagen seleccionada es de ${img.width}x${img.height} píxeles.`;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
            // Limpiar el input
            event.target.value = '';
            return;
          }
          
          // Si la validación pasa, continuar con el proceso normal
          this.selectedFile = file;
          
          // Check if it's an SVG file
          this.isSvgFile = file.type === 'image/svg+xml';
          
          // Create a preview for SVG files
          if (this.isSvgFile) {
            this.svgPreviewUrl = e.target.result;
            // For SVG files, we'll still show the cropper but also keep the original SVG for preview
            this.imageCropper.nativeElement.src = e.target.result;
            this.showCropper = true;
            
            setTimeout(() => {
              if (this.cropper) {
                this.cropper.destroy();
              }
              this.cropper = new Cropper(this.imageCropper.nativeElement, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 1,
                responsive: true,
                background: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
              });
            }, 100);
          } else {
            // For non-SVG files, use the original behavior
            this.imageCropper.nativeElement.src = e.target.result;
            this.showCropper = true;
            
            setTimeout(() => {
              if (this.cropper) {
                this.cropper.destroy();
              }
              this.cropper = new Cropper(this.imageCropper.nativeElement, {
                aspectRatio: 1,
                viewMode: 1,
                autoCropArea: 1,
                responsive: true,
                background: false,
                guides: true,
                center: true,
                highlight: false,
                cropBoxMovable: true,
                cropBoxResizable: true,
                toggleDragModeOnDblclick: false,
              });
            }, 100);
          }
        };
        img.src = e.target.result as string;
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
        // Obtener la imagen recortada como blob con el tamaño exacto requerido
        const canvas = this.cropper.getCroppedCanvas({
          width: 140,
          height: 100,
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
              // Subir imagen al backend usando ImageUploadService
              const imagePath = await this.imageUploadService.uploadImageAsync(croppedFile);
              console.log('Imagen subida exitosamente. Ruta:', imagePath);
              this.configFactura.coFa_Logo = imagePath;
              
              // Convertir la imagen a formato ZPL
              const zplCode = await this.convertImageToZPL(canvas);
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
   * Obtiene la URL completa para mostrar la imagen
   */
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

  /**
   * Convierte una imagen de canvas a formato ZPL
   * @param canvas Canvas con la imagen a convertir
   * @returns Código ZPL como string
   */
  private async convertImageToZPL(canvas: HTMLCanvasElement): Promise<string> {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('No se pudo obtener el contexto del canvas');
    }

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Aplicar dithering Floyd-Steinberg para mejor calidad
    const grayscale: number[] = [];
    
    // Convertir a escala de grises
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const a = pixels[i + 3];
        
        // Si es transparente, considerar como blanco
        if (a < 128) {
          grayscale.push(255);
        } else {
          // Convertir a escala de grises con ponderación estándar
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          grayscale.push(gray);
        }
      }
    }

    // Aplicar Floyd-Steinberg dithering para mejor calidad
    const binaryData: number[] = new Array(width * height).fill(0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = grayscale[idx];
        const newPixel = oldPixel < 128 ? 0 : 255;
        binaryData[idx] = newPixel === 0 ? 1 : 0; // 1 = negro, 0 = blanco
        
        const error = oldPixel - newPixel;
        
        // Distribuir el error a píxeles vecinos
        if (x + 1 < width) {
          grayscale[idx + 1] += error * 7 / 16;
        }
        if (y + 1 < height) {
          if (x > 0) {
            grayscale[idx + width - 1] += error * 3 / 16;
          }
          grayscale[idx + width] += error * 5 / 16;
          if (x + 1 < width) {
            grayscale[idx + width + 1] += error * 1 / 16;
          }
        }
      }
    }

    // Convertir datos binarios a formato hexadecimal para ZPL
    const bytesPerRow = Math.ceil(width / 8);
    const totalBytes = bytesPerRow * height;
    const hexData: string[] = [];

    for (let y = 0; y < height; y++) {
      for (let byteIndex = 0; byteIndex < bytesPerRow; byteIndex++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = byteIndex * 8 + bit;
          if (x < width) {
            const pixelIndex = y * width + x;
            if (binaryData[pixelIndex] === 1) {
              byte |= (1 << (7 - bit));
            }
          }
        }
        hexData.push(byte.toString(16).toUpperCase().padStart(2, '00'));
      }
    }

    // Comprimir datos usando run-length encoding (RLE) para ZPL
    const compressedHex = this.compressZPLData(hexData);

    // Generar comando ZPL completo
    const zplCode = `^GFA,${totalBytes},${totalBytes},${bytesPerRow},${compressedHex}`;
    
    return zplCode;
  }

  /**
   * Comprime los datos hexadecimales usando run-length encoding para ZPL
   * @param hexData Array de strings hexadecimales
   * @returns String comprimido
   */
  private compressZPLData(hexData: string[]): string {
    let compressed = '';
    let count = 1;
    let current = hexData[0];

    for (let i = 1; i < hexData.length; i++) {
      if (hexData[i] === current && count < 400) {
        count++;
      } else {
        // Agregar el dato comprimido
        if (count > 1) {
          compressed += this.encodeZPLCount(count);
        }
        compressed += current;
        current = hexData[i];
        count = 1;
      }
    }

    // Agregar el último grupo
    if (count > 1) {
      compressed += this.encodeZPLCount(count);
    }
    compressed += current;

    return compressed;
  }

  /**
   * Codifica el conteo para el formato ZPL
   * @param count Número de repeticiones
   * @returns String codificado
   */
  private encodeZPLCount(count: number): string {
    if (count <= 0) return '';
    
    // ZPL usa un sistema especial para codificar repeticiones
    if (count <= 19) {
      return String.fromCharCode(0x47 + count); // G-Z representa 1-19
    } else if (count <= 399) {
      const hundreds = Math.floor(count / 20);
      const remainder = count % 20;
      let result = String.fromCharCode(0x66 + hundreds); // g-z representa múltiplos de 20
      if (remainder > 0) {
        result += String.fromCharCode(0x47 + remainder);
      }
      return result;
    } else {
      return count.toString();
    }
  }
}