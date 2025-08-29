// export class Meta{

//   meta_Id: number = 0;
//   meta_Descripcion: string = "";
//   meta_FechaInicio: Date = new Date();
//   meta_FechaFin: Date = new Date();
//   meta_Tipo: string = "";
//   meta_Ingresos?: number = 0;
//   meta_Unidades?: number = 0;
//   prod_Id?: number = 0;
//   cate_Id?: number = 0;
//   meta_Estado: boolean = false;

  
//   usua_Creacion: number = 0;
//   meta_FechaCreacion: Date = new Date();
//   usua_Modificacion: number = 0;
//   meta_FechaModificacion: Date = new Date();
//   vendedoresXml: string = "";
//   vendedoresJson: any = "";


//   constructor(init?: Partial<Meta>) {
//     Object.assign(this, init);
//   }
// }

export class Meta {
  meta_Id: number = 0;
  meta_Descripcion: string = '';
  meta_FechaInicio: Date = new Date();
  meta_FechaFin: Date = new Date();
  meta_Tipo: string = '';
  meta_Ingresos: number = 0;
  meta_Unidades: number = 0;
  prod_Id?: number = 0;
  cate_Id?: number = 0;
  vendedoresXml: string = "";
  vendedoresJson: any = "";
  
  usua_Creacion: number = 0;
  meta_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  meta_FechaModificacion?: Date;
  meta_Estado: boolean = false;

  code_Status?: number;
  message_Status?: string;
  // Add more fields as needed
  constructor(init?: Partial<Meta>) {
    Object.assign(this, init);
  }
}