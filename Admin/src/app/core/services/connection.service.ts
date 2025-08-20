import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map, switchMap, timeout } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
  // URLs de API
  private localUrl = 'http://192.168.1.146:8091';
  private remoteUrl = 'http://192.168.1.146:8091';

  // Sujeto observable para la URL actual de la API
  private currentApiUrlSubject = new BehaviorSubject<string>(this.localUrl);
  public currentApiUrl$ = this.currentApiUrlSubject.asObservable();

  // Estado de conexión para ambos servidores
  private localStatusSubject = new BehaviorSubject<boolean>(false);
  private remoteStatusSubject = new BehaviorSubject<boolean>(false);
  public localStatus$ = this.localStatusSubject.asObservable();
  public remoteStatus$ = this.remoteStatusSubject.asObservable();

  // Timeout para las peticiones en ms (2 segundos)
  private requestTimeout = 2000;

  constructor(private http: HttpClient) {
    // Verificar conexiones al iniciar la aplicación
    setTimeout(() => this.initializeConnections(), 1000);
  }

  /**
   * Inicializa las conexiones verificando primero la local y luego la remota
   */
  private initializeConnections(): void {
    this.checkConnection(this.localUrl).subscribe((localAvailable) => {
      this.localStatusSubject.next(localAvailable);

      if (localAvailable) {
        this.currentApiUrlSubject.next(this.localUrl);
      }

      // Verificar también la conexión remota para actualizar su estado
      this.checkConnection(this.remoteUrl).subscribe((remoteAvailable) => {
        this.remoteStatusSubject.next(remoteAvailable);

        // Si local no está disponible pero remota sí, usar remota
        if (!localAvailable && remoteAvailable) {
          this.currentApiUrlSubject.next(this.remoteUrl);
        }
      });
    });
  }

  /**
   * Obtiene la URL actual de la API
   */
  public get apiUrl(): string {
    return this.currentApiUrlSubject.value;
  }

  /**
   * Verifica una conexión específica
   */
  private checkConnection(url: string): Observable<boolean> {
    return this.http.get<any>(`${url}/api/health`).pipe(
      timeout(this.requestTimeout),
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Fuerza una verificación inmediata de ambas conexiones
   */
  public forceConnectionCheck(): Observable<boolean> {
    // Primero intentar con la conexión local
    return this.checkConnection(this.localUrl).pipe(
      switchMap((localAvailable) => {
        this.localStatusSubject.next(localAvailable);

        if (localAvailable) {
          this.currentApiUrlSubject.next(this.localUrl);

          // Verificar también la remota para actualizar su estado
          this.checkConnection(this.remoteUrl).subscribe((remoteAvailable) => {
            this.remoteStatusSubject.next(remoteAvailable);
          });

          return of(true);
        } else {
          // Si local no está disponible, intentar con remota
          return this.checkConnection(this.remoteUrl).pipe(
            map((remoteAvailable) => {
              this.remoteStatusSubject.next(remoteAvailable);

              if (remoteAvailable) {
                this.currentApiUrlSubject.next(this.remoteUrl);
                return true;
              } else {
                // Ninguna conexión disponible, usar local como fallback
                this.currentApiUrlSubject.next(this.localUrl);
                return false;
              }
            })
          );
        }
      }),
      catchError(() => of(false))
    );
  }

  /**
   * Cambia manualmente a la URL remota
   */
  public useRemoteUrl(): void {
    this.currentApiUrlSubject.next(this.remoteUrl);
  }

  /**
   * Cambia manualmente a la URL local
   */
  public useLocalUrl(): void {
    this.currentApiUrlSubject.next(this.localUrl);
  }

  /**
   * Obtiene el estado actual de las conexiones
   */
  public getConnectionStatus(): {
    local: boolean;
    remote: boolean;
    activeUrl: string;
  } {
    return {
      local: this.localStatusSubject.value,
      remote: this.remoteStatusSubject.value,
      activeUrl: this.currentApiUrlSubject.value,
    };
  }
}
