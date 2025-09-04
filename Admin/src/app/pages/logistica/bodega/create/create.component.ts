import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Bodega } from 'src/app/Modelos/logistica/Bodega.Model';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgxMaskDirective],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss',
  providers: [provideNgxMask()]
})
export class CreateComponent  {
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Bodega>();
  
  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

  constructor(private http: HttpClient) {
    this.listarSucursales();
    this.listarRegistroCai();
    this.listarModelos();
  }

  bodega: Bodega = {
    bode_Id: 0,
    bode_Descripcion: '',
    bode_Capacidad: 0,
    bode_Placa: '',
    bode_TipoCamion: '',
    bode_VIN: '',
    mode_Id: 0,
    regC_Id: 0,
    sucu_Id: 0,
    vend_Id: 0,
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    bode_FechaCreacion: new Date(),
    bode_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
    
  };

    //Variables para las listas desplegables
    sucursales: any[] = [];
    registroCais: any[] = [];
    vendedores: any[] = [];
    vendedoresFiltrados: any[] = []; // Nueva propiedad para vendedores filtrados
    modelos: any[] = [];

   // Función para validar VIN
  validarVIN(vin: string): { esValido: boolean, mensaje: string } {
    if (!vin) return { esValido: true, mensaje: '' }; // Si está vacío, no validamos aquí
    
    // Verificar longitud máxima de 17 caracteres
    if (vin.length > 17 || vin.length < 17) {
      return { esValido: false, mensaje: 'Ingrese un VIN Válido' };
    }
    
    // Verificar que no contenga las letras prohibidas O, I, Q (mayúsculas o minúsculas)
    const letrasProhibidas = /[OIQoiq]/;
    if (letrasProhibidas.test(vin)) {
      return { esValido: false, mensaje: 'El VIN no puede contener las letras O, I, Q' };
    }
    
    // Verificar que tenga al menos 3 letras (no solo números)
    const letras = vin.match(/[A-HJ-NPR-Z]/g); // Excluye O, I, Q
    if (!letras || letras.length < 3) {
      return { esValido: false, mensaje: 'El VIN debe contener al menos 3 letras' };
    }

    // Verificar que tenga al menos 3 números (no solo letras)
    const numeros = vin.match(/[0-9]/g);
    if (!numeros || numeros.length < 3) {
      return { esValido: false, mensaje: 'El VIN debe contener al menos 3 números' };
    }
    
    return { esValido: true, mensaje: '' };
  }

  validarPlaca(placa: string): { esValido: boolean, mensaje: string } {
    if (!placa) return { esValido: true, mensaje: '' }; // Si está vacío, no validamos aquí
    
    // Verificar longitud máxima de 7 caracteres
    if (placa.length > 8 || placa.length < 8) {
      return { esValido: false, mensaje: 'Ingrese una Placa Válida' };
    }

    return { esValido: true, mensaje: '' };
  }

  // Función auxiliar para verificar si es válido (para usar en condiciones simples)
  esVINValido(vin: string): boolean {
    return this.validarVIN(vin).esValido;
  }

  esPlacaValido(placa: string): boolean {
    return this.validarPlaca(placa).esValido;
  }

  // Función para filtrar caracteres en tiempo real
  onVINInput(event: any): void {
    let valor = event.target.value;
    
    // Remover caracteres prohibidos O, I, Q
    valor = valor.replace(/[OIQoiq]/g, '');
    
    // Limitar a 17 caracteres
    if (valor.length > 17) {
      valor = valor.substring(0, 17);
    }

    // Convertir a mayúsculas (opcional, ya que los VIN suelen ser en mayúsculas)
    valor = valor.toUpperCase();
    
    // Actualizar el modelo
    this.bodega.bode_VIN = valor;
    
    // Actualizar el input si fue modificado
    if (event.target.value !== valor) {
      event.target.value = valor;
    }
  }

  // Función para filtrar caracteres en tiempo real
  onPlacaInput(event: any): void {
    let valor = event.target.value;

    // Limitar a 8 caracteres
    if (valor.length > 8) {
      valor = valor.substring(0, 8);
    }
    
    // Convertir a mayúsculas (opcional, ya que las Placas suelen ser en mayúsculas)
    valor = valor.toUpperCase();
    
    // Actualizar el modelo
    this.bodega.bode_Placa = valor;

    // Actualizar el input si fue modificado
    if (event.target.value !== valor) {
      event.target.value = valor;
    }
  }

  contarLetrasVIN(): number {
    if (!this.bodega.bode_VIN) return 0;
    const letras = this.bodega.bode_VIN.match(/[A-HJ-NPR-Z]/g);
    return letras ? letras.length : 0;
  }

  contarNumerosVIN(): number {
    if (!this.bodega.bode_VIN) return 0;
    const numeros = this.bodega.bode_VIN.match(/[0-9]/g);
    return numeros ? numeros.length : 0;
  }

  // Función para obtener el mensaje de error del VIN
  getMensajeErrorVIN(): string {
    if (!this.bodega.bode_VIN.trim()) {
      return 'El campo VIN es requerido';
    }
    return this.validarVIN(this.bodega.bode_VIN).mensaje;
  }

  // Función para obtener el mensaje de error de la Placa
  getMensajeErrorPlaca(): string {
    if (!this.bodega.bode_Placa.trim()) {
      return 'El campo Placa es requerido';
    }
    return this.validarPlaca(this.bodega.bode_Placa).mensaje;
  }

