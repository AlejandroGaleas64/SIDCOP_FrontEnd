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

// Login Component
export class LoginComponent {

  // Login Form
  loginForm!: UntypedFormGroup;
  submitted = false;
  fieldTextType!: boolean;
  error = '';
  returnUrl!: string;
  a: any = 10;
  b: any = 20;
  toast!: false;
  showrecuperar: boolean = false; // Controla la visibilidad del componente de recuperar contraseña
  
  // Propiedades para alerts y loader
  isLoading: boolean = false;
  alertType: 'success' | 'danger' | 'warning' | '' = '';
  alertMessage: string = '';
  showAlert: boolean = false;

  // set the current year
  year: number = new Date().getFullYear();

  // tslint:disable-next-line: max-line-length
  constructor(private formBuilder: UntypedFormBuilder,
    private router: Router,
    private store: Store,
    private authService: AuthenticationService
) { }

  ngOnInit(): void {
    if (localStorage.getItem('currentUser')) {
      this.router.navigate(['/']);
    }
    /**
     * Form Validatyion
     */
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required]], // Campo de usuario
      password: ['', [Validators.required]],
    });
  }

  // convenience getter for easy access to form fields
  get f() { return this.loginForm.controls; }

  /**
   * Form submit
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
   * Password Hide/Show
   */
  toggleFieldTextType() {
    this.fieldTextType = !this.fieldTextType;
  }

  /**
   * Método para volver desde el componente de recuperar contraseña
   */
  volver() {
    // Ocultar el componente de recuperar contraseña y mostrar el formulario de login
    this.showrecuperar = false;
  }
}
