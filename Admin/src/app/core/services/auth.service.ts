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
import { login, loginSuccess, loginFailure, logout, logoutSuccess, RegisterSuccess } from '../../store/Authentication/authentication.actions';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';

const AUTH_API = GlobalComponent.AUTH_API;
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({ providedIn: 'root' })
/**
 * Servicio de autenticación para el manejo de login, logout, registro y recuperación de contraseña.
 * Integra autenticación por API y proveedores externos (Google, Facebook) usando Firebase.
 * Administra el usuario actual y actualiza el menú según los permisos.
 */
export class AuthenticationService {
  /** Usuario actual */
  user!: User;
  /** Valor actual del usuario (legacy) */
  currentUserValue: any;
  /** Subject reactivo para el usuario actual */
  private currentUserSubject: BehaviorSubject<User>;

  /**
   * Constructor del servicio. Inicializa el usuario actual y el menú según permisos.
   * @param http Cliente HTTP para llamadas a la API
   * @param store Store de NgRx para acciones de autenticación
   * @param afAuth Servicio de autenticación de Firebase
   * @param menuService Servicio de menú para filtrar según permisos
   */
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


  /**
   * Inicia sesión con Google usando Firebase.
   * @returns Promesa con el usuario autenticado
   */
  signInWithGoogle(): Promise<User> {
    if (!firebase.apps.length || !(firebase.apps[0].options as any).apiKey) {
      return Promise.reject('Firebase no está disponible');
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.signInWithPopup(provider);
  }

  /**
   * Inicia sesión con Facebook usando Firebase.
   * @returns Promesa con el usuario autenticado
   */
  signInWithFacebook(): Promise<User> {
    if (!firebase.apps.length || !(firebase.apps[0].options as any).apiKey) {
      return Promise.reject('Firebase no está disponible');
    }
    const provider = new firebase.auth.FacebookAuthProvider();
    return this.signInWithPopup(provider);
  }

  /**
   * Inicia sesión con un proveedor externo usando popup de Firebase.
   * @param provider Proveedor de autenticación de Firebase
   * @returns Promesa con el usuario autenticado
   */
  private async signInWithPopup(provider: firebase.auth.AuthProvider): Promise<User> {
    const result = await this.afAuth.signInWithPopup(provider);
    const user = result.user;
    return {
      // uid: user?.uid,
      // displayName: user?.displayName,
      // email: user?.email,
      // Agregar otras propiedades según necesidad
    };
  }

  /**
   * Cierra la sesión del usuario actual en Firebase.
   * @returns Promesa de cierre de sesión
   */
  signOut(): Promise<void> {
    return this.afAuth.signOut();
  }


  /**
   * Registra un nuevo usuario en el sistema.
   * @param email Correo electrónico
   * @param first_name Nombre
   * @param password Contraseña
   * @returns Observable con el usuario registrado
   */
  register(email: string, first_name: string, password: string) {
    return this.http
      .post(
        AUTH_API + 'signup',
        { email, first_name, password },
        httpOptions
      )
      .pipe(
        map((response: any) => {
          const user = response;
          this.store.dispatch(RegisterSuccess({ user }));
          return user;
        }),
        catchError((error: any) => {
          const errorMessage = 'Login failed';
          this.store.dispatch(loginFailure({ error: errorMessage }));
          return throwError(errorMessage);
        })
      );
  }


  /**
   * Inicia sesión de usuario contra la API y guarda los datos relevantes en localStorage.
   * Actualiza el menú y el usuario actual.
   * @param email Correo electrónico o usuario
   * @param password Contraseña
   * @returns Observable con los datos del usuario autenticado
   */
  login(email: string, password: string) {
    this.store.dispatch(login({ email, password }));
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
    const apiUrl = `${environment.apiBaseUrl}/Usuarios/IniciarSesion`;
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
              const errorResponse = {
                code_Status: -1,
                success: false,
                message: response.data.message_Status
              };
              throw errorResponse;
            }
            const userData = response.data;
            localStorage.setItem('currentUser', JSON.stringify(userData));
            localStorage.setItem('token', userData.token || 'dummy-token');
            if (userData.usua_Id) localStorage.setItem('usuarioId', userData.usua_Id.toString());
            if (userData.usua_Usuario) localStorage.setItem('usuarioNombre', userData.usua_Usuario);
            if (userData.sucu_Id) localStorage.setItem('sucu_Id', userData.sucu_Id);
            if (userData.permisosJson) {
              localStorage.setItem('permisosJson', userData.permisosJson);
              this.menuService.filtrarMenuPorPermisos(userData.permisosJson);
            }
            if (userData.usua_Email) localStorage.setItem('usuarioEmail', userData.correo);
            if (userData.usua_Nombres) localStorage.setItem('usuarioNombres', userData.nombres);
            if (userData.usua_Apellidos) localStorage.setItem('usuarioApellidos', userData.apellidos);
            if (userData.usua_Rol) localStorage.setItem('usuarioRol', userData.role_Id.toString());
            this.currentUserSubject.next(userData);
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
            errorMessage = '' + error.code_Status + error.message;
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


  /**
   * Cierra la sesión del usuario, limpia localStorage y actualiza el menú.
   * @returns Observable<void> indicando el cierre exitoso
   */
  logout(): Observable<void> {
    this.store.dispatch(logout());
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    localStorage.removeItem('permisosJson');
    this.currentUserSubject.next(null!);
    this.store.dispatch(logoutSuccess());
    this.menuService.filtrarMenuPorPermisos(null);
    return of(undefined).pipe(
      tap(() => {
        // Lógica adicional tras logout si es necesario
      })
    );
  }


  /**
   * Solicita el reseteo de contraseña para el email indicado.
   * @param email Correo electrónico
   * @returns Observable de la petición
   */
  resetPassword(email: string) {
    return this.http.post(AUTH_API + 'reset-password', { email }, httpOptions);
  }

  /**
   * Retorna el usuario autenticado actual (Firebase).
   * @returns Usuario autenticado
   */
  public currentUser(): any {
    return getFirebaseBackend()!.getAuthenticatedUser();
  }
}
