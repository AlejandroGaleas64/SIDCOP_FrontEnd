export class FormaPago {
  foPa_Id: number = 0;
  foPa_Descripcion: string = '';
  usua_Creacion?: number;
  usuaCreacion?: string;
  secuencia?: number;
  foPa_FechaCreacion?: Date;
  usua_Modificacion?: number;
  usuaModificacion?: string;
  foPa_FechaModificacion?: Date;
  
  constructor(init?: Partial<FormaPago>) {
    Object.assign(this, init);
  }
}
