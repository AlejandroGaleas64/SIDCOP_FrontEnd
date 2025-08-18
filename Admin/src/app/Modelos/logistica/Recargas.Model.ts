export class Recargas {
    secuencia?: number;
    reca_Id: number = 0;
    vend_Id: number = 0;
    bode_Id: number = 0;
    reca_Fecha: Date = new Date();

    reca_Observaciones: string = '';
    usua_Confirmacion: number = 0;
    ruta_Observaciones: string = '';
    usua_Creacion: number = 0;
    reca_FechaCreacion: Date = new Date();
    usua_Modificacion?: number;
    reca_FechaModificacion?: Date;
    reca_Confirmacion: string = '';

    bode_Descripcion: string = '';
    prod_DescripcionCorta: string = '';
    prod_Codigo: string = '';
    prod_Imagen: string = '';
    reDe_Observaciones: string = '';
    reDe_Cantidad : number = 0;
    detalleProductos : string = '';
    prod_Id : number =0;
    detalles: any[] = []; 

    usuarioCreacion: string = '';
    usuarioModificacion?: string;

    code_Status: number = 0;
    message_Status: string = '';






    constructor(init?: Partial<Recargas>) {
        Object.assign(this, init);
    }
}
/*  





 [NotMapped]
 public string? Bode_Descripcion { get; set; }

 [NotMapped]
 public string? Prod_DescripcionCorta { get; set; }

 [NotMapped]
 public string? Prod_Codigo { get; set; }

 [NotMapped]
 public string? Prod_Imagen { get; set; }

 [NotMapped]
 public string? ReDe_Observaciones { get; set; }

 [NotMapped]
 public int? ReDe_Cantidad { get; set; }
 [NotMapped]
 public string? DetalleProductos { get; set; }

 [NotMapped]
 public int? Prod_Id { get; set; }

 [NotMapped]
 public List<RecargaDetalleDTO> Detalles { get; set; }

*/