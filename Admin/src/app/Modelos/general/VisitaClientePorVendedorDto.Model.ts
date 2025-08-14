export class VisitaClientePorVendedorDto {

    clVi_Id: number = 0;
    diCl_Id: number = 0;
    diCl_Latitud: number = 0;
    diCl_Longitud: number = 0;
    vend_Id: number = 0;
    vend_Codigo: string = '';
    vend_DNI: string = '';
    vend_Nombres: string = '';
    vend_Apellidos: string = '';
    vend_Telefono: string = '';
    vend_Tipo: string = '';
    vend_Imagen: string = '';
    ruta_Id: number = 0;
    ruta_Descripcion: string = '';
    veRu_Id: number = 0;
    veRu_Dias: string = '';
    clie_Id: number = 0;
    clie_Codigo: string = '';
    clie_Nombres: string = '';
    clie_Apellidos: string = '';
    clie_NombreNegocio: string = '';
    imVi_Imagen: string = '';
    clie_Telefono: string = '';
    esVi_Id: number = 0;
    esVi_Descripcion: string = '';
    clVi_Observaciones: string = '';
    clVi_Fecha: Date = new Date();
    usua_Creacion: number = 0;
    clVi_FechaCreacion: Date = new Date();
    No?: number = 0;


    constructor(init?: Partial<VisitaClientePorVendedorDto>) {
        Object.assign(this, init);
    }
}