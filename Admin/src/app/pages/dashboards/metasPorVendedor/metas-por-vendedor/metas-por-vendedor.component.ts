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
  selector: 'app-metas-por-vendedor',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, 
    FormsModule, HttpClientModule, BreadcrumbsComponent, NgSelectModule],
  templateUrl: './metas-por-vendedor.component.html',
  styleUrl: './metas-por-vendedor.component.scss'
})
export class MetasPorVendedorComponent implements OnInit {
  breadCrumbItems = [
    { label: 'Dashboards' },
    { label: 'Metas por Vendedor', active: true }
  ];

  vendedores: any[] = [];
  metas: any[] = [];
  selectedVendedorId: number | null = null;
  selectedVendedor: any = null;
  loading = false;
  errorMsg = '';

  chartConfigs: { [metaId: number]: any } = {};
  basicRadialConfigs: { [metaId: number]: any } = {};

  ngOnInit() {
    this.cargarVendedores();
  }

  constructor(private http: HttpClient) {}

  cargarVendedores() {
    this.http.get<any[]>(`${environment.apiBaseUrl}/Vendedores/Listar`, {
      headers: { 'x-api-key': environment.apiKey }
    }).subscribe({
      next: data => {
        this.vendedores = data;
        this.vendedores.sort((a, b) => a.vend_Nombres.localeCompare(b.vend_Nombres));
        this.vendedores.map(v => {
          v.vendedorDisplay = `${v.vend_Codigo} — ${v.vend_Nombres} ${v.vend_Apellidos}`;
        });
      },
      error: () => this.errorMsg = 'Error al cargar vendedores.'
    });
  }

  onVendedorChange() {
    if (!this.selectedVendedor) {
      this.metas = [];
      return;
    }
    this.loading = true;
    this.errorMsg = '';
    
    this.http.put<any[]>(`${environment.apiBaseUrl}/Metas/ListarPorVendedor/${this.selectedVendedor.vend_Id}`, {}, {
      headers: { 'x-api-key': environment.apiKey }
      
    }).subscribe({
      next: data => {
        // console.log('metas vendedor',data);
        
        this.metas = data;
        this.metas.forEach((meta, idx) => {
          this.chartConfigs[meta.Meta_Id] = this.getMetaChartConfig(meta, idx);
          this.basicRadialConfigs[meta.Meta_Id] = this.getBasicRadialbarChartConfig(meta);
        });
        
        this.loading = false;
      },
      error: () => {
        
        this.errorMsg = 'Error al cargar metas del vendedor.';
        this.loading = false;
      }
    });
  }

  // Chart color palette
  private getChartColorsArray(colors: any) {
    colors = JSON.parse(colors);
    return colors.map(function (value: any) {
      var newValue = value.replace(" ", "");
      if (newValue.indexOf(",") === -1) {
        var color = getComputedStyle(document.documentElement).getPropertyValue(newValue);
        if (color) {
          color = color.replace(" ", "");
          return color;
        }
        else return newValue;
      } else {
        var val = value.split(',');
        if (val.length == 2) {
          var rgbaColor = getComputedStyle(document.documentElement).getPropertyValue(val[0]);
          rgbaColor = "rgba(" + rgbaColor + "," + val[1] + ")";
          return rgbaColor;
        } else {
          return newValue;
        }
      }
    });
  }

  getMetaChartConfig(meta: any, idx: number): any {
    const palette = this.getChartColorsArray('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e"]');
    const color = palette[idx % palette.length];

    let progress = 0;
    if (['CM', 'TP', 'CN', 'PE'].includes(meta.Meta_Tipo)) {
      progress = meta.ProgresoUnidades || 0;
    } else if (['IM', 'IT', 'IP', 'PC'].includes(meta.Meta_Tipo)) {
      progress = meta.ProgresoIngresos || 0;
    }
    let total = 100;
    if (['CM', 'TP', 'CN', 'PE'].includes(meta.Meta_Tipo)) {
      total = meta.Meta_Unidades || 1;
    } else if (['IM', 'IT', 'IP', 'PC'].includes(meta.Meta_Tipo)) {
      total = meta.Meta_Ingresos || 1;
    }
    let percent = ((progress / total) * 100);

    return {
      series: [percent],
      chart: {
        type: "radialBar",
        height: 180,
        offsetY: -10,
        sparkline: { enabled: true }
      },
      plotOptions: {
        radialBar: {
          startAngle: -90,
          endAngle: 90,
          track: {
            background: "#e7e7e7",
            strokeWidth: "97%",
            margin: 5,
            dropShadow: {
              enabled: true,
              top: 2,
              left: 0,
              color: "#999",
              opacity: 1,
              blur: 2,
            },
          },
          dataLabels: {
            name: { show: false },
            value: {
              offsetY: -2,
              fontSize: "14px",
              formatter: (val: any) => `${parseFloat(val).toFixed(2)}%`
            },
          },
        },
      },
      grid: { padding: { top: -10 } },
      fill: {
        type: "gradient",
        gradient: {
          shade: "light",
          shadeIntensity: 0.4,
          inverseColors: false,
          opacityFrom: 1,
          opacityTo: 1,
          stops: [0, 50, 53, 91],
        },
      },
      labels: ["Progreso"],
      colors: [color],
    };
  }

  getBasicRadialbarChartConfig(meta: any): any {
  const palette = this.getChartColorsArray('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e"]');
  // const color = palette[idx % palette.length];
  const color = palette[Math.floor(Math.random() * palette.length)];

  let progress = 0;
  if (['CM', 'TP', 'CN', 'PE'].includes(meta.Meta_Tipo)) {
    progress = meta.ProgresoUnidades || 0;
  } else if (['IM', 'IT', 'IP', 'PC'].includes(meta.Meta_Tipo)) {
    progress = meta.ProgresoIngresos || 0;
  }
  let total = 100;
  if (['CM', 'TP', 'CN', 'PE'].includes(meta.Meta_Tipo)) {
    total = meta.Meta_Unidades || 1;
  } else if (['IM', 'IT', 'IP', 'PC'].includes(meta.Meta_Tipo)) {
    total = meta.Meta_Ingresos || 1;
  }
  let percent = ((progress / total) * 100);

  return {
    series: [percent],
    chart: {
      height: 180,
      type: "radialBar",
    },
    plotOptions: {
      radialBar: {
        hollow: {
          size: "60%",
        },
        track: {
          margin:2,
          strokeWidth: '100%', // this is for the background, not the arc
        },
        dataLabels: {
          name: { 
            show: true ,
            fontSize: '14px', // change this for the name label inside the chart
            fontWeight: 600
          },
          value: {
            show: true,
            fontSize: "14px",
            formatter: (val: any) => `${parseFloat(val).toFixed(2)}%`
          }
        }
      },
    },
    // labels: [meta.Meta_Descripcion],
    labels: ["Logrado"],
    colors: [color],
  };
}

  formatearFecha(fecha: string | Date | null): string {
    if (!fecha) return 'N/A';
    const dateObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(dateObj.getTime())) return 'N/A';
    return dateObj.toLocaleString('es-HN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}