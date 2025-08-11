export class Ruta {
    secuencia?: number;
    ruta_Id: number = 0;
    ruta_Codigo: string = '';
    ruta_Descripcion: string = '';
    ruta_Observaciones: string = '';
    usua_Creacion: number = 0;
    ruta_FechaCreacion: Date = new Date();
    usua_Modificacion?: number;
    ruta_FechaModificacion?: Date;
    usuarioCreacion: string = '';
    usuarioModificacion?: string;

    code_Status: number = 0;
    message_Status: string = '';

    constructor(init?: Partial<Ruta>) {
        Object.assign(this, init);
    }
}