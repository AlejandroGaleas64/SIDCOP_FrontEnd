import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PermisoGuard } from '../../../core/guards/permiso.guard';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Usuarios',
    },
    children: [
      { 
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        loadComponent: () => import('./list/list.component').then(m => m.ListComponent),
        canActivate: [PermisoGuard],
        data: {
          title: 'Listado de Usuarios',
          pantallaId: 63  // ID 7: Usuarios según la tabla de pantallas
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsuariosRoutingModule {}