import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../../shared/shared.module';
import { ReportesRoutingModule } from './reportes-routing.module'; // <-- corregido

@NgModule({
  imports: [
    CommonModule,
    ReportesRoutingModule, 
    SharedModule
  ],
})
export class ReportesModule { }
