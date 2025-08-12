import { Injectable } from '@angular/core';
import { MenuService } from './menu.service';
import { Store } from '@ngrx/store';

import { User } from '../../store/Authentication/auth.models';
import { getFirebaseBackend } from 'src/app/authUtils';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { GlobalComponent } from '../../global-component';

// Action
import {
  login,
  loginSuccess,
  loginFailure,
  logout,
  logoutSuccess,
  RegisterSuccess,
} from '../../store/Authentication/authentication.actions';

// Firebase
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';

const AUTH_API = GlobalComponent.AUTH_API;

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({ providedIn: 'root' })
export class AuthenticationService {
  user!: User;
  currentUserValue: any;

  private currentUserSubject: BehaviorSubject<User>;

  constructor(
    private http: HttpClient,
    private store: Store,
    private afAuth: AngularFireAuth,
    private menuService: MenuService
  ) {
    this.currentUserSubject = new BehaviorSubject<User>(
      JSON.parse(localStorage.getItem('currentUser')!)
    );
    
    // Inicializar el menú según los permisos actuales al cargar el servicio
    const permisosJson = localStorage.getItem('permisosJson');
    this.menuService.filtrarMenuPorPermisos(permisosJson);
  }

  // Sign in with Google provider
  signInWithGoogle(): Promise<User> {
    try {
      if (!firebase.apps.length || !(firebase.apps[0].options as any).apiKey) {
        console.warn('Firebase no está inicializado o tiene una configuración inválida');
        return Promise.reject('Firebase no está disponible');
      }
      const provider = new firebase.auth.GoogleAuthProvider();
      return this.signInWithPopup(provider);
    } catch (error) {
      console.error('Error al intentar autenticar con Google:', error);
      return Promise.reject('Error al intentar autenticar con Google');
    }
  }

  // Sign in with Facebook provider
  signInWithFacebook(): Promise<User> {
    try {
      if (!firebase.apps.length || !(firebase.apps[0].options as any).apiKey) {
        console.warn('Firebase no está inicializado o tiene una configuración inválida');
        return Promise.reject('Firebase no está disponible');
      }
      const provider = new firebase.auth.FacebookAuthProvider();
      return this.signInWithPopup(provider);
    } catch (error) {
      console.error('Error al intentar autenticar con Facebook:', error);
      return Promise.reject('Error al intentar autenticar con Facebook');
    }
  }

  // Sign in with a popup for the specified provider
  private async signInWithPopup(
    provider: firebase.auth.AuthProvider
  ): Promise<User> {
    try {
      const result = await this.afAuth.signInWithPopup(provider);
      const user = result.user;
      return {
        //     uid: user.uid,
        //     displayName: user.displayName,
        //     email: user.email,
        //     // Add other user properties as needed
      };
    } catch (error) {
      throw new Error('Failed to sign in with the specified provider.');
    }
  }

  // Sign out the current user
  signOut(): Promise<void> {
    return this.afAuth.signOut();
  }

  register(email: string, first_name: string, password: string) {
    return this.http
      .post(
        AUTH_API + 'signup',
        {
          email,
          first_name,
          password,
        },
        httpOptions
      )
      .pipe(
        map((response: any) => {
          const user = response;
          this.store.dispatch(RegisterSuccess({ user }));
          return user;
        }),
        catchError((error: any) => {
          const errorMessage = 'Login failed'; // Customize the error message as needed
          this.store.dispatch(loginFailure({ error: errorMessage }));
          return throwError(errorMessage);
        })
      );
  }

