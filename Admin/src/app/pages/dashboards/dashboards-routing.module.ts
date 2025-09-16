import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Component
import { IndexComponent } from './index/index.component';
import { DashbComponent } from './dashb/dashb.component';
import { MetasPorVendedorComponent } from './metasPorVendedor/metas-por-vendedor/metas-por-vendedor.component';
import { MetasDashboardComponent } from './metasDashboard/metas-dashboard/metas-dashboard.component';

// No importamos el PermisoGuard aquí para asegurar que estas rutas siempre sean accesibles

const routes: Routes = [
  {
    path: "",
    component: IndexComponent
  },
  {
    path: "dashboard0",
    component: DashbComponent
  },
  {
    path: "metasporvendedor",
    component: MetasPorVendedorComponent
  },
  {
    path: "metasdashboard",
    component: MetasDashboardComponent
  }


];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardsRoutingModule { }
