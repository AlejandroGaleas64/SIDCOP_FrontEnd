export class ClientesVisitaHistorial {
  clVi_Id: number = 0;
  veRu_Id: number = 0;
  diCl_Id: number = 0;
  esVi_Id: number = 0;
  clVi_Observaciones: string = '';
  clVi_Fecha: Date = new Date();
  usua_Creacion: number = 0;
  clVi_FechaCreacion: Date = new Date();
  veru_Dias: string = '';
  cliente: string = '';
  clie_NombreNegocio: string = '';
  diCl_Latitud: string = '';
  diCl_Longitud: string = '';
  esV_Descripcion: string = '';
  secuencia: number = 0;
  No?: number = 0;

  constructor(init?: Partial<ClientesVisitaHistorial>) {
    Object.assign(this, init);
  }
}