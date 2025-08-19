export class DevolucionesDetalle {
    devD_Id: number = 0;
    devo_Id: number = 0;
    prod_Id: number = 0;
    devD_Cantidad: number = 0;
    prod_Descripcion: string = '';
    prod_DescripcionCorta: string = '';
    cate_Descripcion: string = '';
    subc_Descripcion: string = '';
    marc_Descripcion: string = '';
    prod_Imagen?: string = '';
    marc_Id: number = 0;
    usu_Creacion: string = '';
    devD_FechaCreacion: Date = new Date();
    usu_Modificacion?: string = '';
    devD_FechaModificacion?: Date = new Date();
    devD_Estado: boolean = true;

    constructor(init?: Partial<DevolucionesDetalle>) {
        Object.assign(this, init);
      }
}