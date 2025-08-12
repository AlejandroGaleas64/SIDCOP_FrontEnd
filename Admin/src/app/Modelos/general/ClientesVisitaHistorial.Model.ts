export class ClientesVisitaHistorial {
    hcVi_Id: number = 0;
    veRu_Id: number = 0;
    clie_Id: number = 0;
    hcVi_Foto: string = '';
    hcVi_Observaciones: string = '';
    hcVi_Fecha: Date = new Date();
    hcVi_Latitud: number = 0;
    hcVi_Longitud: number = 0;
    usua_Creacion: number = 0;
    hcVi_FechaCreacion: Date = new Date();
    No?: number = 0;

  constructor(init?: Partial<ClientesVisitaHistorial>) {
    Object.assign(this, init);
  }
}