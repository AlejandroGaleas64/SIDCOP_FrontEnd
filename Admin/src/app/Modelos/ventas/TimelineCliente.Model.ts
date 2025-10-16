export class TimelineCliente {
    clie_Id: number;
    clie_Nombres: string;
    clie_Apellidos: string;
    clie_NombreNegocio: string;
    clie_Telefono: string;
    clie_LimiteCredito: number;
    clie_Saldo: number;
    eventos: EventoTimeline[];

    constructor(data?: any) {
        this.clie_Id = data?.clie_Id || 0;
        this.clie_Nombres = data?.clie_Nombres || '';
        this.clie_Apellidos = data?.clie_Apellidos || '';
        this.clie_NombreNegocio = data?.clie_NombreNegocio || '';
        this.clie_Telefono = data?.clie_Telefono || '';
        this.clie_LimiteCredito = data?.clie_LimiteCredito || 0;
        this.clie_Saldo = data?.clie_Saldo || 0;
        this.eventos = data?.eventos?.map((e: any) => new EventoTimeline(e)) || [];
    }
}

export class EventoTimeline {
    id: number;
    tipo: string;
    fecha: Date;
    monto: number;
    saldoAnterior: number;
    saldoNuevo: number;
    descripcion: string;
    referencia: string;
    estado: string;

    constructor(data?: any) {
        this.id = data?.id || 0;
        this.tipo = data?.tipo || '';
        this.fecha = data?.fecha ? new Date(data.fecha) : new Date();
        this.monto = data?.monto || 0;
        this.saldoAnterior = data?.saldoAnterior || 0;
        this.saldoNuevo = data?.saldoNuevo || 0;
        this.descripcion = data?.descripcion || '';
        this.referencia = data?.referencia || '';
        this.estado = data?.estado || '';
    }
}
