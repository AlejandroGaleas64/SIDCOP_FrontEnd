export class TipoVendedores{
    tiVe_Id: number = 0;
    tiVe_TipoVendedor: string = " ";
    usua_Creacion: number = 0;
    tiVe_FechaCreacion: Date = new Date();
    usua_Modificacion: number = 0;
    tiVe_FechaModificacion: Date = new Date();
    secuencia: string = "";
    usuarioCreacion: string = "";
    usuarioModificacion: string = "";
    code_Status: number = 0;
    message_Status: string = "";

    constructor(init?: Partial<TipoVendedores>) {
        Object.assign(this, init);
    }
}
