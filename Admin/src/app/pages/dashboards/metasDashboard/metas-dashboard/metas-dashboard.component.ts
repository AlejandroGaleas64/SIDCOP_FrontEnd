import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from 'src/environments/environment.prod';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { NgSelectModule } from '@ng-select/ng-select';

import localeEsHN from '@angular/common/locales/es-HN';
import { registerLocaleData } from '@angular/common';
registerLocaleData(localeEsHN, 'es-HN');

@Component({
  selector: 'app-metas-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    NgSelectModule,
    NgApexchartsModule,
    BreadcrumbsComponent
  ],
  templateUrl: './metas-dashboard.component.html'
})
export class MetasDashboardComponent implements OnInit {
  breadCrumbItems = [
    { label: 'Dashboards' },
    { label: 'Dashboard de Metas', active: true }
  ];

  metas: any[] = [];
  vendedores: any[] = [];
  selectedMeta: any = null;
  loading = false;
  errorMsg = '';
  chartOptions: any = null;
  filterText = '';

  private readonly colorPalette = [
    "#14192e", "#29142e", "#2e2914", "#192e14", 
    "#2e1c14", "#262e14", "#2e1419", "#142e1c", 
    "#1c142e", "#14262e"
  ];

  tiposMeta = [
    { value: 'IT', text: 'Ingresos Totales', icon: 'ri-money-dollar-circle-line' },
    { value: 'IM', text: 'Ingresos Manuales', icon: 'ri-edit-box-line' },
    { value: 'IP', text: 'Ingresos por Producto', icon: 'ri-bar-chart-2-line' },
    { value: 'PC', text: 'Productos por Categoría', icon: 'ri-apps-2-line' },
    { value: 'TP', text: 'Total Productos', icon: 'ri-shopping-bag-3-line' },
    { value: 'CN', text: 'Clientes Nuevos', icon: 'ri-user-add-line' },
    { value: 'PE', text: 'Producto Específico', icon: 'ri-price-tag-3-line' },
    { value: 'CM', text: 'Cantidades Manuales', icon: 'ri-edit-2-line' }
  ];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMetas();
  }

  loadMetas(): void {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Metas/ListarCompleto`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: (data) => {
        this.metas = data;
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Error al cargar metas';
        this.loading = false;
      }
    });
  }

  onMetaChange(): void {
    this.filterText = '';
    this.chartOptions = null;
    
    if (!this.selectedMeta) {
      this.vendedores = [];
      return;
    }

    try {
      this.vendedores = JSON.parse(this.selectedMeta.vendedoresJson || '[]');
      this.buildChartOptions();
    } catch {
      this.vendedores = [];
    }
  }

  private buildChartOptions(): void {
    if (!this.selectedMeta || !this.vendedores.length) return;

    const filtered = this.filterVendedores();
    const tipo = this.selectedMeta.meta_Tipo;
    const isIngresos = ['IM', 'IT', 'IP', 'PC'].includes(tipo);
    const objetivo = isIngresos ? this.selectedMeta.meta_Ingresos : this.selectedMeta.meta_Unidades;

    const actualValues = filtered.map(v => 
      isIngresos ? v.MeEm_ProgresoIngresos : v.MeEm_ProgresoUnidades
    );
    const percentValues = actualValues.map(val => 
      objetivo ? Math.min((val / objetivo) * 100, 100) : 0
    );
    const categories = filtered.map(v => v.Vend_NombreCompleto);

    // Calculate dynamic height based on number of items with minimum height
    const itemHeight = 40; // Height per bar
    const minHeight = 350; // Minimum chart height
    const calculatedHeight = Math.max(minHeight, filtered.length * itemHeight);

    this.chartOptions = {
      series: [{
        name: isIngresos ? 'Ingresos' : 'Unidades',
        data: actualValues
      }],
      chart: {
        height: calculatedHeight,
        type: "bar",
        toolbar: { show: false },
        fontFamily: 'inherit',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          barHeight: '32', // Fixed bar height
          distributed: true,
          borderRadius: 4,
          dataLabels: {
            position: 'center'
          }
        }
      },
      colors: this.colorPalette,
      // dataLabels: {
      //   enabled: true,
      //   formatter: (val: number, opts: any) => {
      //     const percent = objetivo ? (val / objetivo) * 100 : 0;
      //     if (isIngresos) {
      //       return `${val.toLocaleString('es-HN', { 
      //         style: 'currency', 
      //         currency: 'HNL',
      //         maximumFractionDigits: 2 
      //       })} (${percent.toFixed(1)}%)`;
      //     }
      //     return `${val.toLocaleString('es-HN')} (${percent.toFixed(1)}%)`;
      //   },
      //   style: {
      //     fontSize: '13px',
      //     fontWeight: 500,
      //     colors: ['#fff']
      //   },
      //   background: {
      //     enabled: true,
      //     foreColor: '#14192e',
      //     padding: 4,
      //     borderRadius: 2,
      //     borderWidth: 1,
      //     borderColor: 'rgba(255,255,255,0.2)',
      //     opacity: 0.9,
      //   },
      //   textAnchor: 'middle'
      // },
      
      // In buildChartOptions(), update the dataLabels configuration:
dataLabels: {
  enabled: true,
  formatter: (val: number, opts: any) => {
    const percent = objetivo ? (val / objetivo) * 100 : 0;
    if (isIngresos) {
      return `${val.toLocaleString('es-HN', { 
        style: 'currency', 
        currency: 'HNL',
        maximumFractionDigits: 2 
      })} (${percent.toFixed(1)}%)`;
    }
    return `${val.toLocaleString('es-HN')} (${percent.toFixed(1)}%)`;
  },
  style: {
    fontSize: '13px',
    fontWeight: 700,
    colors: ['#fff'],
    textShadow: `
      -2px -2px 0 #14192e,
       2px -2px 0 #14192e,
      -2px  2px 0 #14192e,
       2px  2px 0 #14192e,
      -2.5px 0 0 #14192e,
       2.5px 0 0 #14192e,
       0 -2.5px 0 #14192e,
       0 2.5px 0 #14192e
    `
  },
  background: {
    enabled: false
  },
  textAnchor: 'middle',
  position: 'center',
  offsetY: 0
},


      xaxis: {
        categories: categories,
        max: objetivo,
        labels: {
          formatter: (val: number) => {
            if (isIngresos) {
              return val.toLocaleString('es-HN', {
                style: 'currency',
                currency: 'HNL',
                maximumFractionDigits: 0
              });
            }
            return val.toLocaleString('es-HN');
          },
          style: {
            colors: this.colorPalette[0],
            fontSize: '13px',
            fontWeight: 500
          }
        },
        title: {
          text: isIngresos ? 'Ingresos' : 'Unidades',
          style: {
            color: this.colorPalette[0],
            fontSize: '14px',
            fontWeight: 600
          }
        }
      },
      yaxis: {
        labels: {
          style: {
            colors: this.colorPalette[0],
            fontSize: '13px',
            fontWeight: 500
          }
        }
      },
      grid: {
        borderColor: '#f1f1f1',
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
        padding: { left: 10, right: 10 }
      },
      tooltip: {
        theme: 'light',
        style: { fontSize: '13px' },
        y: {
          formatter: (val: number) => {
            const percent = objetivo ? (val / objetivo) * 100 : 0;
            if (isIngresos) {
              return `${val.toLocaleString('es-HN', {
                style: 'currency',
                currency: 'HNL',
                
                minimumFractionDigits: 2
              })} (${percent.toFixed(1)}%)`;
            }
            return `${val.toLocaleString('es-HN')} (${percent.toFixed(1)}%)`;
          }
        }
      }
    };
  }

  private filterVendedores(): any[] {
    if (!this.filterText?.trim()) return this.vendedores;
    return this.vendedores.filter(v => 
      v.Vend_NombreCompleto?.toLowerCase().includes(this.filterText.toLowerCase())
    );
  }

  onFilterChange(): void {
    this.buildChartOptions();
  }

  getMetaTipo(tipo: string): any {
    return this.tiposMeta.find(t => t.value === tipo) || { 
      value: tipo, 
      text: tipo,
      icon: 'ri-flag-2-line'
    };
  }

  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}