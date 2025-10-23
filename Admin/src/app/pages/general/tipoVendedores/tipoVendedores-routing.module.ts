import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TipoVendedoresRoutes } from './routes';

const routes: Routes = TipoVendedoresRoutes;

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TipoVendedoresRoutingModule {}
