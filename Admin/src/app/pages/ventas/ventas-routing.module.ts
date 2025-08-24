import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'registroscais',
    loadChildren: () =>
      import('./registroscais/registroscais.module').then(
        (m) => m.RegistroCAIModule
      ),
  },
  {
    path: 'puntosemision',
    loadChildren: () =>
      import('./puntosemision/puntosemision.module').then(
        (m) => m.PuntoEmisionModule
      ),
  },

  {
    path: 'impuestos',
    loadChildren: () =>
      import('./impuestos/impuestos.module').then((m) => m.ImpuestosModule),
  },
  {
    path: 'configuracion-factura',
    loadChildren: () =>
      import('./configuracionFactura/configuracionFactura.module').then(
        (m) => m.ConfiguracionFacturaModule
      ),
  },
  {
    path: 'CAIs',
    loadChildren: () => import('./CAIs/CAIs.module').then((m) => m.CAIsModule),
  },
  {
    path: 'Vendedores',
    loadChildren: () =>
      import('./vendedor/vendedor.module').then((m) => m.VendedoresModule),
  },
  {
    path: 'cuentasporcobrar',
    loadChildren: () =>
      import('./cuentasporcobrar/cuentasporcobrar.module').then(
        (m) => m.CuentasPorCobrarModule
      ),
  },
  {
    path: 'listasprecios',
    loadChildren: () =>
      import('./listaPrecios/listasprecios.module').then(m => m.ListasPreciosModule)
   },
   {
    path: 'devoluciones',
    loadChildren: () =>
      import('./devoluciones/devoluciones.module').then(m => m.DevolucionesModule)
   },
  {
    path: 'pedidos',
    loadChildren: () =>
      import('./pedidos/pedidos.module').then((m) => m.PedidosModule),
  },
  {
    path: 'ventas',
    loadChildren: () =>
      import('./ventas/ventas.module').then((m) => m.VentasModule),
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VentasRoutingModule {}
