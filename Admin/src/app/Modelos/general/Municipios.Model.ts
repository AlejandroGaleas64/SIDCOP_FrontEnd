export class Municipio{
  muni_Codigo: string = '';
  muni_Descripcion: string = '';
  depa_Codigo: string = '';
  depa_Descripcion?: string;
  usua_Creacion: number = 0;
  muni_FechaCreacion: Date = new Date();
  secuencia?: number;
  usua_Modificacion?: number;
  muni_FechaModificacion?: Date;
  usuarioCreacion: string = '';
  usuarioModificacion?: string;
  code_Status: number = 0;
  message_Status: string ='';

  constructor(init?: Partial<Municipio>) {
    Object.assign(this, init);
  }
}