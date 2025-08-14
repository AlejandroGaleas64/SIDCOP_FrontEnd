export class Canal {
  cana_Id: number = 0;
  cana_Descripcion: string = '';
  cana_Observaciones: string = '';
  usua_Creacion: number = 0;
  cana_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  cana_FechaModificacion?: Date;
  secuencia: number = 0;
  cana_Estado: boolean = true;

  usuarioCreacion?: string;
  usuarioModificacion?: string;

  constructor(init?: Partial<Canal>) {
    Object.assign(this, init);
  }
}