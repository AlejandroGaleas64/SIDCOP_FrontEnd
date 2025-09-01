export class Migracion {
  
    coMi_Tabla: string = '';
    coMi_UltimaFechaMigracion: Date = new Date();


    code_Status: number = 0;
    message_Status: string = '';

    constructor(init?: Partial<Migracion>) {
        Object.assign(this, init);
    }
}