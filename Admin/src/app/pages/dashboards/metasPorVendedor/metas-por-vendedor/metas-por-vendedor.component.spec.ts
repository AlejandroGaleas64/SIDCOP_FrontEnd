import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetasPorVendedorComponent } from './metas-por-vendedor.component';

describe('MetasPorVendedorComponent', () => {
  let component: MetasPorVendedorComponent;
  let fixture: ComponentFixture<MetasPorVendedorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetasPorVendedorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetasPorVendedorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
