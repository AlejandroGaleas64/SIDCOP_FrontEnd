import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermisoGuard } from '../../core/guards/permiso.guard';

const routes: Routes = [
  {
    path: 'usuarios',
    loadChildren: () =>
      import('./usuarios/usuarios.module').then(m => m.UsuariosModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 63 } // ID 7: Usuarios
  },
  {
    path: 'roles',
    loadChildren: () =>
      import('./roles/roles.module').then(m => m.RolesModule),
    canActivate: [PermisoGuard],
    data: { pantallaId: 62 } // ID 6: Roles
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AccesoRoutingModule {}
