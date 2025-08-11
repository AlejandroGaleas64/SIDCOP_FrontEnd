import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component
import { LayoutComponent } from './layouts/layout.component';
import { AuthlayoutComponent } from './authlayout/authlayout.component';
import { AuthGuard } from './core/guards/auth.guard';
import { AccesoDenegadoComponent } from './pages/acceso-denegado/acceso-denegado.component';

const routes: Routes = [
  { 
    path: '', 
    component: LayoutComponent, 
    children: [
      { path: '', loadChildren: () => import('./pages/pages.module').then(m => m.PagesModule) },
      { path: 'error-404', loadChildren: () => import('./account/auth/errors/errors.module').then(m => m.ErrorsModule) },
      { path: 'acceso-denegado', component: AccesoDenegadoComponent }
    ],
    canActivate: [AuthGuard]
  },
  // Ruta de autenticación sin lazy loading para el componente de login para evitar problemas de carga
  { 
    path: 'auth', 
    component: AuthlayoutComponent, 
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      { path: 'login', loadChildren: () => import('./account/account.module').then(m => m.AccountModule) },
      { path: 'errors', loadChildren: () => import('./account/auth/errors/errors.module').then(m => m.ErrorsModule) }
    ]
  },
  { path: 'pages', component: AuthlayoutComponent, loadChildren: () => import('./extraspages/extraspages.module').then(m => m.ExtraspagesModule)},
  // Redirecciones para mantener compatibilidad con rutas anteriores
  { path: 'account/auth/errors/404', redirectTo: 'error-404/404', pathMatch: 'full' },
  { path: 'auth/errors/404', redirectTo: 'error-404/404', pathMatch: 'full' },
  // Ruta wildcard para capturar cualquier URL que no coincida con las rutas definidas
  { path: '**', redirectTo: 'error-404/404' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { scrollPositionRestoration: 'top' })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
