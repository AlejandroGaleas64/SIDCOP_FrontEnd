import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ConnectionService } from '../services/connection.service';
import { environment } from 'src/environments/environment';

@Injectable()
export class DynamicConnectionInterceptor implements HttpInterceptor {
  // URLs base conocidas
  private readonly baseUrls = [
    environment.apiBaseUrl,
    'http://192.168.1.146:8091',
    'http://200.59.27.115:8091'
  ];

  constructor(private connectionService: ConnectionService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // No modificar las peticiones de health check para evitar ciclos
    if (request.url.includes('/api/health')) {
      return next.handle(request);
    }
    
    // Obtener la URL base actual del servicio de conexión
    const currentApiUrl = this.connectionService.apiUrl;
    let relativePath = '';
    let shouldModify = false;
    
    // Comprobar si la URL comienza con alguna de las URLs base conocidas
    for (const baseUrl of this.baseUrls) {
      if (request.url.startsWith(baseUrl)) {
        relativePath = request.url.substring(baseUrl.length);
        shouldModify = true;
        break;
      }
    }
    
    // Si no encontramos una URL base conocida pero la URL comienza con '/'
    // asumimos que es una ruta relativa que debe agregarse a la URL base actual
    if (!shouldModify && request.url.startsWith('/') && !request.url.startsWith('//')) {
      relativePath = request.url;
      shouldModify = true;
    }
    
    if (shouldModify) {
      // Asegurarse de que relativePath comience con '/' si no está vacío
      if (relativePath && !relativePath.startsWith('/')) {
        relativePath = '/' + relativePath;
      }
      
      // Clonar la solicitud con la nueva URL
      request = request.clone({
        url: `${currentApiUrl}${relativePath}`
      });
    }
    
    return next.handle(request);
  }
}