  login(email: string, password: string) {
    this.store.dispatch(login({ email, password }));

    // Crear el objeto de datos para la solicitud (enviar todo el objeto Usuario)
    const now = new Date();
    const loginData = {
      secuencia: 0,
      usua_Id: 0,
      usua_Usuario: email,
      correo: '',
      usua_Clave: password,
      role_Id: 0,
      role_Descripcion: '',
      usua_IdPersona: 0,
      usua_EsVendedor: false,
      usua_EsAdmin: false,
      usua_Imagen: '',
      usua_Creacion: 0,
      usua_FechaCreacion: now.toISOString(),
      usua_Modificacion: 0,
      usua_FechaModificacion: now.toISOString(),
      usua_Estado: true,
      permisosJson: '',
      nombreCompleto: '',
      code_Status: 0,
      message_Status: ''
    };

    // Usar el mismo patrón que en Estados Civiles
    const apiUrl = `${environment.apiBaseUrl}/Usuarios/IniciarSesion`;

    // Realizar la solicitud HTTP con los headers adecuados
    return this.http
      .post(apiUrl, loginData, {
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': environment.apiKey,
          accept: '*/*',
        },
      })
      .pipe(
        map((response: any) => {
          if (response && response.data) {

            if (response.data.code_Status !== 1) {
              // Create a structured error object that matches the DataResponse interface
              const errorResponse = {
                code_Status: -1,
                success: false,
                message: response.data.message_Status
              };
              throw errorResponse;
            }

            const userData = response.data;

            // Guardar información del usuario en localStorage
            localStorage.setItem('currentUser', JSON.stringify(userData));

            // Guardar el token si existe en la respuesta, o usar un dummy token
            if (userData.token) {
              localStorage.setItem('token', userData.token);
            } else {
              localStorage.setItem('token', 'dummy-token');
            }

            // Guardar ID del usuario
            if (userData.usua_Id) {
              localStorage.setItem('usuarioId', userData.usua_Id.toString());
            }

            // Guardar nombre de usuario
            if (userData.usua_Usuario) {
              localStorage.setItem('usuarioNombre', userData.usua_Usuario);
            }
           if (userData.sucu_Id) {
              localStorage.setItem('sucu_Id', userData.sucu_Id);
            }

            // Guardar permisos JSON
            if (userData.permisosJson) {
              localStorage.setItem('permisosJson', userData.permisosJson);
              
              // Actualizar el menú según los permisos del usuario
              this.menuService.filtrarMenuPorPermisos(userData.permisosJson);
            }

            // Guardar cualquier otro dato relevante que venga en la respuesta
            if (userData.usua_Email) {
              localStorage.setItem('usuarioEmail', userData.correo);
            }

            if (userData.usua_Nombres) {
              localStorage.setItem('usuarioNombres', userData.nombres);
            }

            if (userData.usua_Apellidos) {
              localStorage.setItem('usuarioApellidos', userData.apellidos);
            }

            if (userData.usua_Rol) {
              localStorage.setItem('usuarioRol', userData.role_Id.toString());
            }

            // Actualizar el subject del usuario actual
            this.currentUserSubject.next(userData);

            // Dispatch success action
            this.store.dispatch(loginSuccess({ user: userData }));
            return userData;
          } else {
            throw new Error('Respuesta inválida del servidor');
          }
        }),
catchError((error: any) => {
        let errorMessage = error;

        if (error.code_Status === 0) {
          errorMessage = 'No se pudo conectar al servidor.';
        } else if (error.code_Status === 401) {
          errorMessage = 'Credenciales incorrectas.';
        } else if (error.code_Status === -1) {
          errorMessage = '' + error.code_Status + error.message; // <- Aquí se captura tu error personalizado
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }

        this.store.dispatch(loginFailure({ error: errorMessage }));
        return throwError(() => new Error(errorMessage));
      })
      );
  }

  logout(): Observable<void> {
    this.store.dispatch(logout());
    // Perform any additional logout logic, e.g., calling an API to invalidate the token

    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('permisosJson'); // Eliminar permisos al cerrar sesión
    this.currentUserSubject.next(null!);
    this.store.dispatch(logoutSuccess());
    
    // Actualizar el menú para mostrar solo elementos permitidos sin autenticación
    this.menuService.filtrarMenuPorPermisos(null);

    // Return an Observable<void> indicating the successful logout
    return of(undefined).pipe(
      tap(() => {
        // Perform any additional logic after the logout is successful
      })
    );
  }

  resetPassword(email: string) {
    return this.http.post(AUTH_API + 'reset-password', { email }, httpOptions);
  }

  /**
   * Returns the current user
   */
  public currentUser(): any {
    return getFirebaseBackend()!.getAuthenticatedUser();
  }
}
