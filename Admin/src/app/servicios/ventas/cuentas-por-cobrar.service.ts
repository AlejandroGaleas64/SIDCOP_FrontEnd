import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { CuentaPorCobrar } from 'src/app/Modelos/ventas/CuentasPorCobrar.Model';
import { PagoCuentaPorCobrar } from 'src/app/Modelos/ventas/PagoCuentaPorCobrar.Model';
import { FormaPago } from 'src/app/Modelos/ventas/FormaPago.Model';

@Injectable({
  providedIn: 'root',
})
export class CuentasPorCobrarService {
  private apiUrl = environment.apiBaseUrl;
  private headers = { 'x-api-key': environment.apiKey };

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todas las cuentas por cobrar
   * @param soloActivas Si es true, solo devuelve cuentas activas
   * @param soloVencidas Si es true, solo devuelve cuentas vencidas
   * @returns Lista de cuentas por cobrar
   */
  obtenerCuentasPorCobrar(
    soloActivas: boolean = true,
    soloVencidas: boolean = false
  ): Observable<any> {
    let params = new HttpParams()
      .set('soloActivas', soloActivas.toString())
      .set('soloVencidas', soloVencidas.toString());

    return this.http.get(`${this.apiUrl}/CuentasPorCobrar/ResumenCliente`, {
      headers: this.headers,
      params: params,
    });
  }

  /**
   * Obtiene el resumen de antigüedad de las cuentas por cobrar de todos los clientes
   * @returns Resumen de antigüedad con todos los clientes, incluso sin saldo pendiente
   */
  obtenerResumenAntiguedad(): Observable<any> {
    return this.http.get(`${this.apiUrl}/CuentasPorCobrar/ResumenAntiguedad`, {
      headers: this.headers,
    });
  }

  /**
   * Obtiene una cuenta por cobrar por su ID
   * @param id ID de la cuenta por cobrar
   * @returns Cuenta por cobrar específica
   */
  obtenerCuentaPorCobrarPorId(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/CuentasPorCobrar/Detalle/${id}`, {
      headers: this.headers,
    });
  }

  /**
   * Obtiene los detalles de una cuenta por cobrar específica
   * @param id ID de la cuenta por cobrar
   * @returns Detalles de la cuenta por cobrar específica
   */
  obtenerDetalleCuentaPorCobrar(id: number): Observable<any> {
    // Utilizamos el endpoint de listar todas las cuentas y luego filtramos por ID en el componente
    // porque la API no proporciona un endpoint específico para obtener una cuenta por ID
    return this.http.get(
      `${this.apiUrl}/PagosCuentasPorCobrar/ListarCuentasPorCobrar?soloActivas=true&soloVencidas=false`,
      {
        headers: this.headers,
      }
    );
  }


    obtenerDetalleTimeLine(id: number): Observable<any> {
    // Utilizamos el endpoint de listar todas las cuentas y luego filtramos por ID en el componente
    // porque la API no proporciona un endpoint específico para obtener una cuenta por ID
    return this.http.get(
      `${this.apiUrl}/CuentasPorCobrar/timeLineCliente/${id}`,
      {
        headers: this.headers,
      }
    );
  }


  /**
   * Obtiene todos los pagos de una cuenta por cobrar
   * @param cuentaId ID de la cuenta por cobrar
   * @returns Lista de pagos de la cuenta
   */
  obtenerPagosPorCuenta(cuentaId: number): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/PagosCuentasPorCobrar/ListarPorCuentaPorCobrar/${cuentaId}`,
      {
        headers: this.headers,
      }
    );
  }

  /**
   * Registra un nuevo pago para una cuenta por cobrar
   * @param pago Datos del pago a registrar
   * @returns Resultado de la operación
   */
  registrarPago(pago: PagoCuentaPorCobrar): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/PagosCuentasPorCobrar/Insertar`,
      pago,
      {
        headers: this.headers,
      }
    );
  }

  /**
   * Anula un pago existente
   * @param pagoId ID del pago a anular
   * @param usuaModificacion ID del usuario que realiza la anulación
   * @param motivoAnulacion Motivo de la anulación
   * @returns Resultado de la operación
   */
  anularPago(
    pagoId: number,
    usuaModificacion: number,
    motivoAnulacion: string
  ): Observable<any> {
    const payload = {
      pago_Id: pagoId,
      usua_Modificacion: usuaModificacion,
      motivo_Anulacion: motivoAnulacion,
    };

    return this.http.post(
      `${this.apiUrl}/PagosCuentasPorCobrar/Anular`,
      payload,
      {
        headers: this.headers,
      }
    );
  }

  /**
   * Elimina una cuenta por cobrar
   * @param id ID de la cuenta por cobrar a eliminar
   * @returns Resultado de la operación
   */
  eliminarCuentaPorCobrar(id: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/CuentasPorCobrar/Eliminar/${id}`,
      {},
      {
        headers: this.headers,
      }
    );
  }

  /**
   * Obtiene todas las formas de pago disponibles
   * @returns Lista de formas de pago
   */
  obtenerFormasPago(): Observable<any> {
    return this.http.get(`${this.apiUrl}/FormaDePago/Listar`, {
      headers: this.headers
    });
  }
}
