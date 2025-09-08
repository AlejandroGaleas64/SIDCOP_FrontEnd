import { Component, Output, EventEmitter, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-details',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['metaData'] && changes['metaData'].currentValue) {
      this.cargarDetallesSimulado(changes['metaData'].currentValue);
    }
  }

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
      } catch (error) {
        console.error('Error al cargar detalles de la meta:', error);
        this.mostrarAlertaError = true;
        this.mensajeError = 'Error al cargar los detalles de la meta.';
        this.cargando = false;
      }
    }, 500); // Simula tiempo de carga
  }

  cerrar(): void {
    this.onClose.emit();
  }

  cerrarAlerta(): void {
    this.mostrarAlertaError = false;
    this.mensajeError = '';
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

  getVendedorChartConfig(vendedor: any): any {
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
  let percent = Math.round((progress / total) * 100);

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
            fontSize: "18px",
            formatter: (val: any) => `${val}%`
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
    colors: ["#D6B68A"], // or use your getChartColorsArray if you want dynamic color
  };
}
}