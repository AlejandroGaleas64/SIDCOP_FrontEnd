export class Usuario {
    secuencia: number = 0;
    usua_Id: number = 0;
    usua_Usuario: string = '';
    correo?: string;
    usua_Clave: string = '';
    role_Id: number = 0;
    role_Descripcion: string = '';
    usua_IdPersona: number = 0;
    usua_EsVendedor: boolean = false;
    usua_EsAdmin: boolean = false;
    usua_Imagen?: string;
    usua_TienePermisos: boolean = false;
    usua_Creacion: number = 0;
    usua_FechaCreacion: Date = new Date();
    usua_Modificacion?: number;
    usua_FechaModificacion?: Date;
    usua_Estado: boolean = false;

    usuarioCreacion?: string;
    usuarioModificacion?: string;

    permisosJson?: string;
    nombreCompleto: string = '';
    code_Status: number = 0;
    message_Status: string = '';
    No?: number = 0;

    constructor(init?: Partial<Usuario>) {
        Object.assign(this, init);
    }
}