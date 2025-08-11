import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'bodegas',
    loadChildren: () =>
      import('./bodega/bodega.module').then(m => m.BodegaModule)
  },
   {
    path: 'traslados',
    loadChildren: () =>
      import('./traslados/traslado.module').then(m => m.TrasladoModule)
  },
  {
    path: 'recargas',
    loadChildren: () =>
      import('./recargas/recarga.module').then(m => m.RecargaModule)
  },
  {
    path: 'rutas',
    loadChildren: () =>
      import('./rutas/rutas.module').then(m => m.RutasModule) 
  },
  {
    path: 'reporteproductos',
    loadChildren: () =>
      import('./reporteProductos/reporteProductos.module').then(m => m.ReporteProductosModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LogisticaRoutingModule {}
