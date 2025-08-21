import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ConnectionService } from './core/services/connection.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'SIDCOP';

  constructor(
    private router: Router,
    private connectionService: ConnectionService
  ) {}

  ngOnInit() {
    // Verificar la conexión cuando cambie de página
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.connectionService.forceConnectionCheck().subscribe();
    });
  }
}