  // Métodos para obtener las listas desplegables desde el backend
 listarSucursales(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.sucursales = data);
    };

  listarRegistroCai(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/RegistrosCaiS/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.registroCais = data);
    };

  listarVendedores(callback?: () => void): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => {
      this.vendedores = data;
      if (callback) {
        callback();
      }
    });
  }

  listarModelos(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Modelo/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.modelos = data);
    };

  // Nueva función para manejar el cambio de sucursal
  onSucursalChange(): void {
    console.log('Sucursal cambiada a:', this.bodega.sucu_Id, typeof this.bodega.sucu_Id);
    
    // Resetear el vendedor seleccionado
    this.bodega.vend_Id = 0;
    
    // Si hay una sucursal seleccionada, cargar los vendedores
    if (this.bodega.sucu_Id && Number(this.bodega.sucu_Id) > 0) {
      this.cargarVendedoresPorSucursal(Number(this.bodega.sucu_Id));
    } else {
      // Si no hay sucursal seleccionada, limpiar la lista de vendedores filtrados
      this.vendedoresFiltrados = [];
    }
}

  // Nueva función para cargar vendedores por sucursal
  cargarVendedoresPorSucursal(sucursalId: number): void {
    this.listarVendedores(() => {
      this.vendedoresFiltrados = this.vendedores.filter(vendedor => 
        Number(vendedor.sucu_Id) === Number(sucursalId)
      );
    });
  }

  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    this.vendedoresFiltrados = []; // Limpiar vendedores filtrados
    this.bodega = {
      bode_Id: 0,
    bode_Descripcion: '',
    bode_Capacidad: 0,
    bode_Placa: '',
    bode_TipoCamion: '',
    bode_VIN: '',
    mode_Id: 0,
    regC_Id: 0,
    sucu_Id: 0,
    vend_Id: 0,
    usua_Creacion: 0,
    usua_Modificacion: 0,
    secuencia: 0,
    bode_FechaCreacion: new Date(),
    bode_FechaModificacion: new Date(),
    code_Status: 0,
    message_Status: '',
    usuarioCreacion: '',
    usuarioModificacion: ''
    };
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

  guardar(): void {
    this.mostrarErrores = true;
    
    // Validar campos requeridos
    if (this.bodega.bode_Descripcion.trim() &&
        this.bodega.bode_Capacidad > 0 && this.bodega.bode_Placa.trim() &&
        this.bodega.bode_TipoCamion.trim() && this.bodega.bode_VIN.trim() &&
        this.esVINValido(this.bodega.bode_VIN) &&
        this.esPlacaValido(this.bodega.bode_Placa) &&
        this.bodega.sucu_Id > 0 && this.bodega.regC_Id > 0 && this.bodega.vend_Id > 0 && this.bodega.mode_Id > 0
      
      )
      {
      // Limpiar alertas previas
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;

      const placa = this.bodega.bode_Placa.trim();
      const placaMask = placa.length === 7 ? placa.slice(0, 3) + '-' + placa.slice(3, 7) : placa;
      
      const bodegaGuardar = {
        bode_Id: 0,
        bode_Descripcion: this.bodega.bode_Descripcion.trim(),
        sucu_Id: this.bodega.sucu_Id,
        regC_Id: this.bodega.regC_Id,
        vend_Id: this.bodega.vend_Id,
        mode_Id: this.bodega.mode_Id,
        bode_VIN: this.bodega.bode_VIN.trim(),
        bode_Placa: placaMask,
        bode_TipoCamion: this.bodega.bode_TipoCamion.trim(),
        bode_Capacidad: this.bodega.bode_Capacidad,
        usua_Creacion: getUserId(),// varibale global, obtiene el valor del environment, esto por mientras
        bode_FechaCreacion: new Date().toISOString(),
        usua_Modificacion: 0,
        numero: "", 
        bode_FechaModificacion: new Date().toISOString(),
        usuarioCreacion: "", 
        usuarioModificacion: "" 
      };

      console.log('Guardando bodega:', bodegaGuardar);
      this.http.post<any>(`${environment.apiBaseUrl}/Bodega/Insertar`, bodegaGuardar, {
        headers: { 
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if(response.data.code_Status === 1) {
            this.mostrarErrores = false;
            this.onSave.emit(this.bodega);
            this.cancelar();
          }else{
            this.mostrarAlertaError = true;
            this.mensajeError = 'Error al guardar la bodega, ' + response.data.message_Status;
            this.mostrarAlertaExito = false;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }
        },
        error: (error) => {
          console.error('Error al guardar bodega:', error);
          this.mostrarAlertaError = true;
          this.mensajeError = 'Error al guardar el bodega. Por favor, intente nuevamente.';
          this.mostrarAlertaExito = false;
          
          // Ocultar la alerta de error después de 5 segundos
          setTimeout(() => {
            this.mostrarAlertaError = false;
            this.mensajeError = '';
          }, 5000);
        }
      });
    } else {
       if(this.bodega.bode_Capacidad <= 0) {
        this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'La capacidad de la bodega debe ser mayor a 0.';
        this.mostrarAlertaError = false;
        this.mostrarAlertaExito = false;
       }
       else{
         this.mostrarAlertaWarning = true;
        this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
        this.mostrarAlertaError = false;
        this.mostrarAlertaExito = false;
       }
      // Mostrar alerta de warning para campos vacíos
     
      
      // Ocultar la alerta de warning después de 4 segundos
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}