export class Devoluciones {
    devo_Id: number = 0;
    fact_Id?: number;
    devo_Fecha: Date = new Date();
    devo_Motivo: string = '';
    usua_Creacion: number = 0;
    devo_FechaCreacion: Date = new Date();
    usua_Modificacion?: number;
    devo_FechaModificacion: Date = new Date();
    devo_Estado: boolean = true;
    usuarioCreacion: string = '';
    usuarioModificacion: string = '';
    devo_EnSucursal: boolean = false;
    
    No: number = 0;
    clie_NombreNegocio: string = '';
    nombre_Completo: string = '';
    fact_Numero: string = '';

    code_Status: number = 0;
    message_Status: string ='';
    secuencia?: number;
    
    constructor(init?: Partial<Devoluciones>) {
      Object.assign(this, init);
    }
  }

  