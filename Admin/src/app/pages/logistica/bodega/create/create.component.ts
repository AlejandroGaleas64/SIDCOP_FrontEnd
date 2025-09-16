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
    this.listarMarcas(); // Cambiado de listarModelos() a listarMarcas()
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
    vendedoresFiltrados: any[] = []; 
    marcas: any[] = []; // Nueva propiedad para marcas
    modelos: any[] = [];
    modelosFiltrados: any[] = []; // Nueva propiedad para modelos filtrados
    marcaSeleccionada: number = 0; // Nueva propiedad para la marca seleccionada

  // Función para validar VIN
  validarVIN(vin: string): { esValido: boolean, mensaje: string } {
    if (!vin) return { esValido: true, mensaje: '' }; 
    
    if (vin.length > 17 || vin.length < 17) {
      return { esValido: false, mensaje: 'Ingrese un VIN Válido' };
    }
    
    const letrasProhibidas = /[OIQoiq]/;
    if (letrasProhibidas.test(vin)) {
      return { esValido: false, mensaje: 'El VIN no puede contener las letras O, I, Q' };
    }
    
    const letras = vin.match(/[A-HJ-NPR-Z]/g);
    if (!letras || letras.length < 3) {
      return { esValido: false, mensaje: 'El VIN debe contener al menos 3 letras' };
    }

    const numeros = vin.match(/[0-9]/g);
    if (!numeros || numeros.length < 3) {
      return { esValido: false, mensaje: 'El VIN debe contener al menos 3 números' };
    }
    
    return { esValido: true, mensaje: '' };
  }

  validarPlaca(placa: string): { esValido: boolean, mensaje: string } {
    if (!placa) return { esValido: true, mensaje: '' };
    
    if (placa.length > 8 || placa.length < 8) {
      return { esValido: false, mensaje: 'Ingrese una Placa Válida' };
    }

    return { esValido: true, mensaje: '' };
  }

  esVINValido(vin: string): boolean {
    return this.validarVIN(vin).esValido;
  }

  esPlacaValido(placa: string): boolean {
    return this.validarPlaca(placa).esValido;
  }

  onVINInput(event: any): void {
    let valor = event.target.value;
    
    valor = valor.replace(/[OIQoiq]/g, '');
    
    if (valor.length > 17) {
      valor = valor.substring(0, 17);
    }

    valor = valor.toUpperCase();
    
    this.bodega.bode_VIN = valor;
    
    if (event.target.value !== valor) {
      event.target.value = valor;
    }
  }

  onPlacaInput(event: any): void {
    let valor = event.target.value;

    if (valor.length > 8) {
      valor = valor.substring(0, 8);
    }
    
    valor = valor.toUpperCase();
    
    this.bodega.bode_Placa = valor;

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

  getMensajeErrorVIN(): string {
    if (!this.bodega.bode_VIN.trim()) {
      return 'El campo VIN es requerido';
    }
    return this.validarVIN(this.bodega.bode_VIN).mensaje;
  }

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

  // Nuevo método para listar marcas de vehículos
  listarMarcas(): void {
    this.http.get<any>(`${environment.apiBaseUrl}/MarcasVehiculos/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => this.marcas = data);
  };

  // Método modificado para listar modelos (ahora carga todos)
  listarModelos(callback?: () => void): void {
    this.http.get<any>(`${environment.apiBaseUrl}/Modelo/Listar`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe((data) => {
        this.modelos = data;
        if (callback) {
          callback();
        }
      });
  };

  onSucursalChange(): void {
    console.log('Sucursal cambiada a:', this.bodega.sucu_Id, typeof this.bodega.sucu_Id);
    
    this.bodega.vend_Id = 0;
    
    if (this.bodega.sucu_Id && Number(this.bodega.sucu_Id) > 0) {
      this.cargarVendedoresPorSucursal(Number(this.bodega.sucu_Id));
    } else {
      this.vendedoresFiltrados = [];
    }
  }

  cargarVendedoresPorSucursal(sucursalId: number): void {
    this.listarVendedores(() => {
      this.vendedoresFiltrados = this.vendedores.filter(vendedor => 
        Number(vendedor.sucu_Id) === Number(sucursalId)
      );
    });
  }

  // Nueva función para manejar el cambio de marca
  onMarcaChange(): void {
    console.log('Marca cambiada a:', this.marcaSeleccionada);
    
    // Resetear el modelo seleccionado
    this.bodega.mode_Id = 0;
    
    // Si hay una marca seleccionada, cargar los modelos
    if (this.marcaSeleccionada && Number(this.marcaSeleccionada) > 0) {
      this.cargarModelosPorMarca(Number(this.marcaSeleccionada));
    } else {
      // Si no hay marca seleccionada, limpiar la lista de modelos filtrados
      this.modelosFiltrados = [];
    }
  }

  // Nueva función para cargar modelos por marca
  cargarModelosPorMarca(marcaId: number): void {
    this.listarModelos(() => {
      this.modelosFiltrados = this.modelos.filter(modelo => 
        Number(modelo.maVe_Id) === Number(marcaId)
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
    this.vendedoresFiltrados = [];
    this.modelosFiltrados = []; // Limpiar modelos filtrados
    this.marcaSeleccionada = 0; // Resetear marca seleccionada
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
    
    // Validar campos requeridos (agregamos la validación de marca)
    if (this.bodega.bode_Descripcion.trim() &&
        this.bodega.bode_Capacidad > 0 && this.bodega.bode_Placa.trim() &&
        this.bodega.bode_TipoCamion.trim() && this.bodega.bode_VIN.trim() &&
        this.esVINValido(this.bodega.bode_VIN) &&
        this.esPlacaValido(this.bodega.bode_Placa) &&
        this.bodega.sucu_Id > 0 && this.bodega.regC_Id > 0 && 
        this.bodega.vend_Id > 0 && this.bodega.mode_Id > 0 && 
        this.marcaSeleccionada > 0 // Validación de marca agregada
      )
      {
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
        usua_Creacion: getUserId(),
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
      
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}