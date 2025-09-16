import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { environment } from 'src/environments/environment.prod';

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
  templateUrl: './metas-dashboard.component.html',
  styleUrl: './metas-dashboard.component.scss'
})
export class MetasDashboardComponent implements OnInit {
  // ...existing code...
  breadCrumbItems = [
    { label: 'Ventas' },
    { label: 'Metas', active: true }
  ];

  metas: any[] = [];
  selectedMeta: any | null = null;
  vendedores: any[] = [];
  loading = false;
  errorMsg = '';
  chart: any | null = null;
  filterText = '';

  // cache configs per meta id to avoid recalculation & re-render
  private chartCache: { [metaId: number]: any } = {};

  // keep same palette used elsewhere
  private paletteJson = '["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e"]';

  // meta type display map (icons/colors follow existing patterns)
  metaTipoMap: any = {
    IT: { text: 'Ingresos Totales', icon: 'ri-money-dollar-circle-line', color: '#0d6efd' },
    IM: { text: 'Ingresos Manuales', icon: 'ri-edit-box-line', color: '#6f42c1' },
    IP: { text: 'Ingresos por Producto', icon: 'ri-bar-chart-2-line', color: '#198754' },
    PC: { text: 'Productos por Categoría (Ingresos)', icon: 'ri-apps-2-line', color: '#fd7e14' },
    TP: { text: 'Total Productos', icon: 'ri-shopping-bag-3-line', color: '#0dcaf0' },
    CN: { text: 'Clientes Nuevos', icon: 'ri-user-add-line', color: '#6610f2' },
    PE: { text: 'Producto Específico (Cant.)', icon: 'ri-price-tag-3-line', color: '#d63384' },
    CM: { text: 'Cantidades Manuales', icon: 'ri-edit-2-line', color: '#6c757d' }
  };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadMetas();
  }

  private getChartColorsArray(colors: any): string[] {
    try {
      const arr = typeof colors === 'string' ? JSON.parse(colors) : colors;
      return arr.map((value: string) => {
        const v = (value || '').trim();
        // if css var
        if (v.startsWith('--')) {
          const computed = getComputedStyle(document.documentElement).getPropertyValue(v);
          return computed ? computed.trim() : v;
        }
        return v;
      });
    } catch {
      return [];
    }
  }

  loadMetas(): void {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiBaseUrl}/Metas/ListarCompleto`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: data => {
        this.metas = Array.isArray(data) ? data : [];
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'Error al cargar metas.';
        this.loading = false;
      }
    });
  }

  onMetaChange(): void {
    this.filterText = '';
    this.chart = null;

    if (!this.selectedMeta) {
      this.vendedores = [];
      return;
    }

    // parse vendedoresJson safely (API returns string)
    try {
      const raw = this.selectedMeta.vendedoresJson;
      console.log('Metas:', this.metas);
      console.log('Selected Meta:', this.selectedMeta);
      console.log('Raw vendedoresJson:', raw);
      this.vendedores = JSON.parse(raw);
      console.log('Parsed vendedores:', this.vendedores);
    } catch {
      this.vendedores = [];
    }

    // normalize field names (some components use different casing)
    this.vendedores = this.vendedores.map((v: any) => ({
      Vend_Id: v.Vend_Id ?? v.Vend_Id ?? v.vend_Id ?? v.vendId,
      Vend_NombreCompleto: v.Vend_NombreCompleto ?? v.Vend_Nombre ?? v.nombre ?? v.Vend_NombreCompleto,
      MeEm_ProgresoIngresos: Number(v.MeEm_ProgresoIngresos ?? v.ProgresoIngresos ?? v.meem_progresosIngresos ?? 0),
      MeEm_ProgresoUnidades: Number(v.MeEm_ProgresoUnidades ?? v.ProgresoUnidades ?? v.meem_progresoUnidades ?? 0)
    }));

    // build or reuse cached config
    const metaId = Number(this.selectedMeta.meta_Id ?? this.selectedMeta.metaId);
    if (this.chartCache[metaId]) {
      // clone cached (so template change detection safe) and apply filter
      this.chart = structuredClone(this.chartCache[metaId]);
      this.applyFilterToChart();
    } else {
      this.buildChartConfig();
      // cache after built
      if (this.chart) this.chartCache[metaId] = structuredClone(this.chart);
    }
  }

  private applyFilterToChart(): void {
    if (!this.chart || !this.vendedores) return;

    const filtered = this.filteredVendedores();
    const objetivo = this.getObjetivo();
    const isIngresos = this.isIngresosTipo();

    // series are percent values; datalabels/tooltips formatter will show actual values
    const seriesData = filtered.map(v => {
      const actual = isIngresos ? v.MeEm_ProgresoIngresos : v.MeEm_ProgresoUnidades;
      const pct = objetivo ? (actual / objetivo) * 100 : 0;
      return Math.round((pct + Number.EPSILON) * 100) / 100;
    });

    const categories = filtered.map(v => v.Vend_NombreCompleto);

    // update chart object used by template
    this.chart.series = [{ name: isIngresos ? 'Ingresos' : 'Unidades', data: seriesData }];
    // keep xaxis max 100
    this.chart.xaxis.categories = categories;
    this.chart.yaxis = { labels: { style: { fontSize: '13px' } } };
    // create colors distributed for each bar
    const palette = this.getChartColorsArray(this.paletteJson);
    const colors = filtered.map((_, i) => palette[i % palette.length]);
    this.chart.colors = colors;
    // store actual values on chart for tooltip/datapoints reference
    this.chart._actualValues = filtered.map(v => isIngresos ? v.MeEm_ProgresoIngresos : v.MeEm_ProgresoUnidades);
  }

  private filteredVendedores(): any[] {
    if (!this.filterText?.trim()) return this.vendedores;
    const q = this.filterText.trim().toLowerCase();
    return this.vendedores.filter(v => (v.Vend_NombreCompleto || '').toLowerCase().includes(q));
  }

  private isIngresosTipo(): boolean {
    const tipo = (this.selectedMeta?.meta_Tipo ?? '').toString();
    return ['IM', 'IT', 'IP', 'PC'].includes(tipo);
  }

  private getObjetivo(): number {
    if (!this.selectedMeta) return 1;
    return this.isIngresosTipo()
      ? Number(this.selectedMeta.meta_Ingresos ?? this.selectedMeta.metaIngresos ?? 0) || 1
      : Number(this.selectedMeta.meta_Unidades ?? this.selectedMeta.metaUnidades ?? 0) || 1;
  }

  private buildChartConfig(): void {
    if (!this.selectedMeta) return;
    const isIngresos = this.isIngresosTipo();
    const objetivo = this.getObjetivo();

    const filtered = this.filteredVendedores();
    const categories = filtered.map(v => v.Vend_NombreCompleto);
    const palette = this.getChartColorsArray(this.paletteJson);
    const colors = filtered.map((_, i) => palette[i % palette.length]);

    // series values are percent (0..100) so xaxis max = 100
    const seriesData = filtered.map(v => {
      const actual = isIngresos ? v.MeEm_ProgresoIngresos : v.MeEm_ProgresoUnidades;
      const pct = objetivo ? (actual / objetivo) * 100 : 0;
      return Math.round((pct + Number.EPSILON) * 100) / 100;
    });

    this.chart = {
      // keep original actual values for tooltip formatting
      _actualValues: filtered.map(v => isIngresos ? v.MeEm_ProgresoIngresos : v.MeEm_ProgresoUnidades),

      series: [{ name: isIngresos ? 'Ingresos' : 'Unidades', data: seriesData }],
      chart: {
        height: 520,
        type: 'bar',
        toolbar: { show: false },
        animations: { enabled: false } // reduce re-render animations
      },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          barHeight: '60%',
          borderRadius: 6
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
          const idx = opts.dataPointIndex;
          const actual = this.chart?._actualValues?.[idx] ?? 0;
          if (isIngresos) {
            return `${Number(actual).toLocaleString('es-HN', { style: 'currency', currency: 'HNL', maximumFractionDigits: 2 })} (${val.toFixed(1)}%)`;
          } else {
            return `${Number(actual).toLocaleString('es-HN')} (${val.toFixed(1)}%)`;
          }
        },
        style: { fontSize: '13px', fontWeight: 600, colors: ['#ffffff'] },
        background: { enabled: false }
      },
      colors: colors,
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: '#333' }
      },
      tooltip: {
        enabled: true,
        y: {
          formatter: (val: number, opts: any) => {
            const idx = opts.dataPointIndex;
            const actual = this.chart?._actualValues?.[idx] ?? 0;
            if (isIngresos) {
              return `${Number(actual).toLocaleString('es-HN', { style: 'currency', currency: 'HNL', maximumFractionDigits: 2 })} (${val.toFixed(1)}%)`;
            } else {
              return `${Number(actual).toLocaleString('es-HN')} (${val.toFixed(1)}%)`;
            }
          },
          title: {
            formatter: (seriesName: string, opts: any) => {
              // show vendedor name as title
              const idx = opts.dataPointIndex;
              return this.chart?.xaxis?.categories?.[idx] ?? '';
            }
          }
        }
      },
      grid: { borderColor: '#f1f1f1' },
      xaxis: {
        categories: [], // categories are shown on yaxis for horizontal bars; keep for compatibility
        max: 100,
        labels: {
          formatter: (val: number) => `${val}%`,
          style: { fontSize: '13px', fontWeight: 600 }
        },
        title: {
          text: 'Porcentaje (%)',
          style: { fontSize: '13px', fontWeight: 600 }
        }
      },
      yaxis: {
        categories: categories,
        labels: { style: { fontSize: '13px', fontWeight: 600 } }
      }
    };
  }

  onFilterChange(): void {
    // rebuild only the displayed data from cache or build new
    if (!this.selectedMeta) return;
    // if cached config exists, reuse structure and replace data
    const metaId = Number(this.selectedMeta.meta_Id ?? this.selectedMeta.metaId);
    if (this.chartCache[metaId]) {
      this.chart = structuredClone(this.chartCache[metaId]);
    }
    this.applyFilterToChart();
  }

  getMetaTipoText(tipo: string): string {
    return this.metaTipoMap[tipo]?.text ?? tipo;
  }
  getMetaTipoIcon(tipo: string): string {
    return this.metaTipoMap[tipo]?.icon ?? 'ri-flag-2-line';
  }
  getMetaTipoColor(tipo: string): string {
    return this.metaTipoMap[tipo]?.color ?? '#0d6efd';
  }

  formatDate(value: string | null): string {
    if (!value) return 'N/A';
    const d = new Date(value);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('es-HN');
  }
  // ...existing code...
}