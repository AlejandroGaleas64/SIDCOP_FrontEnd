export class Sucursales {
  sucu_Id: number = 0;
  sucu_Descripcion: string = '';
  colo_Id: number = 0;
  sucu_DireccionExacta: string = '';
  sucu_Telefono1: string = '';
  sucu_Telefono2: string = '';
  sucu_Codigo: string = '';
  sucu_Correo: string = '';
  secuencia: number = 0;
  usua_Creacion: number = 0;
  sucu_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  sucu_FechaModificacion?: Date;
  sucu_Estado: boolean = true;

  // Nuevos campos para detalles
  colo_Descripcion?: string;
  muni_Descripcion?: string;
  depa_Descripcion?: string;
  usuarioCreacion?: string;
  usuarioModificacion?: string;

  constructor(init?: Partial<Sucursales>) {
    Object.assign(this, init);
  }
}