export class PagoCuentaPorCobrar {
  pago_Id: number = 0;
  cpCo_Id: number = 0;
  pago_Fecha: Date = new Date();
  pago_Monto: number = 0;
  foPa_Id: number = 0;
  foPa_Descripcion?: string;
  pago_NumeroReferencia?: string;
  pago_Observaciones: string = '';
  usua_Creacion: number = 0;
  pago_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  pago_FechaModificacion?: Date;
  pago_Estado: boolean = true;
  pago_Anulado: boolean = false;
  
  // Propiedades adicionales (NotMapped en el backend)
  clie_Id?: number;
  clie_NombreCompleto?: string;
  clie_RTN?: string;
  fact_Id?: number;
  fact_Numero?: string;
  usuarioCreacion?: string;
  usuarioModificacion?: string;

  constructor(init?: Partial<PagoCuentaPorCobrar>) {
    Object.assign(this, init);
  }
}

export enum FormaPago {
  EFECTIVO = 'EFECTIVO',
  TARJETA = 'TARJETA',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
  OTRO = 'OTRO'
}
