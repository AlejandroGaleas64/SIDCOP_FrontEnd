import { Component, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { getUserId } from 'src/app/core/utils/user-utils';
import { Sucursales } from 'src/app/Modelos/general/Sucursales.Model';
import { Municipio } from 'src/app/Modelos/general/Municipios.Model';
import { Departamento } from 'src/app/Modelos/general/Departamentos.Model';
import { Colonias } from 'src/app/Modelos/general/Colonias.Model';
import { NgSelectModule } from '@ng-select/ng-select';

@Component({
  selector: 'app-create',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, NgSelectModule],
  templateUrl: './create.component.html',
  styleUrl: './create.component.scss'
})
export class CreateComponent implements OnInit {

  // Valida formato de correo electrónico usando expresión regular
  validarCorreo(correo: string): boolean {
    if (!correo) return false;

    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(correo.trim());
  }

  // Aplica máscara XXXX-XXXX a números de teléfono (8 dígitos)
  aplicarMascaraTelefono(valor: string): string {
    valor = valor.replace(/[^\d]/g, '').slice(0, 8);
    let resultado = '';
    for (let i = 0; i < valor.length; i += 4) {
      if (resultado) resultado += '-';
      resultado += valor.substring(i, i + 4);
    }
    return resultado;
  }

  // Maneja input de teléfono aplicando máscara y limitando a 8 dígitos
  onTelefonoInput(event: Event, campo: 'sucu_Telefono1' | 'sucu_Telefono2') {
    const input = event.target as HTMLInputElement;
    if (input && input.value !== undefined) {
      let valor = input.value.replace(/[^\d]/g, '');
      if (valor.length > 8) {
        valor = valor.slice(0, 8);
        input.value = valor;
      }
      this.sucursal[campo] = this.aplicarMascaraTelefono(valor);
    }
  }

  // Evita que se escriban letras (solo permite dígitos y teclas de navegación)
  onlyDigitsKeypress(event: KeyboardEvent) {
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (allowed.includes(event.key)) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // Maneja pegado en campos de teléfono: limpia todo lo que no sea dígito y aplica máscara
  onTelefonoPaste(event: ClipboardEvent, campo: 'sucu_Telefono1' | 'sucu_Telefono2') {
    event.preventDefault();
    const paste = event.clipboardData?.getData('text') || '';
    const digits = paste.replace(/\D/g, '').slice(0, 8);
    const input = event.target as HTMLInputElement;
    if (input) {
      input.value = this.aplicarMascaraTelefono(digits);
      this.sucursal[campo] = this.aplicarMascaraTelefono(digits);
    }
  }

  // Limita el código de sucursal a 3 dígitos numéricos
  aplicarmascaracodigo(valor: string): string {
    return valor.replace(/[^\d]/g, '').slice(0, 3);
  }

  // Maneja input de código limitando a 3 dígitos
  oncodigoinput(event: Event, campo: 'sucu_Codigo') {
    const input = event.target as HTMLInputElement;
    if (input && input.value !== undefined) {
      let valor = input.value.replace(/[^\d]/g, '');
      if (valor.length > 3) {
        valor = valor.slice(0, 3);
        input.value = valor;
      }
      this.sucursal[campo] = valor;
    }
  }
  @Output() onCancel = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<Sucursales>();
  @Output() onOverlayChange = new EventEmitter<boolean>();

  mostrarErrores = false;
  mostrarAlertaExito = false;
  mensajeExito = '';
  mostrarAlertaError = false;
  mensajeError = '';
  mostrarAlertaWarning = false;
  mensajeWarning = '';

departamentos: Departamento[] = [];
departamentoSeleccionado: string = '';
municipiosAll: Municipio[] = [];
municipios: Municipio[] = [];    
municipioSeleccionado: string = '';
coloniasfiltro: Colonias[] = [];
colonias: any[] = [];

  // Modelo de la sucursal a crear con valores iniciales
  sucursal: Sucursales = {
    sucu_Id: 0,
    secuencia: 0,
    sucu_Descripcion: '',
    colo_Id: 0,
    sucu_DireccionExacta: '',
    sucu_Telefono1: '',
    sucu_Telefono2: '',
    sucu_Correo: '',
    sucu_Codigo: '',
    usua_Creacion: getUserId(),
    sucu_FechaCreacion: new Date(),
    sucu_Estado: true
  };

  constructor(private http: HttpClient) {}

  // Carga colonias, genera código autoincrementable y obtiene departamentos/municipios
  ngOnInit(): void {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Sucursales/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      if (Array.isArray(data) && data.length > 0) {

        const codigos = data
          .map(s => s.sucu_Codigo)
          .filter(c => typeof c === 'string' && c.length === 3 && !isNaN(Number(c)));

        let maxCodigo = codigos.length > 0 ? Math.max(...codigos.map(c => Number(c))) : 0;
        let nuevoCodigo = (maxCodigo + 1).toString().padStart(3, '0');

        while (codigos.includes(nuevoCodigo)) {
          maxCodigo++;
          nuevoCodigo = (maxCodigo + 1).toString().padStart(3, '0');
        }
        this.sucursal.sucu_Codigo = nuevoCodigo;
      } else {
        this.sucursal.sucu_Codigo = '001';
      }
    });
    // Obtener departamentos
    this.http.get<Departamento[]>(`${environment.apiBaseUrl}/Departamentos/Listar`, {
    headers: { 'x-api-key': environment.apiKey }
  }).subscribe(data => {
    
    this.departamentos = data;
  }, error => {

  });

