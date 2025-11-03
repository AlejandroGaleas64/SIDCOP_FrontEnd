import { Routes } from "@angular/router";

export const TipoVendedoresRoutes: Routes = [
    {
        path: '',
        data: {
            title: 'Tipo de Vendedores',
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
                    title: 'Listado de Tipo de Vendedores',
                }
            },
            {
                path: 'create',
                loadComponent: () => import('./create/create.component').then(m => m.CreateComponent),
                data: {
                    title: 'Crear Tipo de Vendedor',
                }
            },
            {
                path: 'edit',
                loadComponent: () => import('./edit/edit.component').then(m => m.EditComponent),
                data: {
                    title: 'Editar Tipo de Vendedor',
                }
            },
            {
               path: "details",
               loadComponent: () => import('./details/details.component').then(m => m.DetailsComponent),
               data: {
                   title: 'Detalles de Tipo de Vendedor',
               }
            }
        ]
    }
];
