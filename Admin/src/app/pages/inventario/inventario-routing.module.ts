import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  
  {
    path: 'categorias',
    loadChildren: () =>
      import('./categorias/categorias.module').then(m => m.CategoriasModule)
  },
  {
    path: 'subcategorias',
    loadChildren: () =>
      import('./subcategorias/subcategorias.module').then(m => m.SubcategoriasModule)
  },
  {
    path: 'productos',
    loadChildren: () =>
      import('./productos/productos.module').then(m => m.ProductosModule)
  },
  {
    path: 'descuentos',
    loadChildren: () =>
      import('./descuentos/descuento.module').then(m => m.DescuentosModule)
  },
  {
    path: 'promociones',
    loadChildren: () =>
      import('./promociones/promociones.module').then(m => m.PromocionesModule)
  },
  {
    path: 'inventario-sucursal',
    loadChildren: () =>
      import('./inventarioSucursal/inventarioSucursal.module').then(m => m.InventarioSucursalModule)
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeneralRoutingModule {}
