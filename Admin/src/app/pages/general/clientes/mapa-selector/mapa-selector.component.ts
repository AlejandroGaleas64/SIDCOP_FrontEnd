/// <reference types="@types/google.maps" />
import {
  Component,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from 'src/environments/environment';

interface PuntoVista {
  lat: number;
  lng: number;
  nombre?: string;
}

declare const google: any;

@Component({
  standalone: true,
  selector: 'app-mapa-selector',
  imports: [CommonModule],
  templateUrl: './mapa-selector.component.html',
  styleUrl: './mapa-selector.component.scss',
})
export class MapaSelectorComponent implements AfterViewInit, OnChanges {
  @Input() coordenadasIniciales: { lat: number, lng: number } | null = null;
  @Input() puntosVista: PuntoVista[] = [];
  @Output() coordenadasSeleccionadas = new EventEmitter<{ lat: number, lng: number }>();

  @Input() mostrar: boolean = false;
  @Input() mostrarPuntos: boolean = false;
  @ViewChild('mapaContainer', { static: true }) mapaContainer!: ElementRef;

  private map!: google.maps.Map;
  private marker: google.maps.Marker | null = null;
  private mapaInicializado = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mostrar'] && this.mostrar && !this.mapaInicializado && this.mapaContainer) {
      this.cargarGoogleMapsScript().then(() => {
        setTimeout(() => this.inicializarMapa(), 100);
      });
    }

    if (changes['puntosVista'] && this.map && this.mapaInicializado) {
      this.agregarPuntosVistaAlMapa();
    }

    //Cargar marcador en el mapa en el editar
    if (this.coordenadasIniciales && this.map) {
      const position = new google.maps.LatLng(this.coordenadasIniciales.lat, this.coordenadasIniciales.lng);
      this.map.setCenter(position);
      this.map.setZoom(16); // O el zoom que prefieras
      if (this.marker) {
        this.marker.setPosition(position);
      } else {
        this.marker = new google.maps.Marker({
          position,
          map: this.map,
        });
      }
    }
  }

  ngAfterViewInit() {
    if (this.mostrar) {
      this.cargarGoogleMapsScript().then(() => this.inicializarMapa());
    }
  }

  private cargarGoogleMapsScript(): Promise<void> {
    return new Promise((resolve) => {
      if (window.google && window.google.maps) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      console.log('Usando API Key de Google Maps:', environment.googleMapsApiKey);
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.googleMapsApiKey}`;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      document.body.appendChild(script);
    });
  }

  private agregarPuntosVistaAlMapa() {
    const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
    const bounds = new google.maps.LatLngBounds();

    this.puntosVista.forEach(punto => {
      const position = new google.maps.LatLng(punto.lat, punto.lng);
      bounds.extend(position);

      const marcador = new google.maps.Marker({
        position,
        map: this.map,
        icon: iconUrl,
        title: punto.nombre || ''
      });

      if (punto.nombre) {
        const contenidoHTML = `
          <div style="font-size: 14px;">
            <h3 style="margin: 0;font-size: 20px;font-weight: 500;color: #d6b68a;">${punto.nombre}</h3>
            <p>Dirección: ${punto.lat}, ${punto.lng}</p>
          </div>
        `;
        const infoWindow = new google.maps.InfoWindow({ content: contenidoHTML });
        marcador.addListener('click', () => infoWindow.open(this.map, marcador));
      }
    });

    if (this.puntosVista.length > 0) {
      this.map.fitBounds(bounds);
    }
  }


  inicializarMapa() {
    if (this.mapaInicializado || !this.mapaContainer) return;

    const coords = this.coordenadasIniciales ?? { lat: 15.199999, lng: -86.241905 };

    this.map = new google.maps.Map(this.mapaContainer.nativeElement, {
      center: coords,
      zoom: 7,
      mapTypeId: 'roadmap',
      fullscreenControl: false,
    });

    const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';

    if (this.puntosVista.length > 0) {
      this.agregarPuntosVistaAlMapa();
    } else {
      if (this.coordenadasIniciales) {
        this.marker = new google.maps.Marker({
          position: coords,
          map: this.map,
          icon: iconUrl,
        });
      }

      if (!this.mostrarPuntos) {
        this.map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (!e.latLng) return;
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();

          if (this.marker) {
            this.marker.setPosition(e.latLng);
          } else {
            this.marker = new google.maps.Marker({
              position: e.latLng,
              map: this.map,
              icon: iconUrl,
            });
          }

          this.coordenadasSeleccionadas.emit({ lat, lng });
        });
      }
    }

    // SIDCOP logo
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

  //Buscador en el mapa
  public buscarDireccion(query: string) {
    if (!query || !this.map) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({
      address: query,
      region: 'HN', // Solo Honduras
      componentRestrictions: { country: 'HN' } // Solo Honduras
    }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        // Si hay viewport, ajusta el mapa automáticamente
        if (results[0].geometry.viewport) {
          this.map.fitBounds(results[0].geometry.viewport);
        } else {
          this.map.setCenter(location);
          this.map.setZoom(14); // Zoom razonable si no hay viewport
        }
      }
      // Opcional: puedes manejar el caso de no encontrar resultados aquí
    });
  }

  setMarker(lat: number, lng: number) {
  if (this.map) {
    const position = new google.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.map.setZoom(16); // Puedes ajustar el zoom si lo deseas

    if (this.marker) {
      this.marker.setPosition(position);
    } else {
      const iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
      this.marker = new google.maps.Marker({
        position,
        map: this.map,
        icon: iconUrl,
      });
    }
  }
}
  
}