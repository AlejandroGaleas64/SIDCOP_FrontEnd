export class EstadoVisita{
  esVi_Id: number = 0;
  esVi_Descripcion: string = '';
  usua_Creacion: number = 0;
  esVi_FechaCreacion: Date = new Date();
  usua_Modificacion: number = 0;
  secuencia?: number;
  esVi_FechaModificacion?: Date | null;
  usuarioCreacion: string = '';
  usuarioModificacion: string = '';
  code_Status: number = 0;
  message_Status: string ='';

  constructor(init?: Partial<EstadoVisita>) {
    Object.assign(this, init);
  }
}
