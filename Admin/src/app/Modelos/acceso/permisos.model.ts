export interface Permiso {
    Pant_Id: number;
    Pantalla: string;
    Pant_Padre?: number; // ID del módulo padre (opcional)
    Pant_EsPadre?: boolean; // Indica si es un módulo padre (opcional)
    Acciones: Accion[];
}

export interface Accion {
    Accion: string;
}

export class PermisosHelper {
    /**
     * Verifica si un usuario tiene permiso para acceder a una pantalla específica
     * @param permisos Array de permisos del usuario
     * @param idPantalla ID de la pantalla a verificar
     * @returns true si tiene permiso, false en caso contrario
     */
    static tienePantallaPermiso(permisos: Permiso[], idPantalla: number): boolean {
        if (!permisos || permisos.length === 0) return false;
        // Verificar si la pantalla existe en los permisos, incluso si no tiene acciones definidas
        return permisos.some(p => p.Pant_Id === idPantalla);
    }

    /**
     * Verifica si un usuario tiene permiso para realizar una acción específica en una pantalla
     * @param permisos Array de permisos del usuario
     * @param idPantalla ID de la pantalla a verificar
     * @param accion Nombre de la acción a verificar
     * @returns true si tiene permiso, false en caso contrario
     */
    static tieneAccionPermiso(permisos: Permiso[], idPantalla: number, accion: string): boolean {
        if (!permisos || permisos.length === 0) return false;
        
        const pantalla = permisos.find(p => p.Pant_Id === idPantalla);
        if (!pantalla) return false;
        
        return pantalla.Acciones.some(a => 
            a.Accion.trim().toLowerCase() === accion.trim().toLowerCase()
        );
    }

    /**
     * Obtiene los IDs de todas las pantallas a las que el usuario tiene acceso
     * @param permisos Array de permisos del usuario
     * @returns Array de IDs de pantallas
     */
    static obtenerIdsPantallasPermitidas(permisos: Permiso[]): number[] {
        if (!permisos || permisos.length === 0) return [];
        return permisos.map(p => p.Pant_Id);
    }

    /**
     * Obtiene los nombres de todas las pantallas a las que el usuario tiene acceso
     * @param permisos Array de permisos del usuario
     * @returns Array de nombres de pantallas
     */
    static obtenerNombresPantallasPermitidas(permisos: Permiso[]): string[] {
        if (!permisos || permisos.length === 0) return [];
        return permisos.map(p => p.Pantalla);
    }
}
