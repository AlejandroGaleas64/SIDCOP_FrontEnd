import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MapaSelectorComponent } from './mapa-selector.component';

describe('MapaSelectorComponent', () => {
  let component: MapaSelectorComponent;
  let fixture: ComponentFixture<MapaSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaSelectorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapaSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
