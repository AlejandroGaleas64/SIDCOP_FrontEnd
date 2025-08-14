import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Estados de Visita',
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
          title: 'Listado de Estados de Visita',
        }
      },
    ]
  }
]; 

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class EstadosVisitaRoutingModule {}