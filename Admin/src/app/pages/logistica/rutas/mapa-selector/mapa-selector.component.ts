import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';

// Definición de la interfaz para representar un punto en el mapa con datos opcionales
interface PuntoVista {
  lat: number;
  lng: number;
  nombre?: string;
  clienteNombre?: string;
  nombrenegocio?: string;
}

// Declaración para usar la variable global de Google Maps
declare const google: any;

@Component({
  standalone: true,
  selector: 'app-mapa-selector',
  imports: [CommonModule],
  templateUrl: './mapa-selector.component.html',
  styleUrls: ['./mapa-selector.component.scss'],
})
export class MapaSelectorComponent implements AfterViewInit, OnChanges {
  // Coordenadas iniciales para centrar el mapa (input)
  @Input() coordenadasIniciales: { lat: number, lng: number } | null = null;
  // Lista de puntos a mostrar en el mapa
  @Input() puntosVista: PuntoVista[] = [];
  // Emite las coordenadas seleccionadas por el usuario en el mapa
  @Output() coordenadasSeleccionadas = new EventEmitter<{ lat: number, lng: number }>();

  // Variables para controlar la visibilidad del mapa y los puntos
  @Input() mostrar: boolean = false;
  @Input() mostrarPuntos: boolean = false;

  // Referencia al contenedor HTML del mapa
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef<HTMLDivElement>;

  // Instancia del mapa y array para almacenar marcadores
  private map!: google.maps.Map;
  private markers: google.maps.Marker[] = [];
  private mapaInicializado = false;

  // Servicios para dibujar rutas
  private directionsService!: google.maps.DirectionsService;
  private directionsRenderer!: google.maps.DirectionsRenderer;

  // Método del ciclo de vida Angular llamado después de que la vista es inicializada
  ngAfterViewInit() {
    // Si se activa mostrar, carga el script de Google Maps y luego inicializa el mapa
    if (this.mostrar) {
      this.cargarGoogleMapsScript().then(() => this.inicializarMapa());
    }
  }

  // Método del ciclo de vida Angular para detectar cambios en inputs
  ngOnChanges(changes: SimpleChanges): void {
    // Si cambia 'mostrar' a true y el mapa no está inicializado, cargar el script y luego inicializar
    if (changes['mostrar'] && this.mostrar && !this.mapaInicializado && this.mapaContainer) {
      this.cargarGoogleMapsScript().then(() => {
        setTimeout(() => this.inicializarMapa(), 100);
      });
    }

    // Si cambian los puntos y el mapa ya está listo, actualizar los marcadores y dibujar ruta
    if (changes['puntosVista'] && this.mapaInicializado) {
      this.agregarPuntosVistaAlMapa();
      this.dibujarRutaEntrePuntos();
    }
  }

  // Método para cargar dinámicamente el script de la API de Google Maps
  private cargarGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
      // Si el script ya está cargado, resolver inmediatamente
      if ((window as any).google && (window as any).google.maps) {
        resolve();
        return;
      }