    // Obtener municipios (todos)
    this.http.get<Municipio[]>(`${environment.apiBaseUrl}/Municipios/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe(data => {
      this.municipiosAll = data;
    });

    // Obtener colonias
    this.http.get<any>(`${environment.apiBaseUrl}/Colonia/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe((data) => {
      this.colonias = Array.isArray(data)
        ? data.map(c => ({ ...c, colo_Id: Number(c.colo_Id) }))
        : [];
      // No asignar valor por defecto, el usuario debe seleccionar una colonia
      this.sucursal.colo_Id = 0;
    });
  }

  // Función de búsqueda para ng-select de colonias (busca en colonia/municipio/departamento)
  searchColonias = (term: string, item: any) => {
    term = term.toLowerCase();
    return (
      item.colo_Descripcion?.toLowerCase().includes(term) ||
      item.muni_Descripcion?.toLowerCase().includes(term) ||
      item.depa_Descripcion?.toLowerCase().includes(term)
    );
  };

  // Asigna el ID numérico de la colonia seleccionada al modelo
  onColoniaSeleccionada(id: any) {
    this.sucursal.colo_Id = typeof id === 'object' && id !== null ? Number(id.colo_Id) : Number(id);
  }

  // Limpia formulario, resetea valores y emite evento de cancelación
  cancelar(): void {
    this.mostrarErrores = false;
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
    setTimeout(() => {
      this.onOverlayChange.emit(false);
      this.sucursal = {
        secuencia: 0,
        sucu_Id: 0,
        sucu_Descripcion: '',
        colo_Id: 0,
        sucu_DireccionExacta: '',
        sucu_Telefono1: '',
        sucu_Telefono2: '',
        sucu_Codigo: '',
        sucu_Correo: '',
        usua_Creacion: getUserId(),
        sucu_FechaCreacion: new Date(),
        sucu_Estado: true
      };
      this.onCancel.emit();
      this.departamentoSeleccionado = '';
      this.municipioSeleccionado = '';
      this.municipios = [];
      this.colonias = [];
    }, 100);
  }

  cerrarAlerta(): void {
    this.mostrarAlertaExito = false;
    this.mensajeExito = '';
    this.mostrarAlertaError = false;
    this.mensajeError = '';
    this.mostrarAlertaWarning = false;
    this.mensajeWarning = '';
  }

