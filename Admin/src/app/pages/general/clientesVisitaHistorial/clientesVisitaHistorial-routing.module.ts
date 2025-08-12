import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Visita de Clientes',
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
        data: {
          title: 'Listado de Visitas de Clientes',
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ClientesVisitaRoutingModule {}