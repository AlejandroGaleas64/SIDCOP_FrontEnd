import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermisoGuard } from '../../core/guards/permiso.guard';

const routes: Routes = [
  {
    path: 'estadosciviles',
    loadChildren: () =>
      import('./estadosciviles/estadosciviles.module').then(m => m.EstadosCivilesModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 14 } // ID 14: Estados Civiles
  },
  {
    path: 'empleados',
    loadChildren: () =>
      import('./empleados/empleados.module').then(m => m.EmpleadosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 13 } // ID 13: Empleados
  },
  {
    path: 'marcas',
    loadChildren: () =>
      import('./Marcas/marcas.module').then(m => m.Marcasmodule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 15 } // ID de Marcas
  },
  {
    path: 'marcasvehiculos',
    loadChildren: () =>
      import('./MarcasVehiculos/marcasvehiculos.module').then(m => m.MarcasVehiculosmodule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 16 } // ID 16: Marcas de Vehiculos
  },
  
    {
    path: 'departamentos',
    loadChildren: () =>
      import('./departamentos/departamentos.module').then(m => m.DepartamentosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 12 } // ID 12: Departamentos
  },
    {
    path: 'municipios',
    loadChildren: () =>
      import('./municipios/municipios.module').then(m => m.MunicipiosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 18 } // ID de Municipios
  },
    {
    path: 'colonias',
    loadChildren: () =>
      import('./colonias/colonias.module').then(m => m.ColoniasModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 11 } // ID 11: Colonias
  },  
    {
    path: 'sucursales',
    loadChildren: () =>
    import('./sucursales/sucursales.module').then(m => m.SucursalesModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 20 } // ID 20: Sucursales
  },
  {
    path: 'clientes',
    loadChildren: () =>
      import('./clientes/clientes.module').then(m => m.ClientesModule)
  },
   {
    path: 'proveedores',
    loadChildren: () =>
      import('./proveedores/proveedores.module').then(m => m.ProveedoresModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 19 } // ID 19: Proveedores
  },
    {
    path: 'modelos',
    loadChildren: () =>
      import('./modelos/modelos.module').then(m => m.ModelosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 17 } // ID de Modelos
  },
  {
    path: 'canales',
    loadChildren: () =>
      import('./canales/canales.module').then(m => m.CanalesModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 8 } // ID de Canales
  },
  {
    path: 'cargos',
    loadChildren: () =>
      import('./cargos/cargos.module').then(m => m.CargosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 9 } // ID 9: Cargos
  },  
  {
    path: 'visitas-clientes',
    loadChildren: () =>
      import('./clientesVisitaHistorial/clientesVisitaHistorial.module').then(m => m.ClientesVisitaModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 71 } // ID 71: Visitas Clientes
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GeneralRoutingModule {}
