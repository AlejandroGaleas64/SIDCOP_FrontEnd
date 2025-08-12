import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventariadoComponent } from './inventariado.component';

describe('InventariadoComponent', () => {
  let component: InventariadoComponent;
  let fixture: ComponentFixture<InventariadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventariadoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(InventariadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
