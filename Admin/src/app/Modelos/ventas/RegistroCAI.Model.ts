export class RegistroCAI {
  regC_Id: number = 0;
  regC_Descripcion: string = '';
  sucu_Id: number = 0;
  sucu_Descripcion: string = '';
  puEm_Id: number = 0;
  puEm_Codigo: string = '';
  puEm_Descripcion: string = '';
  nCai_Id: number = 0;
  nCai_Codigo: string = '';
  nCai_Descripcion: string = '';
  regC_RangoInicial: string = '';
  regC_RangoFinal: string = '';
  regC_FechaInicialEmision: Date = new Date() || null;
  regC_FechaFinalEmision: Date = new Date() || null;

  estado?: string = '';
  secuencia?: number = 0;

  usuarioCreacion: string = '';
  usuarioModificacion: string = '';
  
  usua_Creacion: number = 0;
  regC_FechaCreacion: Date = new Date();
  usua_Modificacion?: number;
  regC_FechaModificacion?: Date;
  regC_Estado: boolean = true;

    code_Status: number = 0;
  message_Status: string ='';

  constructor(init?: Partial<RegistroCAI>) {
    Object.assign(this, init);
  }
}
