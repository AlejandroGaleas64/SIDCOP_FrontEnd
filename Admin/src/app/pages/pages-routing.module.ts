import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermisoGuard } from '../core/guards/permiso.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () =>
      import('./dashboards/dashboards.module').then((m) => m.DashboardsModule),
  },

  {
    path: 'ui',
    loadChildren: () => import('./ui/ui.module').then((m) => m.UiModule),
  },

  {
    path: 'icons',
    loadChildren: () =>
      import('./icons/icons.module').then((m) => m.IconsModule),
  },
  {
    path: 'tables',
    loadChildren: () =>
      import('./table/table.module').then((m) => m.TableModule),
  },
  {
    path: 'pages',
    loadChildren: () =>
      import('./extrapages/extrapages.module').then((m) => m.ExtrapagesModule),
  },
  {
    path: 'acceso',
    loadChildren: () =>
      import('./acceso/acceso.module').then((m) => m.AccesoModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 1 } // ID 1: Acceso (módulo padre)
  },
  {
    path: 'general',
    loadChildren: () =>
      import('./general/general.module').then((m) => m.GeneralModule)
    // Quitamos el guard de este nivel para que cada ruta dentro del módulo tenga su propio ID
  },
  {
    path: 'inventario',
    loadChildren: () =>
      import('./inventario/inventario.module').then((m) => m.InventarioModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 3 } // ID 3: Inventario (módulo padre)
  },
  {
    path: 'logistica',
    loadChildren: () =>
      import('./logistica/logistica.module').then((m) => m.LogisticaModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 4 } // ID 4: Logistica (módulo padre)
  },
  {
    path: 'ventas',
    loadChildren: () =>
      import('./ventas/ventas.module').then((m) => m.VentasModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 5 } // ID 5: Ventas (módulo padre)
  },
  {
    path: 'reportes',
    loadChildren: () =>
      import('./reportes/reportes.module').then((m) => m.ReportesModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 7 } 
  },
  
];

@NgModule({ 
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {}
