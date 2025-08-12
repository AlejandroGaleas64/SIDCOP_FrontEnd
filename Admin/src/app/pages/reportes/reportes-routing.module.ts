import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermisoGuard } from '../../core/guards/permiso.guard';
import { ReportePedidosPorFechaComponent } from './pedidosPorFecha/list/list.component';
import { ReporteClientesPorCanalYFechaComponent } from './clientesPorCanalYFecha/list/list.component';
import { ReporteVendedoresPorRutaComponent } from './vendedoresPorRuta/list/list.component';

const routes: Routes = [
  {
    path: 'reporteproductos',
    loadChildren: () =>
      import('../reportes/reporteProductos/reporteProductos.module').then(m => m.ReporteProductosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 61 } // ID 61: Reporte Productos
  },
  {
    path: 'reporteclientesMasFacturados',
    loadChildren: () =>
      import('../reportes/reporteClienteMasFacturados/reporteClientesMasFacturados.module').then(m => m.ReporteClientesMasFacturadosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 66 } // ID 66: Reporte Clientes Más Facturados
  },
  {
    path: 'reporteProductosPorRuta',
    loadChildren: () =>
      import('../reportes/reporteProductosPorRuta/reporteProductosPorRuta.module').then(m => m.ReporteProductosPorRutaModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 67 } // ID 61: Reporte Productos
  },
  {
      path: "reportePedidosPorFecha",
      component: ReportePedidosPorFechaComponent
  },
  {
      path: "reporteClientesPorCanalYFecha",
      component: ReporteClientesPorCanalYFechaComponent
  },
  {
      path: "reporteVendedoresPorRuta",
      component: ReporteVendedoresPorRutaComponent
  }
  //  ,{
  //   path: 'traslados',
  //   loadChildren: () =>
  //     import('./traslados/traslado.module').then(m => m.TrasladoModule)
  // },

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportesRoutingModule {}
