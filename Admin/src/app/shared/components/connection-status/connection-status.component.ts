import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConnectionService } from 'src/app/core/services/connection.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-connection-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="connection-status-container">
      <div class="connection-status-indicator">
        <div
          class="status-dot"
          [ngClass]="{
            active: isLocalActive,
            available: isLocalAvailable,
            unavailable: !isLocalAvailable
          }"
        ></div>
        <span class="status-text">Local</span>
      </div>
      <div class="connection-status-indicator">
        <div
          class="status-dot"
          [ngClass]="{
            active: isRemoteActive,
            available: isRemoteAvailable,
            unavailable: !isRemoteAvailable
          }"
        ></div>
        <span class="status-text">Remoto</span>
      </div>
    </div>
  `,
  styles: [
    `
      .connection-status-container {
        display: flex;
        align-items: center;
        gap: 15px;
        padding: 5px 10px;
        background-color: rgba(0, 0, 0, 0.05);
        border-radius: 4px;
      }
      .connection-status-indicator {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .status-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        transition: all 0.3s ease;
      }
      .status-dot.available {
        background-color: #4caf50;
      }
      .status-dot.unavailable {
        background-color: #f44336;
      }
      .status-dot.active {
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
        transform: scale(1.2);
      }
      .status-text {
        font-size: 12px;
        color: #555;
      }
    `,
  ],
})
export class ConnectionStatusComponent implements OnInit, OnDestroy {
  isLocalAvailable = false;
  isRemoteAvailable = false;
  isLocalActive = false;
  isRemoteActive = false;

  private subscription: Subscription | null = null;

  constructor(private connectionService: ConnectionService) {}

  ngOnInit(): void {
    // Verificar el estado inicial
    this.updateConnectionStatus();

    // Suscribirse a cambios en la URL activa
    this.subscription = this.connectionService.currentApiUrl$.subscribe(
      (url) => {
        this.isLocalActive = url === 'http://192.168.1.146:8091';
        this.isRemoteActive = url === 'http://192.168.1.146:8091';
      }
    );

    // Suscribirse a cambios en el estado de las conexiones
    this.connectionService.localStatus$.subscribe((status) => {
      this.isLocalAvailable = status;
    });

    this.connectionService.remoteStatus$.subscribe((status) => {
      this.isRemoteAvailable = status;
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private updateConnectionStatus(): void {
    const status = this.connectionService.getConnectionStatus();
    this.isLocalAvailable = status.local;
    this.isRemoteAvailable = status.remote;
    this.isLocalActive = status.activeUrl === 'http://192.168.1.146:8091';
    this.isRemoteActive = status.activeUrl === 'http://192.168.1.146:8091';
  }
}
