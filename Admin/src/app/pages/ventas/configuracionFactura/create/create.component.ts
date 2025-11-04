import { Component, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
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
  selector: 'app-create',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule, 
    NgSelectModule,
    NgxMaskDirective,
    SvgPreviewComponent
  ],
  templateUrl: './create.component.html',
  styleUrls: ['./create.component.scss'],
  providers: [provideNgxMask()]
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<any>();
  @ViewChild('imageCropper', { static: false }) imageCropper!: ElementRef<HTMLImageElement>;

  // Estados de alerta
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  // Cropper properties
  showCropper = false;
  cropper: Cropper | null = null;
  selectedFile: File | null = null;
  logoSeleccionado = false;
  
  // SVG preview properties
  isSvgFile = false;
  svgPreviewUrl: string | null = null;

  // Controla si usar el ZPL personalizado (true) o generar automáticamente (false)
  useCustomZPL = false;

  // Modelo
  configFactura = {
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
    colo_Id: 0
  };

  // Catálogos
  colonia: any[] = [];

  constructor(private http: HttpClient, private imageUploadService: ImageUploadService) {
    this.listarColonias();
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

  // Validación de correo electrónico
  isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  // Verificar si RTN tiene exactamente 14 dígitos
  isValidRTN(rtn: string): boolean {
    return rtn.length === 14 && /^\d{14}$/.test(rtn);
  }

  // Función de búsqueda para colonias
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  // Función para ordenar por municipio y departamento
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

  // Cargar colonias
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

  // Método cuando se selecciona una colonia
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
        // Obtener la imagen recortada con el tamaño exacto requerido
        const canvas = this.cropper.getCroppedCanvas({
          width: 140,
          height: 100,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });
        
        canvas.toBlob(async (blob: Blob | null) => {
          if (blob) {
            const croppedFile = new File([blob], this.selectedFile!.name, {
              type: this.selectedFile!.type,
              lastModified: Date.now()
            });
            
            try {
              console.log('Iniciando subida de imagen...');
              const imagePath = await this.imageUploadService.uploadImageAsync(croppedFile);
              console.log('Imagen subida exitosamente. Ruta:', imagePath);
              this.configFactura.coFa_Logo = imagePath;
              
              if (!this.useCustomZPL) {
                // Convertir la imagen a formato ZPL
                const zplCode = await this.convertImageToZPL(canvas);
                this.configFactura.coFa_LogoZPL = zplCode;
              } else {
                // Obtener el ZPL personalizado
                const customZPL = await this.getCustomZPLLogo(canvas);
                this.configFactura.coFa_LogoZPL = customZPL;
              }
              
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

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mostrarAlertaWarning = false;
    this.mostrarAlertaError = false;
    this.mensajeExito = '';
    this.mensajeWarning = '';
    this.mensajeError = '';
  }

  cancelar(): void {
    this.cerrarAlerta();
    this.onCancel.emit();
    this.recargarPagina();
  }

  // Método para validar todos los campos obligatorios
  private validarCampos(): boolean {
    const errores: string[] = [];

    // Validar campos obligatorios básicos
    if (!this.configFactura.coFa_NombreEmpresa.trim()) {
      errores.push('Nombre de la empresa');
    }

    if (!this.configFactura.coFa_DireccionEmpresa.trim()) {
      errores.push('Dirección de la empresa');
    }

    // Validar RTN
    if (!this.configFactura.coFa_RTN.trim()) {
      errores.push('RTN');
    } else if (!this.isValidRTN(this.configFactura.coFa_RTN)) {
      errores.push('RTN debe tener exactamente 14 dígitos');
    }

    // Validar correo
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
      this.mensajeWarning = `Por favor complete o corrija los siguientes campos: ${errores.join(', ')}`;
      this.mostrarAlertaWarning = true;
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      
      // Ocultar la alerta de warning después de 5 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 5000);
      
      return false;
    }

    return true;
  }

  guardar(): void {
    this.mostrarErrores = true;
    this.cerrarAlerta(); // Cierra alertas previas

    // Validar campos obligatorios
    if (!this.validarCampos()) {
      return;
    }

    const body = {
      ...this.configFactura,
      usua_Creacion: getUserId(),
      coFa_FechaCreacion: new Date().toISOString()
    };

    console.log('Enviando body:', body);
    console.log('coFa_LogoZPL en body:', body.coFa_LogoZPL ? 'Presente (' + body.coFa_LogoZPL.length + ' caracteres)' : 'NO PRESENTE');

    this.http.post<any>(`${environment.apiBaseUrl}/ConfiguracionFactura/Insertar`, body, {
      headers: {
        'x-api-key': environment.apiKey,
        'Content-Type': 'application/json',
        'accept': '*/*'
      },
      observe: 'response'
    }).subscribe({
      next: (response) => {
        this.debugResponse(response, false);
        
        try {
          // Verifica si la petición fue exitosa por status HTTP
          if (response.status >= 200 && response.status < 300) {
            let codeStatus, messageStatus;
            const responseBody = response.body;
            
            // Maneja diferentes estructuras de respuesta
            if (responseBody && typeof responseBody === 'object') {
              if (responseBody.data) {
                codeStatus = responseBody.data.code_Status;
                messageStatus = responseBody.data.message_Status;
              } else if (responseBody.code_Status !== undefined) {
                codeStatus = responseBody.code_Status;
                messageStatus = responseBody.message_Status;
              } else if (responseBody.success !== undefined) {
                codeStatus = responseBody.success ? 1 : 0;
                messageStatus = responseBody.message || 'Operación completada';
              } else {
                // Si no hay estructura esperada, asume éxito por el status HTTP
                codeStatus = 1;
                messageStatus = 'Operación exitosa';
              }
            } else {
              // Si no hay body o no es objeto, asume éxito
              codeStatus = 1;
              messageStatus = 'Operación exitosa';
            }
            
            //console.log('Code Status determinado:', codeStatus);
            //console.log('Message Status:', messageStatus);
            
            if (codeStatus === 1 || codeStatus === true) {
              this.mensajeExito = 'Configuración guardada exitosamente';
              this.mostrarAlertaExito = true;
              this.mostrarErrores = false;
              
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                this.onSave.emit();
                this.recargarPagina();
              }, 3000);
            } else {
              this.mensajeError = messageStatus || 'Error al guardar la configuración';
              this.mostrarAlertaError = true;
              this.mostrarAlertaExito = false;
              
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
                this.recargarPagina();
              }, 5000);
            }
          } else {
            this.mensajeError = `Error en la respuesta del servidor (Status: ${response.status})`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
            
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        } catch (error) {
          console.error('Error procesando respuesta:', error);
          this.mensajeError = 'Error procesando la respuesta del servidor';
          this.mostrarAlertaError = true;
          this.mostrarAlertaExito = false;
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      },
      error: (error) => {
        this.debugResponse(error, true);
        
        try {
          // Maneja diferentes tipos de errores
          if (error.status === 200 || error.status === 201) {
            // A veces Angular considera 200/201 como error si la respuesta no es JSON válido
            this.mensajeExito = 'Configuración guardada exitosamente';
            this.mostrarAlertaExito = true;
            this.mostrarErrores = false;
            
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              this.onSave.emit();
              this.recargarPagina();
            }, 3000);
          } else if (error.status === 0) {
            this.mensajeError = 'Error de conexión. Verifique su conexión a internet.';
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          } else if (error.status >= 400 && error.status < 500) {
            this.mensajeError = `Error del cliente (${error.status}). Verifique los datos enviados.`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          } else if (error.status >= 500) {
            this.mensajeError = `Error del servidor (${error.status}). Intente nuevamente más tarde.`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          } else {
            this.mensajeError = `Error al guardar la configuración. Status: ${error.status}`;
            this.mostrarAlertaError = true;
            this.mostrarAlertaExito = false;
          }
          
          // Ocultar alertas de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        } catch (processingError) {
          console.error('Error procesando error:', processingError);
          this.mensajeError = 'Error inesperado al procesar la respuesta';
          this.mostrarAlertaError = true;
          this.mostrarAlertaExito = false;
          
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      }
    });
  }

  private debugResponse(response: any, isError: boolean): void {
    //console.log(isError ? 'Error Response:' : 'Success Response:', response);
    if (response && response.body) {
      //console.log('Response Body:', response.body);
    }
    if (response && response.status) {
      //console.log('Response Status:', response.status);
    }
  }

  private recargarPagina(): void {
    window.location.reload();
  }

  /**
   * Genera el código ZPL del logo predefinido (optimizado y oscuro)
   * @param canvas Canvas con la imagen (no usado, pero mantiene la firma)
   * @returns Código ZPL como string
   */
  private async getCustomZPLLogo(canvas: HTMLCanvasElement): Promise<string> {
    return `^GFA,1950,1666,17,
,::::::M07U018O0M0EU01EO0L01EV0FO00000807EV0F802L00001807CV0FC06L00001C0FCV07E07L00003C1FCV07E07L00003C1F8V03F0FL00003E3FW03F0F8K00003E3F0001F8Q01F8F8K00003E3E00071CR0F8F8K00007E3C000E0CR078F8K00007E21801E0CQ0318F8K00003E07001ES03C0F8K00003E0F003ES01E0F8K00003E3F003ES01F0F8K00043C3E007CS01F8F0800000061C7E007CT0FC70C000000618FE007CT0FE21C000000F00FC007CT07E01C000000F81F80078T07E03C000000F81F80078T03F03C000000F81F000F8T01F07C000000FC1E000FV0F07C000000FC12000FV0907C0000007C06000EV0C0FC0000007C0E001EV0E0FC0000007C1E001C0000FFFF8M0F0F80000003C3C00380007F7FFEM0F8F80000003C7C0070001E03C1FM0FC7K0001CFC00FE003807C078L07C7040000608FC01FFC06007C078L07E60C0000701F80787E0C0078078L07E01C0000781F80F01F180078078L03F03C00007C1F00E00F980078078L03F07C00007E1F004007F000F00FM01F0F800007E1E200003F060F01EL010F1F800003F1C6K0F8F0F03CL01871F800003F00EK079F0FFF8L01C13F000001F80EK03FE1EFEM01E03F000001F81EL0FC1E3CM01F03E000000F83EN01C3CM01F07E000000783EN03C1EM01F87C000000383EN03C1EM01F83K01C087EN0381EN0F82070000F007EN0780FN0FC03E0000FC07CN0780FN0FC0FE00007F07CN0700F8M07C1FC00007F8784M0F0078L047C3F800003FC78CM0E0078L063C7F800001FE71CM0E003CL071CFF000000FE43CM0C003EL0708FE0000007E03CP01EL0F81F80000001F03CP01FL0F81FK0K07CQ0F8K0F81L0070007C2P07800C10FC003C00003F007C3P03C00C18FC01F800003FC07C7P01E00C187C0FF000001FF0FC7Q0F81C3C7C1FF000000FF87C78P07E383C7C3FE0000007FC78F8P01FE03C7C7FC0000003FC78F8T03E3CFFK0000FE70F88R043E18FEK00003E20F8CR047E08F8K0M0F8ER0E7EO0M0F8FQ01E7EO0000FE00F8FQ03E3E01FEK0000FFC0F8F8P03E3E0FFCK00007FF0F8F8P07E3C1FF8K00003FF870FCP07E1C3FFL00000FFC60FCP07C087FEL000003FC007C6M01CFC00FF8L0K0FC007C7CL0F8FC00FEM0O07E3FK03F8F8Q0L03C03C3FC00007F0F80F8N0K0FFF83C1FE0001FE0F07FFCM0K07FFE1C0FF0003FE060FFFCM0K03FFF0C07F8003FC041FFF8M0L0FFF0003F8007F8001FFEN0L01FC0000FC007E00007FO0P0E003C007801ER0O0FFCN07FEQ0N03FFE00038000FFF8P0N0FFFC00078000FFFEP0M01FFF80F0781E03FFFP0N07FE0FFC38FFC0FF8P0Q03FFE00FFFT0Q0FFFC007FFCS0P01FFF0003FFFS0Q07FC0000FFCS0,`;
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
    // Usar un umbral más alto (180) para hacer el logo más oscuro
    const THRESHOLD = 180; // Aumentado de 128 a 180 para logos más oscuros
    const binaryData: number[] = new Array(width * height).fill(0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const oldPixel = grayscale[idx];
        const newPixel = oldPixel < THRESHOLD ? 0 : 255;
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
        hexData.push(byte.toString(16).toUpperCase().padStart(2, '0'));
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