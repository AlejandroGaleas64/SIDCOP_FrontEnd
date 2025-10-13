import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { PermisosService } from '../services/permisos.service';

@Injectable({
  providedIn: 'root'
})
/**
 * Guard para proteger rutas según permisos de usuario.
 * Verifica si el usuario tiene acceso a la pantalla indicada y redirige si no lo tiene.
 */
export class PermisoGuard {
  /**
   * Constructor del guard. Inyecta PermisosService y Router.
   * @param permisosService Servicio de permisos
   * @param router Servicio de rutas
   */
  constructor(
    private permisosService: PermisosService,
    private router: Router
  ) {}
  /**
   * Método principal para determinar si se puede activar la ruta según permisos.
   * @param route Snapshot de la ruta actual
   * @param state Estado de la ruta
   * @returns true si el usuario tiene permiso, UrlTree si no
   */
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    // Permitir siempre acceso a rutas de login y página de error
    if (state.url.includes('/account/login') || 
        state.url.includes('/error-404/404') ||
        state.url.includes('/acceso-denegado')) {
      return true;
    }

    // Obtener el ID de pantalla requerido de los datos de la ruta
    let pantallaId = route.data['pantallaId'] as number;

    // Si no está en la ruta actual, buscar en las rutas padre
    if (!pantallaId && route.parent) {
      pantallaId = route.parent.data['pantallaId'] as number;
    }

    // Si aún no lo encontramos y hay más padres, seguir buscando
    let currentRoute = route.parent;
    while (!pantallaId && currentRoute && currentRoute.parent) {
      currentRoute = currentRoute.parent;
      pantallaId = currentRoute.data['pantallaId'] as number;
    }

    // Si no se especifica un ID de pantalla, permitir el acceso con advertencia
    if (!pantallaId) {
      return true;
    }

    // Los IDs negativos son para herramientas de desarrollo/depuración
    if (pantallaId < 0) {
      return true;
    }

    // Verificar si el usuario tiene permiso para acceder a la pantalla
    const permisos = this.permisosService.obtenerPermisos();

    // Si no hay permisos, redirigir al login
    if (!permisos || permisos.length === 0) {
      localStorage.removeItem('currentUser'); // Limpiar sesión inválida
      return this.router.createUrlTree(['/account/login']);
    }

    const tienePermiso = this.permisosService.tienePantallaPermiso(pantallaId);

    if (!tienePermiso) {
      return this.router.createUrlTree(['/acceso-denegado']);
    }

    return true;
  }
}
