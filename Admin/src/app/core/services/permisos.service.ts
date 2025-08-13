import { Injectable } from '@angular/core';
import { Permiso, PermisosHelper } from '../../Modelos/acceso/permisos.model';

@Injectable({
  providedIn: 'root'
})
export class PermisosService {
  
  constructor() { }

  /**
   * Obtiene los permisos del usuario desde localStorage
   * @returns Array de permisos o null si no hay permisos
   */
  obtenerPermisos(): Permiso[] | null {
    const permisosJson = localStorage.getItem('permisosJson');
    if (!permisosJson) return null;
    
    try {
      // El JSON puede venir en diferentes formatos desde la API
      let permisos;
      
      // Intentamos diferentes estrategias de parseo
      try {
        // 1. Intentamos parsear directamente (caso ideal)
        permisos = JSON.parse(permisosJson);
        
        // Verificamos si es un string (caso de doble codificación)
        if (typeof permisos === 'string') {
          permisos = JSON.parse(permisos);
        }
      } catch (e) {
        try {
          // 2. Intento alternativo: puede ser que el JSON esté como string dentro de string
          permisos = JSON.parse(JSON.parse(permisosJson));
        } catch (e2) {
          // 3. Último intento: puede ser que el JSON ya esté parseado pero como string
          try {
            if (permisosJson.startsWith('"[{') && permisosJson.endsWith('}]"')) {
              // Eliminar comillas externas y escapadas
              const cleanJson = permisosJson.substring(1, permisosJson.length - 1).replace(/\\\"/, '\"');
              permisos = JSON.parse(cleanJson);
            }
          } catch (e3) {
            throw e3;
          }
        }
      }
      
      return permisos;
    } catch (error) {
      return null;
    }
  }

  /**
   * Verifica si el usuario tiene permiso para acceder a una pantalla
   * @param idPantalla ID de la pantalla a verificar
   * @returns true si tiene permiso, false en caso contrario
   */
  tienePantallaPermiso(idPantalla: number): boolean {
    // Los IDs negativos son para herramientas de desarrollo/depuración y siempre están permitidos
    if (idPantalla < 0) {
      return true;
    }
    
    // Verificar si es un módulo padre (IDs 1-5 según la tabla de pantallas)
    // Los módulos padres se permiten si el usuario tiene acceso a cualquier pantalla hija
    if (idPantalla >= 1 && idPantalla <= 7) {
      const permisos = this.obtenerPermisos();
      if (!permisos) return false;
      
      // Primero verificamos si el usuario tiene permiso directo para este módulo
      const tienePermisoDirecto = permisos.some(p => p.Pant_Id === idPantalla);
      if (tienePermisoDirecto) {
        return true;
      }
      
      // Si no tiene permiso directo, verificamos si tiene acceso a alguna pantalla hija
      // Según la tabla de pantallas, cada pantalla tiene un Pant_Padre que corresponde al ID del módulo
      // Verificamos si hay algún permiso cuyo Pant_Padre coincida con el ID del módulo actual
      const pantallasHijas = this.getPantallasHijas(idPantalla);
      const tienePermisoEnHijas = permisos.some(p => pantallasHijas.includes(p.Pant_Id));
      
      return tienePermisoEnHijas;
    }
    
    // Para pantallas normales, verificar el permiso específico
    const permisos = this.obtenerPermisos();
    if (!permisos) {
      return false;
    }
    
    // Verificar si tiene el permiso exacto para esta pantalla
    // Incluso si la pantalla no tiene acciones definidas, debe permitir el acceso
    // si el ID de la pantalla está en la lista de permisos
    const tienePermiso = PermisosHelper.tienePantallaPermiso(permisos, idPantalla);
    return tienePermiso;
  }

  /**
   * Verifica si el usuario tiene permiso para realizar una acción en una pantalla
   * @param idPantalla ID de la pantalla
   * @param accion Nombre de la acción (Crear, Editar, Eliminar, etc.)
   * @returns true si tiene permiso, false en caso contrario
   */
  tieneAccionPermiso(idPantalla: number, accion: string): boolean {
    const permisos = this.obtenerPermisos();
    if (!permisos) return false;
    
    return PermisosHelper.tieneAccionPermiso(permisos, idPantalla, accion);
  }

  /**
   * Obtiene los IDs de las pantallas hijas de un módulo padre
   * @param idModuloPadre ID del módulo padre
   * @returns Array con los IDs de las pantallas hijas
   */
  private getPantallasHijas(idModuloPadre: number): number[] {
    // Mapa de módulos padres y sus pantallas hijas según la tabla de pantallas
    const mapaPantallas: Record<number, number[]> = {
      1: [62, 63],                                // Acceso: Roles, Usuarios
      2: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 45], // General
      3: [21, 22, 23, 24, 25, 26, 27,61],        // Inventario
      4: [28, 29, 30, 31],                     // Logística
      5: [32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 57], // Ventas
      6: [],
      7: [61]
    };
    
    return mapaPantallas[idModuloPadre] || [];
  }

  /**
   * Obtiene las acciones permitidas para una pantalla específica
   * @param idPantalla ID de la pantalla
   * @returns Array de nombres de acciones o array vacío si no tiene permisos
   */
  obtenerAccionesPermitidas(idPantalla: number): string[] {
    const permisos = this.obtenerPermisos();
    if (!permisos) return [];
    
    const pantalla = permisos.find(p => p.Pant_Id === idPantalla);
    if (!pantalla) return [];
    
    return pantalla.Acciones.map(a => a.Accion);
  }

  /**
   * Obtiene los IDs de todas las pantallas permitidas
   * @returns Array de IDs de pantallas o array vacío si no hay permisos
   */
  obtenerIdsPantallasPermitidas(): number[] {
    const permisos = this.obtenerPermisos();
    if (!permisos) return [];
    
    return permisos.map(p => p.Pant_Id);
  }

  /**
   * Obtiene los nombres de todas las pantallas permitidas
   * @returns Array de nombres de pantallas o array vacío si no hay permisos
   */
  obtenerNombresPantallasPermitidas(): string[] {
    const permisos = this.obtenerPermisos();
    if (!permisos) return [];
    
    return permisos.map(p => p.Pantalla);
  }
}
