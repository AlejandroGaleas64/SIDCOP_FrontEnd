/// <reference types="@types/google.maps" />
import { Component, Input, Output, EventEmitter, ViewChild,  ElementRef, AfterViewInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';

interface PuntoVista {
  lat: number;
  lng: number;
  nombre?: string;
  clienteNombre?: string;
  nombrenegocio?: string;
}

declare const google: any;

@Component({
  standalone: true,
  selector: 'app-mapa-selector',
  imports: [CommonModule],
  templateUrl: './mapa-selector.component.html',
  styleUrls: ['./mapa-selector.component.scss'],
})
export class MapaSelectorComponent implements AfterViewInit, OnChanges {
  @Input() coordenadasIniciales: { lat: number, lng: number } | null = null;
  @Input() puntosVista: PuntoVista[] = [];
  @Output() coordenadasSeleccionadas = new EventEmitter<{ lat: number, lng: number }>();

  @Input() mostrar: boolean = false;
  @Input() mostrarPuntos: boolean = false;

  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef<HTMLDivElement>;

  private map!: google.maps.Map;
  private markers: google.maps.Marker[] = [];
  private mapaInicializado = false;

  private directionsService!: google.maps.DirectionsService;
  private directionsRenderer!: google.maps.DirectionsRenderer;

  ngAfterViewInit() {
    if (this.mostrar) {
      this.cargarGoogleMapsScript().then(() => this.inicializarMapa());
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mostrar'] && this.mostrar && !this.mapaInicializado && this.mapaContainer) {
      this.cargarGoogleMapsScript().then(() => {
        setTimeout(() => this.inicializarMapa(), 100);
      });
    }

    if (changes['puntosVista'] && this.mapaInicializado) {
      this.agregarPuntosVistaAlMapa();
      this.dibujarRutaEntrePuntos();
    }
  }

  private cargarGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).google && (window as any).google.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      //console.log('Usando API Key de Google Maps:', environment.googleMapsApiKey);
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  private limpiarMarcadores() {
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
  }

  private agregarPuntosVistaAlMapa() {
    if (!this.map || this.puntosVista.length === 0) return;

    this.limpiarMarcadores();

    const bounds = new google.maps.LatLngBounds();
    const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';

    this.puntosVista.forEach(punto => {
      const position = new google.maps.LatLng(punto.lat, punto.lng);

      const marker = new google.maps.Marker({
        position,
        map: this.map,
        icon: iconUrl,
        title: punto.nombre || ''
      });

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

    this.map.fitBounds(bounds);

    const listener = google.maps.event.addListener(this.map, 'bounds_changed', () => {
      const currentZoom = this.map.getZoom();
      if (currentZoom !== undefined && currentZoom > 15) {
        this.map.setZoom(15);
      }
      google.maps.event.removeListener(listener);
    });
  }

  private dibujarRutaEntrePuntos() {
    if (!this.directionsService || !this.directionsRenderer) return;
    if (this.puntosVista.length < 2) return;

    const origin = new google.maps.LatLng(this.puntosVista[0].lat, this.puntosVista[0].lng);
    const destination = new google.maps.LatLng(this.puntosVista[this.puntosVista.length - 1].lat, this.puntosVista[this.puntosVista.length - 1].lng);

    const waypoints = this.puntosVista.slice(1, -1).map(p => ({
      location: new google.maps.LatLng(p.lat, p.lng),
      stopover: true
    }));

    const request: google.maps.DirectionsRequest = {
      origin,
      destination,
      waypoints,
      travelMode: google.maps.TravelMode.DRIVING,
      optimizeWaypoints: true
    };

    this.directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        this.directionsRenderer.setDirections(result);
      } else {
        console.error('Error en DirectionsService:', status);
        this.directionsRenderer.set('directions', null);
      }
    });
  }

  inicializarMapa() {
    if (this.mapaInicializado || !this.mapaContainer) return;

    const coords = this.coordenadasIniciales ?? { lat: 15.4894, lng: -88.0260 };

    this.map = new google.maps.Map(this.mapaContainer.nativeElement, {
      center: coords,
      zoom: 7,
      mapTypeId: 'roadmap',
      fullscreenControl: false,
    });

    this.directionsService = new google.maps.DirectionsService();
    this.directionsRenderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: true
    });
    this.directionsRenderer.setMap(this.map);

    if (this.puntosVista.length > 0) {
      this.agregarPuntosVistaAlMapa();
      this.dibujarRutaEntrePuntos();
    } else if (this.coordenadasIniciales) {
      const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';

      this.markers = [new google.maps.Marker({
        position: coords,
        map: this.map,
        icon: iconUrl,
      })];
    }

    if (!this.mostrarPuntos) {
      this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();

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
        this.coordenadasSeleccionadas.emit({ lat, lng });
      });
    }

    const logoDiv = document.createElement('div');
    logoDiv.innerHTML = `
      <img src="https://res.cloudinary.com/dbt7mxrwk/image/upload/v1753586701/iod3sxxvwyr1sgsyjql6.png"
           alt="SIDCOP Logo"
           style="width: 60px; height: auto; position: relative; top: 20px; right: 12px" />
    `;
    this.map.controls[google.maps.ControlPosition.TOP_RIGHT].push(logoDiv);

    this.mapaInicializado = true;
    google.maps.event.trigger(this.map, 'resize');
  }
}
