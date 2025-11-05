import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MenuItem } from '../../layouts/sidebar/menu.model';
import { MENU } from '../../layouts/sidebar/menu';
import { Permiso } from '../../Modelos/acceso/permisos.model';

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  // Mapeo de IDs de pantallas a rutas de menú
  private pantallaIdToMenuMap: { [key: number]: string } = {

    8: '/general/canales',
    9: '/general/cargos',
    10: '/general/clientes',
    11: '/general/colonias',
    12: '/general/departamentos',
    13: '/general/empleados',
    14: '/general/estadosciviles',
    15: '/general/marcas',
    16: '/general/marcasvehiculos',
    17: '/general/modelos',
    18: '/general/municipios',
    19: '/general/proveedores',
    20: '/general/sucursales',
    21: '/inventario/categorias',
    22: '/inventario/descuentos',
    23: '/inventario/inventariobodegas',
    24: '/inventario/inventario-sucursal',
    25: '/inventario/productos',
    26: '/inventario/promociones',
    27: '/inventario/subcategorias',
    28: '/logistica/bodegas',
    29: '/logistica/recargas',
    30: '/logistica/rutas',
    31: '/logistica/traslados',
    32: '/ventas/CAIs',
    33: '/ventas/configuracion-factura',
    34: '/ventas/cuentasporcobrar',
    35: '/ventas/devoluciones',
    36: '/ventas/facturas',
    37: '/ventas/impuestos',
    38: '/ventas/pedidos',
    39: '/ventas/preciosporproducto',
    40: '/ventas/puntosemision',
    41: '/ventas/registroscais',
    42: '/ventas/Vendedores',
    43: '/ventas/vendedoresruta',
    45: '/general/direccionescliente',
    57: '/ventas/ventas',
    58: '/inventario/inventario',
    59: '/ventas/listasprecios',
    61: '/reportes/reporteproductos',
    62: '/acceso/roles',
    63: '/acceso/usuarios',
    71: '/general/visitas-clientes',
    66: '/reportes/reporteclientesMasFacturados',
    67: '/reportes/reporteProductosPorRuta',
    68: '/reportes/reporteRecargasPorBodega',
    69: '/reportes/reporteDevoluciones',
    72: '/reportes/reporteProductosVendidos',
    73: '/reportes/reporteVendedoresVentas',
    74: '/reportes/reporteCuentasClientes',
    75: '/reportes/reportePedidosPorFecha',
    76: '/reportes/reporteVendedoresPorRuta',
    77: '/reportes/reporteClientes',
    78: '/general/estadosvisita',
    79: '/acceso/migraciones',
    81: '/general/unidadesDePeso',
    82: '/ventas/metas',
    83: '/general/tipovendedores'
  };

  private menuItemsSubject: BehaviorSubject<MenuItem[]> = new BehaviorSubject<MenuItem[]>([]);
  public menuItems$: Observable<MenuItem[]> = this.menuItemsSubject.asObservable();

  constructor() {
    // Inicializar con el menú completo por defecto
    this.menuItemsSubject.next(MENU);
  }

  /**
   * Filtra el menú según los permisos del usuario
   * @param permisosJson JSON string de permisos del usuario
   */
  public filtrarMenuPorPermisos(permisosJson: string | null): void {
    if (!permisosJson) {
      // Si no hay permisos, mostrar menú vacío o solo el dashboard
      const menuFiltrado = MENU.filter(item => 
        item.isTitle || (item.id === 2 && item.label === 'MENUITEMS.DASHBOARD.TEXT')
      );
      this.menuItemsSubject.next(menuFiltrado);
      return;
    }

    try {
      // Parsear los permisos
      const permisos: Permiso[] = JSON.parse(permisosJson);
      
      // Obtener los IDs de pantallas permitidas
      const idsPantallasPermitidas = permisos.map(p => p.Pant_Id);
      
      // Filtrar el menú
      const menuFiltrado = this.filtrarMenu(MENU, idsPantallasPermitidas);
      
      // Actualizar el menú
      this.menuItemsSubject.next(menuFiltrado);
    } catch (error) {
      // En caso de error, mostrar solo el dashboard
      const menuFiltrado = MENU.filter(item => 
        item.isTitle || (item.id === 2 && item.label === 'MENUITEMS.DASHBOARD.TEXT')
      );
      this.menuItemsSubject.next(menuFiltrado);
    }
  }

  /**
   * Filtra el menú recursivamente según los IDs de pantallas permitidas
   */
  private filtrarMenu(menu: MenuItem[], idsPantallasPermitidas: number[]): MenuItem[] {
    return menu.filter(item => {
      // Siempre incluir títulos
      if (item.isTitle) return true;

      // Siempre incluir el dashboard
      if (item.id === 2 && item.label === 'MENUITEMS.DASHBOARD.TEXT') return true;

      // Para elementos con subitems
      if (item.subItems && item.subItems.length > 0) {
        // Filtrar subitems recursivamente
        const subItemsFiltrados = this.filtrarSubitems(item.subItems, idsPantallasPermitidas);
        
        // Si hay subitems después de filtrar, incluir este elemento
        if (subItemsFiltrados.length > 0) {
          item.subItems = subItemsFiltrados;
          return true;
        }
        return false;
      }

      // Para elementos sin subitems, verificar si la ruta está permitida
      return this.rutaEstaPermitida(item.link, idsPantallasPermitidas);
    });
  }

  /**
   * Filtra los subitems recursivamente según los IDs de pantallas permitidas
   */
  private filtrarSubitems(subItems: any[], idsPantallasPermitidas: number[]): any[] {
    return subItems.filter(subItem => {
      // Para subitems con más subitems
      if (subItem.subItems && subItem.subItems.length > 0) {
        const subSubItemsFiltrados = this.filtrarSubitems(subItem.subItems, idsPantallasPermitidas);
        
        if (subSubItemsFiltrados.length > 0) {
          subItem.subItems = subSubItemsFiltrados;
          return true;
        }
        return false;
      }

      // Para subitems sin más subitems, verificar si la ruta está permitida
      return this.rutaEstaPermitida(subItem.link, idsPantallasPermitidas);
    });
  }

  /**
   * Filtra un elemento del menú y sus subitems según los permisos
   * @param item Elemento del menú a filtrar
   * @param idsPantallasPermitidas Array de IDs de pantallas permitidas
   * @returns El elemento filtrado o null si no tiene permiso
   */
  private filtrarMenuRecursivamente(item: any, idsPantallasPermitidas: number[]): any {
    // Los elementos con ID negativo siempre se incluyen (herramientas de desarrollo/depuración)
    // Si el item tiene un ID que coincide con un ID de pantalla permitida, lo incluimos
    if (item.id && (item.id < 0 || idsPantallasPermitidas.includes(item.id))) {
      // Si tiene subitems, filtramos recursivamente
      if (item.subItems && item.subItems.length > 0) {
        const subItemsFiltrados = item.subItems
          .map((subItem: any) => this.filtrarMenuRecursivamente(subItem, idsPantallasPermitidas))
          .filter((subItem: any) => subItem !== null);
        
        return {
          ...item,
          subItems: subItemsFiltrados
        };
      }
      
      // Si no tiene subitems o no tiene subitems permitidos, devolvemos el item tal cual
      return { ...item };
    }
    return null;
  }

  /**
   * Verifica si una ruta está permitida según los IDs de pantallas permitidas
   */
  private rutaEstaPermitida(ruta: string | undefined, idsPantallasPermitidas: number[]): boolean {
    if (!ruta) return false;
    
    // El dashboard siempre está permitido
    if (ruta === '/') return true;

    // Buscar el ID de pantalla correspondiente a esta ruta
    const idPantalla = this.obtenerIdPantallaPorRuta(ruta);
    
    // Si no se encuentra un ID de pantalla para esta ruta, permitirla por defecto
    if (idPantalla === null) return true;
    
    // Verificar si el ID de pantalla está en la lista de permitidos
    return idsPantallasPermitidas.includes(idPantalla);
  }

  /**
   * Obtiene el ID de pantalla correspondiente a una ruta
   */
  private obtenerIdPantallaPorRuta(ruta: string): number | null {
    // Buscar en el mapeo de IDs a rutas
    for (const [idStr, rutaMenu] of Object.entries(this.pantallaIdToMenuMap)) {
      if (rutaMenu === ruta) {
        return parseInt(idStr, 10);
      }
    }
    return null;
  }

  /**
   * Obtiene el menú completo sin filtrar
   */
  public obtenerMenuCompleto(): MenuItem[] {
    return MENU;
  }
}
