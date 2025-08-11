export class Traslado {
  tras_Id: number = 0;
  tras_Origen: number = 0;
  origen: string = ''; // Descripción del origen (ej. "Sucursal Rio De Piedra")
  tras_Destino: number = 0;
  destino: string = ''; // Descripción del destino (ej. "Bodega #1 Vehiculo")
  tras_Fecha: Date = new Date();
  tras_Observaciones: string = '';
  usua_Creacion: number = 0;
  tras_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  tras_FechaModificacion?: Date;
  tras_Estado: boolean = true;
  usuaCreacion: string = ''; // Nombre del usuario que creó el traslado
  usuaModificacion?: string; // Nombre del usuario que modificó el traslado
  reca_Id?: number; // ID del recaudo asociado (opcional)

  // Campo para numeración de filas en la tabla
  No?: number;

  // Campos adicionales para seguimiento de estado (opcional)
  code_Status?: number;
  message_Status?: string;

  constructor(init?: Partial<Traslado>) {
    Object.assign(this, init);
  }
}
