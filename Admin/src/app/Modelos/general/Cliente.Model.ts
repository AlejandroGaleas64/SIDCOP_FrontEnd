export class Cliente{

    clie_Id: number = 0;
    clie_Codigo: string = '';
    clie_Nacionalidad: string = '';
    pais_Descripcion: string = '';
    clie_DNI: string = '';
    clie_RTN: string = '';
    clie_Nombres: string = '';
    clie_Apellidos: string = '';
    // nombreCompleto: string = '';
    clie_NombreNegocio: string = '';
    clie_ImagenDelNegocio: string = '';
    clie_Telefono: string = '';
    clie_Correo: string = '';
    clie_Sexo: string = '';
    clie_FechaNacimiento?: Date | null;
    tiVi_Id: number = 0;
    tiVi_Descripcion: string = '';
    cana_Id: number = 0;
    cana_Descripcion: string = '';
    // colo_Id: number = 0;
    // colo_Descripcion: string = '';
    esCv_Id: number = 0;
    esCv_Descripcion: string = '';
    ruta_Id: number = 0;
    ruta_Descripcion: string = '';
    clie_LimiteCredito: number = 0;
    clie_DiasCredito: number = 0;
    clie_Saldo: number = 0;
    clie_Vencido: boolean = true;
    clie_Observaciones: string = '';
    clie_ObservacionRetiro: string = '';
    clie_Confirmacion: boolean = true;
    usua_Creacion: number = 0;
    clie_FechaCreacion: Date = new Date();
    usua_Modificacion: number = 0;
    clie_FechaModificacion?: Date;
    clie_Estado: boolean = true;

    usuaC_Nombre: string = '';
    usuaM_Nombre: string = '';
    secuencia: number = 0;
    code_Status: number = 0;
    message_Status: string = '';
    // usuarioCreacion: string = '';
    // usuarioModificacion: string = '';
    No?: number = 0;
    
    constructor(init?: Partial<Cliente>) {
    Object.assign(this, init);
  }
}