export class Vendedor{
  vend_Id: number = 0;
  vend_Codigo: string = '';
  vend_DNI: string = '';
  vend_Nombres: string = '';
  vend_Apellidos: string = '';
  vend_Telefono: string = '';
  vend_Correo: string = '';
  vend_Sexo: string = '';
  vend_DireccionExacta: string = '';
  sucu_Id: number = 0;
  colo_Id: number = 0;
  vend_Supervisor?: number = 0;
  vend_Ayudante?: number = 0;
  vend_Tipo: string = '';
  vend_EsExterno?: boolean = false;
  vend_Estado: string = '';
  usua_Creacion: number = 0;
  vend_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  vend_Imagen: string = '';
  secuencia?: number;
  sucu_Descripcion?: string = '';
  colo_Descripcion?: string = '';
  sucu_DireccionExacta?: string = '';
  muni_Codigo?: string = '';
  muni_Descripcion?: string = '';
  depa_Codigo?: string = '';
  depa_Descripcion?: string = '';
  vend_FechaModificacion?: Date;
  usuarioCreacion: string = '';
  usuarioModificacion: string = '';
  nombreSupervisor?: string = '';
  apellidoSupervisor?: string = '';
  nombreAyudante?: string = '';
  apellidoAyudante?: string = '';
  code_Status: number = 0;
  message_Status: string ='';
  rutas?: any[] | string = [];

  constructor(init?: Partial<Vendedor>) {
    Object.assign(this, init);
  }
}