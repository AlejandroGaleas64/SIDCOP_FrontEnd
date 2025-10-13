import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Configuración de rutas hijas para el módulo "Cargos"
// Se define una ruta base con metadatos (title) y rutas internas
const routes: Routes = [
  {
    path: '',
    data: {
      title: 'Cargos',
    },
    children: [
      { 
        path: '',
        redirectTo: 'list',
        pathMatch: 'full'
      },
      {
        path: 'list',
        // Carga perezosa del componente standalone de listado
        loadComponent: () => import('./list/list.component').then(m => m.ListComponent),
        data: {
          title: 'Listado de cargos',
        }
      },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CargosRoutingModule {}