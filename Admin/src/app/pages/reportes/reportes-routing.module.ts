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
  },
  //  ,{
  //   path: 'traslados',
  //   loadChildren: () =>
  //     import('./traslados/traslado.module').then(m => m.TrasladoModule)
  // },
    {
    path: 'reporteDevoluciones',
    loadChildren: () =>
      import('../reportes/reporteDevoluciones/reporteDevoluciones.module').then(m => m.reporteDevolucionesModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 69 } 
  },
   {
   path: 'reporteRecargasPorBodega',
   loadChildren: () =>
     import('../reportes/reporteRecargaPorBodega/ReporteRecargasPorBodega.module').then(m => m.reporteRecargasPorBodegaModule),
   canActivate: [PermisoGuard],
   data: { pantallaId: 68 } 
  },
  {
   path: 'reporteProductosVendidos',
   loadChildren: () =>
     import('../reportes/reporteProductosVendidos/reporteProductosVendidos.module').then(m => m.ReporteProductosVendidosModule),
   canActivate: [PermisoGuard],
   data: { pantallaId: 72 } 
  },
  {
   path: 'reporteVendedoresVentas',
   loadChildren: () =>
     import('../reportes/reporteVendedoresVentas/reporteVendedoresVentas.module').then(m => m.ReporteVendedoresVentasModule),
   canActivate: [PermisoGuard],
   data: { pantallaId: 73 } 
  },
  {
   path: 'reporteCuentasClientes',
   loadChildren: () =>
     import('../reportes/reporteCuentasClientes/reporteCuentasClientes.module').then(m => m.ReporteCuentasClientesModule),
   canActivate: [PermisoGuard],
   data: { pantallaId: 74 } 
  },
  {
   path: 'reporteVendedoresPorRuta',
   loadChildren: () =>
     import('../reportes/vendedoresPorRuta/reporteVendedoresPorRuta.module').then(m => m.reporteVendedoresPorRutaModule),
   canActivate: [PermisoGuard],
   data: { pantallaId: 76 } 
  },
  {
   path: 'reporteClientes',
   loadChildren: () =>
     import('../reportes/clientesPorCanalYFecha/reporteClientes.module').then(m => m.ReporteClientesModule),
   canActivate: [PermisoGuard],
   data: { pantallaId: 77 } 
  },
  {
   path: 'reportePedidosPorFecha',
   loadChildren: () =>
     import('../reportes/pedidosPorFecha/reportePedidosPorFecha.module').then(m => m.reportePedidosPorFechaModule),
   canActivate: [PermisoGuard],
   data: { pantallaId: 75 } 
  }


  
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ReportesRoutingModule {}
