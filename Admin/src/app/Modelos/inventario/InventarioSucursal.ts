export class InventarioSucursal{
    inSu_Id: number = 0;
    sucu_Id: number = 0;
    prod_Id: number = 0;
    sucu_Descripcion: string = '';
    prod_Descripcion: string = '';
    prod_DescripcionCorta: string = '';
    inSu_Cantidad: number = 0;
    cambio: string | null = null;
    usua_Creacion: number = 0;
    inSu_FechaCreacion: Date = new Date();
    usua_Modificacion?: number;
    inSu_FechaModificacion?: Date;
    inSu_Estado: boolean = false;
    usuarioCreacion: string = '';
    usuarioModificacion: string = '';
    code_Status: number = 0;
    message_Status: string ='';
    No?: number = 0;

    constructor(init?: Partial<InventarioSucursal>) {
      Object.assign(this, init);
    }
}