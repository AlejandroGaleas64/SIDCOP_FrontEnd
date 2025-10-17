import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';
import { ApexChart, ApexNonAxisChartSeries, ApexPlotOptions, ApexFill, ApexDataLabels, ApexStroke, ApexGrid } from 'ng-apexcharts';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule],
  templateUrl: './details.component.html',
  styleUrl: './details.component.scss'
})
export class DetailsComponent implements OnChanges {
  @Input() metaData: any = null;
  @Output() onClose = new EventEmitter<void>();

  metaDetalle: any = null;
  cargando = false;

  mostrarAlertaError = false;
  mensajeError = '';

  vendedoresParsed: any[] = [];
  vendedorCharts: { [vendId: number]: any } = {};
  filterVendedor: string = '';

  /**
   * Lifecycle hook: reacciona a cambios en los inputs.
   * Cuando cambia metaData, recarga detalles y gráficos por vendedor.
   * @param changes Cambios detectados por Angular.
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metaData'] && changes['metaData'].currentValue) {
      this.cargarDetallesSimulado(changes['metaData'].currentValue);
    }
  }

  /**
   * Lista derivada de vendedores filtrada por nombre completo.
   */
  get vendedoresFiltrados(): any[] {
    if (!this.filterVendedor) return this.vendedoresParsed;
    const filter = this.filterVendedor.toLowerCase();
    return this.vendedoresParsed.filter(v =>
      (v.Vend_NombreCompleto || '').toLowerCase().includes(filter)
    );
  }

  /**
   * Simula la carga de detalles de meta y construye la configuración de gráficos por vendedor.
   * @param data Objeto de meta a detallar.
   */
  cargarDetallesSimulado(data: any): void {
    this.cargando = true;
    this.mostrarAlertaError = false;

    setTimeout(() => {
      try {
        this.metaDetalle = { ...data };
        this.cargando = false;
        // Parse vendedoresJson if present
        if (typeof this.metaDetalle.vendedoresJson === 'string') {
          this.vendedoresParsed = JSON.parse(this.metaDetalle.vendedoresJson);
        } else if (Array.isArray(this.metaDetalle.vendedoresJson)) {
          this.vendedoresParsed = this.metaDetalle.vendedoresJson;
        } else {
          this.vendedoresParsed = [];
        }

        this.vendedorCharts = {};
        for (const v of this.vendedoresParsed) {
          this.vendedorCharts[v.Vend_Id] = this.getVendedorChartConfig(v);
        }
        
      } catch (error) {
        console.error('Error al cargar detalles de la meta:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la meta.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  /**
   * Emite evento de cierre hacia el componente padre.
   */
  cerrar(): void {
    this.onClose.emit();
  }

  /**
   * Oculta y limpia la alerta de error.
   */
  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
  }

  /**
   * Formatea fecha a 'es-HN' para mostrar en UI.
   * @param fecha Fecha como string o Date.
   * @returns Fecha formateada o 'N/A'.
   */
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

  /**
   * Resuelve y normaliza colores desde variables CSS o valores hex/rgba declarados.
   * @param colors JSON de colores.
   */
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
        else return newValue;;
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

  /**
   * Construye la configuración de ApexCharts radial para un vendedor según tipo de meta.
   * @param vendedor Objeto vendedor con progreso.
   * @returns Configuración de gráfico radial.
   */
  getVendedorChartConfig(vendedor: any): any {


    const colorsarray = this.getChartColorsArray('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e" ]');
    const color = colorsarray[Math.floor(Math.random() * colorsarray.length)];


  // Decide which progress to use based on metaDetalle.meta_Tipo
  let progress = 0;
  if (['CM', 'TP', 'CN', 'PE'].includes(this.metaDetalle.meta_Tipo)) {
    progress = vendedor.MeEm_ProgresoUnidades || 0;
    // If you want percentage, calculate it here (e.g., progress / metaDetalle.meta_Unidades * 100)
  } else if (['IM', 'IT', 'IP', 'PC'].includes(this.metaDetalle.meta_Tipo)) {
    progress = vendedor.MeEm_ProgresoIngresos || 0;
    // If you want percentage, calculate it here (e.g., progress / metaDetalle.meta_Ingresos * 100)
  }

  // Calculate percentage if you want a percent chart
  let total = 100;
  if (['CM', 'TP', 'CN', 'PE'].includes(this.metaDetalle.meta_Tipo)) {
    total = this.metaDetalle.meta_Unidades || 1;
  } else if (['IM', 'IT', 'IP', 'PC'].includes(this.metaDetalle.meta_Tipo)) {
    total = this.metaDetalle.meta_Ingresos || 1;
  }
  let percent = ((progress / total) * 100);

  // Use your _semiCircleChart logic, but return a new object for each vendedor
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
            // formatter: (val: any) => `${val}%`
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
    // colors: ["#D6B68A"], // or use your getChartColorsArray if you want dynamic color
    colors: [color],
  };
}
}