import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Unidades De Peso',
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
          title: 'Listado de Unidades De Peso',
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UnidadesDePesoRoutingModule {}