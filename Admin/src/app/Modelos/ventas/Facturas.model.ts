export class Factura {
  secuencia: number = 0;
  fact_Id: number = 0;
  fact_Numero: string = '';
  fact_TipoDeDocumento: string = '';
  regC_Id: number = 0;
  clie_Id: number = 0;

  // Datos del cliente (no mapeados en DB)
  clie_NombreCompleto?: string;
  clie_NombreNegocio?: string;

  vend_Id: number = 0;

  // Datos del vendedor (no mapeados en DB)
  vend_NombreCompleto?: string;

  fact_TipoVenta: string = '';
  fact_FechaEmision: Date = new Date();
  fact_FechaLimiteEmision: Date = new Date();
  fact_RangoInicialAutorizado: string = '';
  fact_RangoFinalAutorizado: string = '';
  fact_TotalImpuesto15: number = 0;
  fact_TotalImpuesto18: number = 0;
  fact_ImporteExento: number = 0;
  fact_ImporteGravado15: number = 0;
  fact_ImporteGravado18: number = 0;
  fact_ImporteExonerado: number = 0;
  fact_TotalDescuento: number = 0;
  fact_Subtotal: number = 0;
  fact_Total: number = 0;
  fact_Latitud: number = 0;
  fact_Longitud: number = 0;
  fact_Referencia: string = '';
  fact_AutorizadoPor: string = '';
  fact_Anulado?: boolean;
  fact_Usuario: string = '';
  usua_Creacion: number = 0;
  fact_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  fact_FechaModificacion?: Date;
  fact_Estado: boolean = true;

  constructor(init?: Partial<Factura>) {
    Object.assign(this, init);
  }
}

export class VentaInsertar {
  fact_Numero: string = '';
  fact_TipoDeDocumento: string = '';
  regC_Id: number = 0;
  clie_Id: number = 0;
  vend_Id: number = 0;
  fact_TipoVenta: string = ''; // CONTADO o CREDITO
  fact_FechaEmision: Date = new Date();
  fact_FechaLimiteEmision: Date = new Date();
  fact_RangoInicialAutorizado: string = '';
  fact_RangoFinalAutorizado: string = '';
  fact_Latitud: number = 0;
  fact_Longitud: number = 0;
  fact_Referencia?: string;
  fact_AutorizadoPor?: string;
  usua_Creacion: number = 0;
  detallesFacturaInput: VentaDetalle[] = [];

  constructor(init?: Partial<VentaInsertar>) {
    Object.assign(this, init);
  }
}


export class VentaDetalle {
  prod_Id: number = 0;
  faDe_Cantidad: number = 0;

  constructor(init?: Partial<VentaDetalle>) {
    Object.assign(this, init);
  }
}


// venta-respuesta.model.ts
export class VentaRespuesta {
  fact_Id: number = 0;
  exitoso: boolean = false;
  mensaje: string = '';
  total?: number;
  subtotal?: number;
  totalDescuento?: number;
  totalImpuestos?: number;

  constructor(init?: Partial<VentaRespuesta>) {
    Object.assign(this, init);
  }
}


// factura-completa.model.ts
export class FacturaCompleta {
  // Configuración empresa
  coFa_NombreEmpresa: string = '';
  coFa_DireccionEmpresa: string = '';
  coFa_RTN: string = '';
  coFa_Correo: string = '';
  coFa_Telefono1: string = '';
  coFa_Telefono2: string = '';
  coFa_Logo: string = '';

  // Datos factura
  fact_Id: number = 0;
  fact_Numero: string = '';
  fact_TipoDeDocumento: string = '';
  fact_TipoVenta: string = '';
  fact_FechaEmision: Date = new Date();
  fact_FechaLimiteEmision: Date = new Date();
  fact_RangoInicialAutorizado: string = '';
  fact_RangoFinalAutorizado: string = '';
  fact_Referencia: string = '';
  fact_AutorizadoPor: string = '';
  fact_Latitud?: number;
  fact_Longitud?: number;

  // Datos cliente
  clie_Id: number = 0;
  cliente: string = '';
  clie_RTN: string = '';
  clie_Telefono: string = '';
  diCl_DireccionExacta: string = '';

  // Datos vendedor
  vend_Id: number = 0;
  vendedor: string = '';
  vend_Telefono: string = '';

  // Datos sucursal
  sucu_Id: number = 0;
  sucu_Descripcion: string = '';
  sucu_DireccionExacta: string = '';

  // Datos registro CAI
  regC_Descripcion: string = '';
  regC_FechaInicialEmision: Date = new Date();
  regC_FechaFinalEmision: Date = new Date();
  regC_RangoInicial: string = '';
  regC_RangoFinal: string = '';

  // Totales factura
  fact_TotalImpuesto15: number = 0;
  fact_TotalImpuesto18: number = 0;
  fact_ImporteExento: number = 0;
  fact_ImporteGravado15: number = 0;
  fact_ImporteGravado18: number = 0;
  fact_ImporteExonerado: number = 0;
  fact_TotalDescuento: number = 0;
  fact_Subtotal: number = 0;
  fact_Total: number = 0;

  // Listas
  detalleFactura: DetalleItem[] = [];
  cuentasPorCobrar: CuentaPorCobrarItem[] = [];

  // Respuesta SP
  mensaje: string = '';
  exitoso: boolean = false;

  constructor(init?: Partial<FacturaCompleta>) {
    Object.assign(this, init);
  }
}

export class DetalleItem {
  faDe_Id: number = 0;
  prod_Id: number = 0;
  faDe_Cantidad: number = 0;
  faDe_PrecioUnitario: number = 0;
  faDe_Subtotal: number = 0;
  faDe_Descuento: number = 0;
  faDe_Impuesto: number = 0;
  faDe_Total: number = 0;
  prod_Descripcion: string = '';
  prod_CodigoBarra: string = '';
  prod_PagaImpuesto: string = '';
  impu_Id?: number;
  impu_Descripcion: string = '';
  porcentajeImpuesto: number = 0;
  descuentoUnitario: number = 0;
  porcentajeDescuento: number = 0;

  constructor(init?: Partial<DetalleItem>) {
    Object.assign(this, init);
  }
}

export class CuentaPorCobrarItem {
  cpCo_Id: number = 0;
  cpCo_FechaEmision: Date = new Date();
  cpCo_FechaVencimiento: Date = new Date();
  cpCo_Valor: number = 0;
  cpCo_Saldo: number = 0;
  cpCo_Observaciones: string = '';
  cpCo_Saldada: boolean = false;
  diasParaVencimiento: number = 0;
  estadoCuenta: string = '';

  constructor(init?: Partial<CuentaPorCobrarItem>) {
    Object.assign(this, init);
  }
}


export class FacturaVendedor {
  fact_Id: number = 0;
  fact_Numero: string = '';
  fact_TipoDeDocumento: string = '';
  clie_Id: number = 0;
  cliente: string = '';
  fact_TipoVenta: string = '';
  fact_FechaEmision: Date = new Date();
  fact_Total: number = 0;
  fact_Anulado: boolean = false;
  fact_Estado: string = '';
  mensaje: string = '';
  exitoso: boolean = false;

  constructor(init?: Partial<FacturaVendedor>) {
    Object.assign(this, init);
  }
}

