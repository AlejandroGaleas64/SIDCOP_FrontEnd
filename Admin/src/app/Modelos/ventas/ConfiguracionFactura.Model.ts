export class ConfiguracionFactura {
  coFa_Id: number = 0;
  coFa_NombreEmpresa: string = '';
  coFa_DireccionEmpresa: string = '';
  coFa_RTN: string = '';
  coFa_Correo: string = '';
  coFa_Telefono1: string = '';
  coFa_Telefono2: string = '';
  coFa_Logo: string = '';
  coFa_DiasDevolucion: number = 0;
  colo_Id: number = 0;
  usua_Creacion: number = 0;
  coFa_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  coFa_FechaModificacion?: Date;
  coFa_Estado: boolean = true;


  //not mapped
  secuencia?: number;
  no?: number;
  No?: number;
  colo_Descripcion: string = '';
  muni_Codigo: string = '';
  muni_Descripcion: string = '';
  depa_Codigo: string = '';
  depa_Descripcion: string = '';  
  usuarioCreacion: string = '';
  usuarioModificacion: string = '';


  constructor(init?: Partial<ConfiguracionFactura>) {
    Object.assign(this, init);
  }
}


