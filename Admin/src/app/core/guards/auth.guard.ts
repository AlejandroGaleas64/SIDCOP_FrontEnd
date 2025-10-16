import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

// Auth Services
import { AuthenticationService } from '../services/auth.service';
import { AuthfakeauthenticationService } from '../services/authfake.service';

@Injectable({ providedIn: 'root' })
/**
 * Guard para proteger rutas que requieren autenticación.
 * Verifica si el usuario está autenticado y redirige al login si no lo está.
 */
export class AuthGuard  {
    /**
     * Constructor del guard. Inyecta Router y servicios de autenticación.
     * @param router Servicio de rutas
     * @param authenticationService Servicio de autenticación real
     * @param authFackservice Servicio de autenticación fake
     */
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
        private authFackservice: AuthfakeauthenticationService
    ) { }

    /**
     * Método principal para determinar si se puede activar la ruta.
     * @param route Snapshot de la ruta actual
     * @param state Estado de la ruta
     * @returns true si el usuario está autenticado, false si no
     */
    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        // Verificar si hay un usuario en localStorage
        const currentUser = localStorage.getItem('currentUser');
        
        if (currentUser) {
            // Usuario ha iniciado sesión, permitir acceso
            return true;
        }
        
        // Usuario no ha iniciado sesión, redirigir a la página de login
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
