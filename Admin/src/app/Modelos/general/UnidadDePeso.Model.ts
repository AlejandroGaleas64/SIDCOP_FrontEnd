export class UnidadDePeso {
  unPe_Id: number = 0;
  unPe_Descripcion: string = '';
  unPe_Abreviatura: string = '';
  secuencia: number = 0;
  usua_Creacion: number = 0;
  unPe_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  unPe_FechaModificacion?: Date;

  usuarioCreacion?: string;
  usuarioModificacion?: string;
  code_Status?: number;
  message_Status?: string;
  constructor(init?: Partial<UnidadDePeso>) {
    Object.assign(this, init);
  }
}