  // Valida campos requeridos y ejecuta POST al endpoint de inserción
  guardar(): void {
  this.sucursal.colo_Id = Number(this.sucursal.colo_Id);
    this.mostrarErrores = true;
    this.onOverlayChange.emit(true);
    
    // Validar correo electrónico
    if (this.sucursal.sucu_Correo.trim() && !this.validarCorreo(this.sucursal.sucu_Correo)) {
      this.onOverlayChange.emit(false);
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor ingrese un correo electrónico válido.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
      return;
    }
    
    if (
      this.sucursal.sucu_Descripcion.trim() &&
      this.sucursal.colo_Id &&
      this.sucursal.sucu_DireccionExacta.trim() &&
      this.sucursal.sucu_Codigo &&
      this.sucursal.sucu_Codigo.trim() &&
      this.sucursal.sucu_Telefono1.trim() &&
      this.sucursal.sucu_Correo.trim() &&
      this.validarCorreo(this.sucursal.sucu_Correo)
    ) {
      this.mostrarAlertaWarning = false;
      this.mostrarAlertaError = false;

      const sucursalGuardar = {
        ...this.sucursal,
        usua_Creacion: getUserId(),
        sucu_FechaCreacion: new Date().toISOString()
      };
      this.http.post<any>(`${environment.apiBaseUrl}/Sucursales/Insertar`, sucursalGuardar, {
        headers: {
          'X-Api-Key': environment.apiKey,
          'Content-Type': 'application/json',
          'accept': '*/*'
        }
      }).subscribe({
        next: (response) => {
          if (response?.data?.code_Status === 1) {
            this.mostrarErrores = false;
            setTimeout(() => {
              this.onOverlayChange.emit(false);
              this.mensajeExito = response.data.message_Status || `Sucursal "${this.sucursal.sucu_Descripcion}" guardada exitosamente`;
              this.mostrarAlertaExito = true;
              setTimeout(() => {
                this.mostrarAlertaExito = false;
                setTimeout(() => {
                  this.onSave.emit(this.sucursal);
                  this.cancelar();
                }, 100);
              }, 2000);
            }, 300);
          }
          if(response?.data?.code_Status === -1) {
            setTimeout(() => {
              this.onOverlayChange.emit(false);
              this.mostrarAlertaError = true;
              this.mensajeError = response?.data?.message_Status || 'ya existe una sucursal con estos datos.';
              this.mostrarAlertaExito = false;
              setTimeout(() => {
                this.mostrarAlertaError = false;
                this.mensajeError = '';
              }, 5000);
            }, 1000);
          }
        },
        error: (error) => {
          setTimeout(() => {
            this.onOverlayChange.emit(false);
            const codeStatus = error?.error?.data?.code_Status;
            const messageStatus = error?.error?.data?.message_Status;
            this.mostrarAlertaError = true;
            if (codeStatus === 0) {
              this.mensajeError = messageStatus || 'Error al guardar la sucursal. Por favor, intente nuevamente.';
            } else if (codeStatus === -1) {
              this.mensajeError = messageStatus || 'Ya existe una sucursal con estos datos.';
            } else {
              this.mensajeError = error?.error?.message || 'Error inesperado al guardar la sucursal.';
            }
            this.mostrarAlertaExito = false;
            setTimeout(() => {
              this.mostrarAlertaError = false;
              this.mensajeError = '';
            }, 5000);
          }, 1000);
        }
      });
    } else {
      this.onOverlayChange.emit(false);
      this.mostrarAlertaWarning = true;
      this.mensajeWarning = 'Por favor complete todos los campos requeridos antes de guardar.';
      this.mostrarAlertaError = false;
      this.mostrarAlertaExito = false;
      setTimeout(() => {
        this.mostrarAlertaWarning = false;
        this.mensajeWarning = '';
      }, 4000);
    }
  }
}