      // Crear y agregar el script al documento, con la API Key sacada del environment
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  // Limpia todos los marcadores antiguos del mapa
  private limpiarMarcadores() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  // Agrega los puntos de vista como marcadores en el mapa, con ventanas de información
  private agregarPuntosVistaAlMapa() {
    if (!this.map || this.puntosVista.length === 0) return;

    this.limpiarMarcadores();

    const bounds = new google.maps.LatLngBounds();
    const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';

    this.puntosVista.forEach(punto => {
      const position = new google.maps.LatLng(punto.lat, punto.lng);

      // Crear marcador azul para cada punto
      const marker = new google.maps.Marker({
        position,
        map: this.map,
        icon: iconUrl,
        title: punto.nombre || ''
      });

      // Si el punto tiene nombre, crear ventana de info con detalles
      if (punto.nombre) {
        const contenidoHTML = `
          <div style="font-size: 14px;">
            <h3 style="margin: 0; font-size: 20px; font-weight: 500; color: #d6b68a;">
              ${punto.nombre || 'Sin Observaciones'}
            </h3>
            <strong>Cliente:</strong> ${punto.clienteNombre || 'Desconocido'}<br>
            <strong>Negocio:</strong> ${punto.nombrenegocio || 'Desconocido'}<br>
            <strong>Coordenadas:</strong> ${punto.lat.toFixed(6)}, ${punto.lng.toFixed(6)}
          </div>
        `;
        const infoWindow = new google.maps.InfoWindow({ content: contenidoHTML });
        marker.addListener('click', () => infoWindow.open(this.map, marker));
      }

      this.markers.push(marker);
      bounds.extend(position);
    });

    // Ajustar el zoom del mapa para mostrar todos los marcadores
    this.map.fitBounds(bounds);

    // Limita el nivel máximo de zoom a 15 después de ajustar el bounds
    const listener = google.maps.event.addListener(this.map, 'bounds_changed', () => {
      const currentZoom = this.map.getZoom();
      if (currentZoom !== undefined && currentZoom > 15) {
        this.map.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  }

  // Utiliza el servicio de direcciones para calcular y dibujar una ruta entre los puntos
  private dibujarRutaEntrePuntos() {
    if (!this.directionsService || !this.directionsRenderer) return;
    if (this.puntosVista.length < 2) return;

    // Definir origen y destino, y los puntos intermedios como paradas
    const origin = new google.maps.LatLng(this.puntosVista[0].lat, this.puntosVista[0].lng);
    const destination = new google.maps.LatLng(this.puntosVista[this.puntosVista.length - 1].lat, this.puntosVista[this.puntosVista.length - 1].lng);

    const waypoints = this.puntosVista.slice(1, -1).map(p => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      stopover: true
    }));

    // Crear la solicitud para la ruta, modo conducción y optimización de paradas
    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    };

    // Solicitar la ruta al servicio de direcciones y mostrarla en el mapa
    this.directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Error en DirectionsService:', status);
        this.directionsRenderer.set('directions', null);
      }
    });
  }

  // Inicializa el mapa, lo configura y agrega marcadores o permite selección de ubicación
  inicializarMapa() {
    if (this.mapaInicializado || !this.mapaContainer) return;

    // Centrar el mapa en coordenadas iniciales o valores por defecto
    const coords = this.coordenadasIniciales ?? { lat: 15.4894, lng: -88.0260 };

    // Crear el mapa en el div referenciado, con zoom y tipo de mapa
    this.map = new google.maps.Map(this.mapaContainer.nativeElement, {
      center: coords,
      zoom: 7,
      mapTypeId: 'roadmap',
      fullscreenControl: false,
    });

    // Inicializar los servicios para la ruta
    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: true
    });
    this.directionsRenderer.setMap(this.map);

    // Si hay puntos para mostrar, los agrega y dibuja la ruta
    if (this.puntosVista.length > 0) {
      this.agregarPuntosVistaAlMapa();
      this.dibujarRutaEntrePuntos();
    } else if (this.coordenadasIniciales) {
      // Si no hay puntos pero sí coordenadas iniciales, poner un marcador rojo
      const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';

      this.markers = [new google.maps.Marker({
        position: coords,
        map: this.map,
        icon: iconUrl,
      })];
    }

    // Si no se deben mostrar puntos, permitir que el usuario seleccione un punto en el mapa con clic
    if (!this.mostrarPuntos) {
      this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

        // Mover marcador rojo existente o crear uno nuevo en la posición clickeada
        if (this.markers.length > 0) {
          this.markers[0].setPosition(e.latLng);
        } else {
          const marker = new google.maps.Marker({
            position: e.latLng,
            map: this.map,
            icon: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
          });
          this.markers.push(marker);
        }
        // Emitir las coordenadas seleccionadas hacia fuera del componente
        this.coordenadasSeleccionadas.emit({ lat, lng });
      });
    }

    // Añade un logo personalizado en la esquina superior derecha del mapa
    const logoDiv = document.createElement('div');
    logoDiv.innerHTML = `
      <img src="https://res.cloudinary.com/dbt7mxrwk/image/upload/v1753586701/iod3sxxvwyr1sgsyjql6.png"
           alt="SIDCOP Logo"
           style="width: 60px; height: auto; position: relative; top: 20px; right: 12px" />
    `;
    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(logoDiv);

    // Marca como inicializado para evitar inicializaciones múltiples
    this.mapaInicializado = true;
    // Forzar redimensionamiento para que se pinte correctamente el mapa
    google.maps.event.trigger(this.map, 'resize');
  }
}
