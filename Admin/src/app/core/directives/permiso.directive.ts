import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';
import { PermisosService } from '../services/permisos.service';

@Directive({
  selector: '[appPermiso]',
  standalone: true,
})
/**
 * Directiva para controlar la visibilidad de elementos según permisos de usuario.
 * Permite ocultar elementos si el usuario no tiene acceso a la pantalla o acción específica.
 */
export class PermisoDirective implements OnInit {
  /** ID de la pantalla a verificar permiso */
  @Input() pantallaId: number = 0;
  /** Acción específica a verificar permiso (opcional) */
  @Input() accion: string = '';

  /**
   * Constructor de la directiva. Inyecta ElementRef, Renderer2 y PermisosService.
   * @param el Referencia al elemento DOM
   * @param renderer Renderer para manipulación segura del DOM
   * @param permisosService Servicio de permisos
   */
  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private permisosService: PermisosService
  ) {}

  /**
   * Inicializa la directiva y verifica los permisos para mostrar u ocultar el elemento.
   */
  ngOnInit(): void {
    // Si no se especifica una acción, solo verificar acceso a la pantalla
    if (!this.accion) {
      if (!this.permisosService.tienePantallaPermiso(this.pantallaId)) {
        this.ocultarElemento();
      }
      return; // El elemento se mantiene visible si tiene permiso
    }

    // Verificar si tiene permiso para la acción específica
    if (
      !this.permisosService.tieneAccionPermiso(this.pantallaId, this.accion)
    ) {
      this.ocultarElemento();
    }
  }

  /**
   * Oculta el elemento estableciendo display: none.
   */
  private ocultarElemento(): void {
    this.renderer.setStyle(this.el.nativeElement, 'display', 'none');
  }
}
