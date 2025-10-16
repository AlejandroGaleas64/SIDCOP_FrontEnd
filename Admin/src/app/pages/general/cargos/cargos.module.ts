import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CargosRoutingModule } from './cargos-routing.module';


@NgModule({
  // Módulo contenedor del feature "Cargos".
  // Exporta solo el enrutamiento; los componentes son standalone y se cargan bajo demanda.
  imports: [
    CommonModule,
    CargosRoutingModule
  ]
})
export class CargosModule {}