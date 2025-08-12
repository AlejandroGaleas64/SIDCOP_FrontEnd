export class VisitaClientePorVendedorDto {
    hCVi_Id: number = 0;
    vend_Id: number = 0;
    vend_Codigo: string = '';
    vend_DNI: string = '';
    vend_Nombres: string = '';
    vend_Apellidos: string = '';
    vend_Telefono: string = '';
    vend_Tipo: string = '';
    veRu_Id: number = 0;
    veRu_Dias: string = '';
    clie_Id: number = 0;
    clie_Codigo: string = '';
    clie_Nombres: string = '';
    clie_Apellidos: string = '';
    clie_NombreNegocio: string = '';
    clie_Telefono: string = '';
    hCVi_Foto: string = '';
    hCVi_Observaciones: string = '';
    hCVi_Fecha: Date = new Date();
    hCVi_Latitud: number = 0;
    hCVi_Longitud: number = 0;
    usua_Creacion: number = 0;
    hCVi_FechaCreacion: Date = new Date();

    constructor(init?: Partial<VisitaClientePorVendedorDto>) {
        Object.assign(this, init);
    }
}