export class  DireccionPorCliente {
    diCl_Id: number = 0;
    clie_Id: number = 0;
    colo_Id: number = 0;
    diCl_DireccionExacta: string = '';
    diCl_Observaciones: string = '';
    diCl_Latitud: number = 0;
    diCl_Longitud: number = 0;
    colo_Descripcion: string = '';
    muni_Descripcion: string = '';
    depa_Descripcion: string = '';
    usua_Creacion: number = 0;
    diCl_FechaCreacion: Date = new Date();
    usua_Modificacion: number = 0;
    diCl_FechaModificacion: Date = new Date();

  constructor(init?: Partial<DireccionPorCliente>) {
    Object.assign(this, init);
  }
}