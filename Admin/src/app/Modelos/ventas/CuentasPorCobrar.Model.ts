export class CuentaPorCobrar {
  cpCo_Id: number = 0;
  clie_Id: number = 0;
  fact_Id: number = 0;
  cpCo_FechaEmision: Date = new Date();
  cpCo_FechaVencimiento: Date = new Date();
  cpCo_Valor: number = 0;
  cpCo_Saldo: number = 0;
  cpCo_Observaciones: string = '';
  cpCo_Anulado: boolean = false;
  cpCo_Saldada: boolean = false;
  usua_Creacion: number = 0;
  cpCo_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  cpCo_FechaModificacion?: Date;
  cpCo_Estado: boolean = true;
  secuencia?: number;

  // Datos del cliente
  cliente: string = '';
  clie_Codigo: string = '';
  clie_Nombres: string = '';
  clie_Apellidos: string = '';
  clie_NombreCompleto: string = '';
  clie_NombreNegocio: string = '';
  clie_Telefono: string = '';
  clie_LimiteCredito: number = 0;
  clie_Saldo: number = 0;

  // Auditoría
  usuarioCreacion: string = '';
  usuarioModificacion: string = '';
  code_Status: number = 0;
  message_Status: string = '';

  // Rangos de antigüedad (Aging)
  saldo_0_30: number = 0;
  saldo_31_60: number = 0;
  saldo_61_90: number = 0;
  saldo_91_mas: number = 0;
  saldo_vencido: number = 0;
  saldo_total: number = 0;
  estaVencido: boolean = false;

  // NUEVOS CAMPOS PARA RESUMEN POR CLIENTE
  facturasPendientes: number = 0;
  totalFacturado: number = 0;
  totalPendiente: number = 0;
  totalVencido: number = 0;
  ultimoPago?: Date;

  constructor(init?: Partial<CuentaPorCobrar>) {
    Object.assign(this, init);
  }
}
