export class Pedido {
  pedi_Id: number = 0;
  pedi_Codigo: string = '';
  diCl_Id: number = 0;
  vend_Id: number = 0;
  pedi_FechaPedido: Date = new Date();
  pedi_FechaEntrega: Date = new Date();
  clie_Codigo: string = '';
  clie_Id: number = 0; 
  clie_NombreNegocio: string = '';
  clie_Nombres: string = '';
  clie_Apellidos: string = '';
  colo_Descripcion: string = '';
  muni_Descripcion: string = '';
  depa_Descripcion: string = '';
  diCl_DireccionExacta: string = '';
  vend_Nombres: string = '';
  vend_Apellidos: string = '';
  prod_Codigo: string = '';
  prod_Descripcion: string = '';
  peDe_ProdPrecio: number = 0;
  peDe_Cantidad: number = 0;
  detalles: any[] = []; // Cambia el tipo según tu modelo de detalle
  detallesJson: string = '';
  
  // Propiedades adicionales para la factura
  regC_Id: number = 0;
  pedi_Latitud: number = 0;
  pedi_Longitud: number = 0;

  usuarioCreacion: string = '';
  usuarioModificacion: string = '';

  usua_Creacion: number = 0;
  pedi_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  pedi_FechaModificacion?: Date = new Date();

  pedi_Estado?: boolean = false;
  secuencia: number = 0;
  
  code_Status: number = 0;
  message_Status: string = '';

  constructor(init?: Partial<Pedido>) {
    Object.assign(this, init);
  }
}
