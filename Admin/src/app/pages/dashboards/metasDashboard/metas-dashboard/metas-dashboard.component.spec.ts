import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetasDashboardComponent } from './metas-dashboard.component';

describe('MetasDashboardComponent', () => {
  let component: MetasDashboardComponent;
  let fixture: ComponentFixture<MetasDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetasDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MetasDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
