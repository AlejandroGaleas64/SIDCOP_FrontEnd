export class CAIs{
  nCai_Id: number = 0;
  nCai_Codigo: string = '';
  nCai_Descripcion: string = '';
  usua_Creacion: number = 0;
  nCai_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  nCai_FechaModificacion?: Date;
  usuarioCreacion: string = '';
  usuarioModificacion: string = '';
  No?: number = 0;
  
  code_Status: number = 0;
  message_Status: string ='';

  constructor(init?: Partial<CAIs>) {
    Object.assign(this, init);
  }
}
