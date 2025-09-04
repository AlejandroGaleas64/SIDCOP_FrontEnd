import { Component } from '@angular/core';
import { EventService } from '../core/services/event.service';
import { RootReducerState } from '../store';
import { Store } from '@ngrx/store';
import { LayoutState } from '../../app/store/layouts/layout-reducers';
@Component({
  selector: 'app-layout',
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent {

  // layout related config
  layoutType: string = 'vertical';
  showMain: any;
  initialAppState!: LayoutState;

  constructor(private eventService: EventService, private store: Store<RootReducerState>) { }

  ngOnInit() {
    this.store.select('layout').subscribe((data) => {
      // Siempre usamos layout vertical
      document.documentElement.setAttribute('data-layout', 'vertical');
      document.documentElement.setAttribute('data-sidebar', data.SIDEBAR_COLOR);
      document.documentElement.setAttribute('data-sidebar-size', data.SIDEBAR_SIZE);
      document.documentElement.setAttribute('data-bs-theme', data.LAYOUT_MODE);
      document.documentElement.setAttribute('data-layout-width', data.LAYOUT_WIDTH);
      document.documentElement.setAttribute('data-sidebar-image', data.SIDEBAR_IMAGE);
      document.documentElement.setAttribute('data-layout-position', data.LAYOUT_POSITION);
      document.documentElement.setAttribute('data-layout-style', data.SIDEBAR_VIEW);
      document.documentElement.setAttribute('data-topbar', data.TOPBAR);
      document.documentElement.setAttribute('data-preloader', data.DATA_PRELOADER);
      document.documentElement.setAttribute('data-theme', data.LAYOUT_THEME);

      if (document.documentElement.getAttribute('data-preloader') == 'enable') {
        setTimeout(() => {
          (document.getElementById("preloader") as HTMLElement).style.opacity = "0";
          (document.getElementById("preloader") as HTMLElement).style.visibility = "hidden";
        }, 1000);
      }
    });
  }
}
