import { Injectable } from '@angular/core';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CuentasPorCobrarDataService {
  // BehaviorSubject para almacenar los datos del cliente seleccionado
  private clienteSeleccionadoSource = new BehaviorSubject<CuentaPorCobrar | null>(null);
  
  // Observable público para que los componentes se suscriban
  public clienteSeleccionado$ = this.clienteSeleccionadoSource.asObservable();
  
  // Almacenamiento de la lista completa de cuentas por cobrar
  private listaCuentasPorCobrar: CuentaPorCobrar[] = [];
  
  // Almacenamiento del resumen de antigüedad
  private resumenAntiguedadData: any[] = [];

  constructor() {}

  /**
   * Establece el cliente seleccionado para compartir entre componentes
   * @param cliente Datos del cliente seleccionado
   */
  setClienteSeleccionado(cliente: CuentaPorCobrar | null): void {
    this.clienteSeleccionadoSource.next(cliente);
  }

  /**
   * Obtiene el cliente seleccionado actual
   * @returns Cliente seleccionado o null
   */
  getClienteSeleccionado(): CuentaPorCobrar | null {
    return this.clienteSeleccionadoSource.getValue();
  }

  /**
   * Guarda la lista completa de cuentas por cobrar
   * @param lista Lista de cuentas por cobrar
   */
  setListaCuentasPorCobrar(lista: CuentaPorCobrar[]): void {
    this.listaCuentasPorCobrar = [...lista];
  }

  /**
   * Obtiene la lista completa de cuentas por cobrar
   * @returns Lista de cuentas por cobrar
   */
  getListaCuentasPorCobrar(): CuentaPorCobrar[] {
    return [...this.listaCuentasPorCobrar];
  }

  /**
   * Busca un cliente por su ID en la lista almacenada
   * @param id ID de la cuenta por cobrar a buscar
   * @returns Cliente encontrado o null si no existe
   */
  buscarClientePorId(id: number): CuentaPorCobrar | null {
    const cliente = this.listaCuentasPorCobrar.find(c => c.cpCo_Id === id);
    return cliente || null;
  }

  /**
   * Guarda los datos del resumen de antigüedad
   * @param resumen Datos del resumen de antigüedad
   */
  setResumenAntiguedad(resumen: any[]): void {
    this.resumenAntiguedadData = [...resumen];
  }

  /**
   * Obtiene los datos del resumen de antigüedad
   * @returns Datos del resumen de antigüedad
   */
  getResumenAntiguedad(): any[] {
    return [...this.resumenAntiguedadData];
  }

  /**
   * Busca un cliente en el resumen de antigüedad por su ID
   * @param id ID de la cuenta por cobrar a buscar
   * @returns Datos del cliente en el resumen de antigüedad o null si no existe
   */
  buscarClienteEnResumenPorId(id: number): any | null {
    const cliente = this.resumenAntiguedadData.find(c => c.cpCo_Id === id);
    return cliente || null;
  }

  /**
   * Limpia todos los datos almacenados
   */
  limpiarDatos(): void {
    this.clienteSeleccionadoSource.next(null);
    this.listaCuentasPorCobrar = [];
    this.resumenAntiguedadData = [];
  }
}
