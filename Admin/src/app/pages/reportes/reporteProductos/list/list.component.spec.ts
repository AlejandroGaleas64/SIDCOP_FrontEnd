import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteProductosComponent } from './list.component';

describe('ReporteProductosComponent', () => {
  let component: ReporteProductosComponent;
  let fixture: ComponentFixture<ReporteProductosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteProductosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteProductosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
