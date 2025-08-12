export class ClientesPorVendedor{
    vendedor: string = "",
    veRu_Dias: number = 0;
    ruta_Id: number = 0;
    ruta_Descripcion: string = '';
    cliente: string = '';
    clie_NombreNegocio: string = '';

    constructor(init?:Partial<ClientesPorVendedor>) {
        Object.assign(this, init);
    }
}