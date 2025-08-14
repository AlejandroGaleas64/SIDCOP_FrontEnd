import { Component, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Ruta } from 'src/app/Modelos/logistica/Rutas.Model'; 
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { NgxMaskDirective, NgxMaskPipe, provideNgxMask } from 'ngx-mask';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgxMaskDirective, NgxMaskPipe],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
  providers: [provideNgxMask()]
})
export class CreateComponent {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Ruta>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';
  rutas: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.cargarRutas();
  }

  cargarRutas() {
      this.http.get<any[]>(`${environment.apiBaseUrl}/Rutas/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe(data => {
        this.rutas = data; 
        this.ruta.ruta_Codigo = this.generarSiguienteCodigo();
      },
      error => {
        console.error('Error al cargar las rutas:', error);
      });
    }

  ruta: Ruta = {
    ruta_Id: 0,
    ruta_Codigo: '',
    ruta_Descripcion: '',
    ruta_Observaciones: '',
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    ruta_FechaCreacion: new Date(),
    ruta_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
  };

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.onOverlayChange.emit(false);
    this.ruta = {
      ruta_Id: 0,
      ruta_Codigo: '',
      ruta_Descripcion: '',
      ruta_Observaciones: '',
      usua_Creacion: 0,
      usua_Modificacion: 0,
      secuencia: 0,
      ruta_FechaCreacion: new Date(),
      ruta_FechaModificacion: new Date(),
      code_Status: 0,
      message_Status: '',
      usuarioCreacion: '',
      usuarioModificacion: ''
    };
    this.ruta.ruta_Codigo = this.generarSiguienteCodigo();
    this.onCancel.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  bloquearCodigo(valor: string) {
    if (this.ruta.ruta_Codigo !== this.generarSiguienteCodigo()) {
      this.ruta.ruta_Codigo = this.generarSiguienteCodigo();
    }
  }


  guardar(): void {
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
    if (this.ruta.ruta_Descripcion.trim() && this.ruta.ruta_Codigo.trim()) {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;
      
      const rutaGuardar = {
        ruta_Id: 0,
        ruta_Codigo: this.ruta.ruta_Codigo.trim(),
        ruta_Descripcion: this.ruta.ruta_Descripcion.trim(),
        ruta_Observaciones: this.ruta.ruta_Observaciones.trim() || 'N/A',
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        ruta_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        numero: "", 
        ruta_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      console.log('Guardando ruta:', rutaGuardar);
      
      this.http.post<any>(`${environment.apiBaseUrl}/Rutas/Crear`, rutaGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          console.log('Ruta guardada exitosamente:', response);
          this.mostrarErrores = false;
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            this.mensajeExito = `Ruta "${this.ruta.ruta_Descripcion}" guardado exitosamente`;  
            this.mostrarAlertaExito = true;
            setTimeout(() => {
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.onSave.emit(this.ruta);
                this.cancelar();
              }, 100);
            }, 2000);
          }, 300);
        },
        error: (error) => {

          setTimeout(() => {
            this.onOverlayChange.emit(false);
            console.error('Error al guardar ruta:', error);
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar la ruta. Por favor, intente nuevamente.';
            this.mostrarAlertaExito = false;
            // Ocultar la alerta de error después de 5 segundos
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }, 1000);
        }
      });
    } else {
      // Mostrar alerta de warning para campos vacíos
      this.onOverlayChange.emit(false);
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      
      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }

  generarSiguienteCodigo(): string {
    if (!this.rutas || this.rutas.length === 0) return 'RT-001';

    // Tomar solo los códigos que tengan el formato RT-XXX
    const codigos = this.rutas
      .map(r => r.ruta_Codigo)
      .filter(c => /^RT-\d{3}$/.test(c));

    if (codigos.length === 0) return 'RT-001';

    // Obtener el número más alto
    const numeros = codigos.map(c => parseInt(c.split('-')[1], 10));
    const maxNumero = Math.max(...numeros);

    // Generar siguiente código con ceros a la izquierda
    const siguienteNumero = (maxNumero + 1).toString().padStart(3, '0');
    return `RT-${siguienteNumero}`;
  }
}
