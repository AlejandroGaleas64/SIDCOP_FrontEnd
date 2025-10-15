import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { DataResponse } from 'src/app/Modelos/dataresponse.model';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { AuthfakeauthenticationService } from 'src/app/core/services/authfake.service';
import { login } from 'src/app/store/Authentication/authentication.actions';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})

/**
 * Componente para el inicio de sesión de usuarios.
 * Permite validar credenciales, mostrar alertas, controlar la visibilidad de recuperación de contraseña y manejar el estado de carga.
 */
export class LoginComponent {

  /** Formulario de login */
  loginForm!: UntypedFormGroup;
  /** Indica si el formulario fue enviado */
  submitted = false;
  /** Controla la visibilidad del campo de contraseña */
  fieldTextType!: boolean;
  /** Mensaje de error general */
  error = '';
  /** URL de retorno tras login */
  returnUrl!: string;
  /** Variables de ejemplo (no usadas) */
  a: any = 10;
  b: any = 20;
  /** Controla la visibilidad del componente de recuperar contraseña */
  toast!: false;
  showrecuperar: boolean = false;

  /** Estado de carga y alertas */
  isLoading: boolean = false;
  /** Tipo de alerta mostrada */
  alertType: 'success' | 'danger' | 'warning' | '' = '';
  /** Mensaje de alerta */
  alertMessage: string = '';
  /** Indica si se muestra la alerta */
  showAlert: boolean = false;

  /** Año actual para mostrar en el footer */
  year: number = new Date().getFullYear();

  /**
   * Constructor del componente. Inicializa servicios y el formBuilder.
   * @param formBuilder Constructor de formularios
   * @param router Servicio de rutas
   * @param store Store de NgRx
   * @param authService Servicio de autenticación
   */
  constructor(private formBuilder: UntypedFormBuilder,
    private router: Router,
    private store: Store,
    private authService: AuthenticationService
) { }

  /**
   * Inicializa el formulario y redirige si el usuario ya está autenticado.
   */
  ngOnInit(): void {
    if (localStorage.getItem('currentUser')) {
      this.router.navigate(['/']);
    }
    // Inicialización del formulario de login
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required]],
      password: ['', [Validators.required]],
    });
  }

  /**
   * Getter para acceder fácilmente a los campos del formulario.
   */
  get f() { return this.loginForm.controls; }

  /**
   * Envía el formulario de login, valida los campos y llama al servicio de autenticación.
   * Muestra alertas según el resultado.
   */
  onSubmit() {
    this.submitted = true;
    this.showAlert = false; // Ocultar cualquier alerta previa

    // Verificar si el formulario es válido
    if (this.loginForm.invalid) {
      // Mostrar advertencia de campos requeridos
      this.alertType = 'warning';
      this.alertMessage = 'Todos los campos son obligatorios. Por favor, complete el formulario.';
      this.showAlert = true;
      return;
    }

    const email = this.f['email'].value; // Get the username from the form
    const password = this.f['password'].value; // Get the password from the form

    // Activar el loader
    this.isLoading = true;

    // Llamar directamente al servicio de autenticación
    this.authService.login(email, password).subscribe({
      next: (response) => {
        // En caso de éxito, redirigir al usuario a la página principal
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error: (error) => {
        this.isLoading = false;
        
        // Manejar diferentes tipos de errores usando la interfaz DataResponse
        if (error) {
          // Mapear la respuesta de error usando la interfaz DataResponse
          const errorResponse: DataResponse = error;
          
          if (error && error.message && typeof error.message === 'string' && error.message.includes('-1')) {
            // Usuario inexistente o inactivo
            this.alertType = 'warning';
            this.alertMessage = 'Usuario inexistente o inactivo.';
          } else if (errorResponse.code_Status === 0) {
            // Error general al iniciar sesión
            this.alertType = 'danger';
            this.alertMessage = errorResponse.message_Status || 'Error al iniciar sesión';
          } else {
            // Otro tipo de error
            this.alertType = 'danger';
            this.alertMessage = errorResponse.message_Status || 'Error desconocido al iniciar sesión';
          }
        } else {
          // Error genérico si no hay estructura de error esperada
          this.alertType = 'danger';
          this.alertMessage = 'Error al iniciar sesión';
        }
        
        this.showAlert = true;
      }
    });
  }

  /**
   * Alterna la visibilidad del campo de contraseña.
   */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  /**
   * Método para volver desde el componente de recuperar contraseña y mostrar el login.
   */
  volver() {
    this.showrecuperar = false;
  }
}
