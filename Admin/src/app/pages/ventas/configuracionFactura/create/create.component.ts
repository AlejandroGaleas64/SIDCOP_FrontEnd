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

  // Validación de correo electrónico (alineada con edit)
  isValidEmail(email: string): boolean {
    if (!email || email.trim() === '') return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  // Verificar si RTN tiene exactamente 14 dígitos (alineada con edit)
  isValidRTN(rtn: string): boolean {
    if (!rtn || rtn.trim() === '') return false;
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
          height: 170, // Alto máximo para optimizar el tamaño del archivo
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
      const zplCode = await response.text();
      console.log('ZPL generado por Labelary (primeros 200 caracteres):', zplCode.substring(0, 200));
      
      return zplCode;
    } catch (error) {
      console.error('Error al convertir imagen a ZPL con Labelary:', error);
      throw new Error('No se pudo convertir la imagen a formato ZPL. Por favor, inténtelo de nuevo.');
    }
  }
}