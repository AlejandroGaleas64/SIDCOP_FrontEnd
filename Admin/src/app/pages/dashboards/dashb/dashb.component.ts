import { Component, Inject, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbsComponent } from 'src/app/shared/breadcrumbs/breadcrumbs.component';
import { environment } from '../../../../environments/environment.prod';
import { getUserId, getUserName, getUserRole } from '../../../core/utils/user-utils';

import { DecimalPipe } from '@angular/common';
import * as ApexCharts from 'apexcharts';
import { Store } from '@ngrx/store';
// import { fetchfeedbackdataData, fetchpropertydataData, fetchrentproprtydataData, fetchsalepropertydataData } from 'src/app/store/RealEstate/realEstate.action';
// import { selectData, selectfeedData, selectrentData, selectsaleData } from 'src/app/store/RealEstate/realEstate-selector';

import { NgApexchartsModule } from 'ng-apexcharts';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { getFullYear, getMonth } from 'ngx-bootstrap/chronos';



@Component({
  selector: 'app-dashb',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, FormsModule, BreadcrumbsComponent],
  templateUrl: './dashb.component.html',
  styleUrl: './dashb.component.scss'
})

export class DashbComponent implements OnInit {

  http = inject(HttpClient);
  chart: any;
  ventasPorMesData: any[] = [];
  vendedoresPorMesData: any[] = [];
  aniosSelect: number[] = [];
  anioSeleccionado: number = 2025;
  barraMesSelected: any;
  mesNumeroSelected: number = new Date().getMonth() + 1; 

  categoriaSelected: any = null;
  categoriasddl: any[] = [];
  productosCategoriasData: any[] = [];

  vendedormesesddl: any[] = [];
  vendedormesSelected = {
        Mes: new Date().getMonth() + 1,
        Anio: 2025,
        MesNombre: "Agosto"
      };
  
      

  graficocategorias: boolean = false;
  categoriasdata: any[] = [];
  simpleDonutChart: any;
  multipleRadialbarChart: any;
  simplePieChart: any;
  customDataLabelsChart: any;

  

  totalrevenueChart: any;

   // Datos de usuario
  usuarioId: string | number = '';
  nombreUsuario: string = '';
  rolUsuario: string = '';
  ultimoAcceso: Date | null = null;
  
  // Datos de entorno
  apiUrl: string = '';
  authMode: string = '';
  appVersion: string = '';
  isProd: boolean = false;
  entorno: string = '';

  constructor(private cdr: ChangeDetectorRef,private ngZone: NgZone) 
  {
  }

  ngOnInit(): void {
    this.cargardatosCategoriasList();
    
    this.cargarDatosSesion();
    this.cargardatos();

    this._simpleDonutChart('["--tb-primary", "--tb-success", "--tb-warning", "--tb-danger", "--tb-info"]');
    this._multipleRadialbarChart('["--tb-primary", "--tb-success", "--tb-warning", "--tb-danger"]');
    this._simplePieChart('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e" ]');
    this._customDataLabelsChart('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e" ]');

    // this._totalrevenueChart('["--table table-gridjs"]');
    // this.chart = new ApexCharts(document.querySelector(".apex-charts"), this.totalrevenueChart);
  }

  private shuffleArray<T>(array: T[]): T[] {
  return array
    .map(value => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
  }

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

  private _totalrevenueChart(colors: any) {
    colors = this.getChartColorsArray(colors);
    
  const dataForYear = this.ventasPorMesData.filter(item => item.Anio == this.anioSeleccionado);
  
  dataForYear.sort((a, b) => a.MesNumero - b.MesNumero);

  

    this.totalrevenueChart = {
      series: [{
        name: 'Cantidad de Ventas',
        data: dataForYear.map(item => item.Cantidad || 0)
        // this.ventasPorMesData.filter(item => item.Anio == this.anioSeleccionado ).map(item => item.Cantidad || 0) 
        // data: [26, 24.65, 18.24, 29.02, 23.65, 27, 21.18, 24.65, 27.32, 25, 24.65, 29.32]

      }],
      chart: {
        
        type: 'bar',
        height: 328,
        stacked: true,
        toolbar: {
          show: true,
          export: {
            csv: {
            headerCategory: 'Mes',
            }
          },

        },
        events: {
          dataPointSelection: (event: any, chartContext: any, config: any) => {
            // info about the clicked bar
            const seriesIndex = config.seriesIndex;
            const dataPointIndex = config.dataPointIndex;
            const value = config.w.globals.initialSeries[seriesIndex].data[dataPointIndex];
            // const category = config.w.globals.categoryLabels[dataPointIndex];

            this.barraMesSelected = dataForYear[dataPointIndex]; // or any other property

            const category = config.w.globals.labels[dataPointIndex];
            
            this.onBarClick(category, value);
          }
        }
        
      },
      plotOptions: {
        bar: {
          columnWidth: '80%',
          borderRadius: 5
        },
      },
      grid: {
        padding: {
          left: 0,
          right: 0,
          top: 0,
          bottom: 0
        }
      },
      colors: colors,
      fill: {
        opacity: 1
      },
      dataLabels: {
        enabled: false,
        textAnchor: 'top',
      },
      yaxis: {
        title: {
          text: 'Cantidad de Ventas',
          style: {
            fontWeight: 600
          }
        },
        labels: {
          show: true,
          formatter: function (y: any) {
            return y.toFixed(0) + "  ";
          }
        },
      },
      legend: {
        show: false,
        position: 'top',
        horizontalAlign: 'right',
      },
      xaxis: {
        title: {
          text: 'Meses',
          style: {
            fontWeight: 600
          }
        },
        categories: dataForYear.map(item => item.MesNombre),
        // this.ventasPorMesData.filter(item => item.Anio === this.anioSeleccionado).map(item => item.MesNombre ),
        // categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        labels: {
          rotate: -90
        },
        axisTicks: {
          show: true,
        },
        axisBorder: {
          show: true,
          stroke: {
            width: 10
          },
        },
      }
    }
    // const attributeToMonitor = 'data-theme';

    // const observer = new MutationObserver(() => {
    //   this._totalrevenueChart('["--tb-primary"]');
    // });
    // observer.observe(document.documentElement, {
    //   attributes: true,
    //   attributeFilter: [attributeToMonitor]
    // });
  }

  private _simpleDonutChart(colors: any) {
    colors = this.getChartColorsArray(colors);
    this.simpleDonutChart = {
      series: this.categoriasdata.map(item => item.Cantidad),
      
      labels: this.categoriasdata.map(item => item.Categoria) ,
      chart: {
        height: 300,
        type: "donut",
      },
      legend: {
        position: "bottom",
      },
      dataLabels: {
        dropShadow: {
          enabled: false,
        },
      },
      colors: colors,
      tooltip: {
      y: {
        formatter: (val: number, opts: any) => {
          // opts contains info about the hovered slice
          const label = opts.w.globals.labels[opts.seriesIndex];
          // You can access more data from this.categoriasdata if needed
          return `${label}: ${val} compras`;
        }
      }
    }
    };


    const attributeToMonitor = 'data-theme';

    const observer = new MutationObserver(() => {
      this._simpleDonutChart('["--tb-primary", "--tb-success", "--tb-warning", "--tb-danger", "--tb-info"]');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [attributeToMonitor]
    });
  }

  private _multipleRadialbarChart(colors: any) {

    colors = this.getChartColorsArray(colors);

    let colorArr = Array.isArray(colors) ? colors : JSON.parse(colors);
    colorArr = this.shuffleArray(colorArr);
    colors = colorArr;

    this.multipleRadialbarChart = {
      series: this.categoriasdata.map(item => parseFloat( (item.Cantidad/this.barraMesSelected.Cantidad * 100).toFixed(2)) ),      
      chart: {
        height: 350,
        type: "radialBar",
      },
      plotOptions: {
        radialBar: {
          dataLabels: {
            name: {
              fontSize: "22px",
            },
            value: {
              fontSize: "16px",
            },
            total: {
              show: true,
              label: "Total",
              formatter: 
              (w: any) =>{
                return this.barraMesSelected.Cantidad
              }
            },
          },
        },
      },
      legend: {
        position: "bottom",
        show: true,
        formatter: (seriesName: string, opts: any) => {
        // opts.seriesIndex gives you the index of the current legend item
        const cantidad = this.categoriasdata[opts.seriesIndex]?.Cantidad ?? '';
        return `${seriesName}: ${cantidad}`;
      }
      },
      dataLabels: {
        dropShadow: {
          enabled: true,
        },
      },
      labels: this.categoriasdata.map(item => item.Categoria),
      colors: colors,
      tooltip: {
      y: {
        formatter: (val: number, opts: any) => {
          // opts contains info about the hovered slice
          const label = opts.w.globals.labels[opts.seriesIndex];
          // You can access more data from this.categoriasdata if needed
          return `${label}: ${val} ventas`;
        }
      }
    }
    };

    const attributeToMonitor = 'data-theme';

    const observer = new MutationObserver(() => {
     this._multipleRadialbarChart('["--tb-primary", "--tb-success", "--tb-warning", "--tb-danger"]');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [attributeToMonitor]
    });
  }

  private _simplePieChart(colors: any) {
    colors = this.getChartColorsArray(colors);
    let colorArr = Array.isArray(colors) ? colors : JSON.parse(colors);
    colorArr = this.shuffleArray(colorArr);
    colors = colorArr;

    this.simplePieChart = {
      series: this.productosCategoriasData.map(item => item.Cantidad) ,
      chart: {
        height: 300,
        type: "pie",
      },
      labels: this.productosCategoriasData.map(item => item.Producto) ,
      legend: {
        position: "bottom",
      },
      dataLabels: {
        dropShadow: {
          enabled: false,
        },
      },
      colors: colors,
    };


    const attributeToMonitor = 'data-theme';

    const observer = new MutationObserver(() => {
      this._simplePieChart('["--tb-primary", "--tb-success", "--tb-warning", "--tb-danger", "--tb-info"]');
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [attributeToMonitor]
    });
  }

  private _customDataLabelsChart(colors: any) {
    colors = this.getChartColorsArray(colors);

    let colorArr = Array.isArray(colors) ? colors : JSON.parse(colors);
    colorArr = this.shuffleArray(colorArr);
    colors = colorArr;

    this.customDataLabelsChart = {
      series: [{
        data: this.vendedoresPorMesData.map(item => item.Cantidad || 0),
      },],
      chart: {
        type: "bar",
        height: 285,
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        bar: {
          barHeight: "100%",
          distributed: true,
          horizontal: true,
          dataLabels: {
            position: "center",
          },
        },
      },
      colors: colors,
      dataLabels: {

        enabled: true,
        textAnchor: "middle",
        
        style: {
          colors: ["#ffffffff"],
          
        },
        formatter: function (val: any, opt: any) {
          return val;
          // opt.w.globals.labels[opt.dataPointIndex] + ":  " + 
          
        },
        offsetX: 0,
        dropShadow: {
          enabled: true,
          color: '#000000ff', // dark gray shadow
          top: 0,
          left: 0,
          blur: 2,
          opacity: 1
        },
      },
      stroke: {
        width: 1,
        colors: ["#fff"],
      },
      xaxis: {
        categories: this.vendedoresPorMesData.map(item => item.Vendedor),
      },
      yaxis: {
        labels: {
          show: false,
        },
      },
      // title: {
      //   text: "Top 5 Vendedores Del Mes",
      //   align: "center",
      //   floating: true,
      //   style: {
      //     fontWeight: 600,
      //   },
      // },
      // subtitle: {
      //   text: "Category Names as DataLabels inside bars",
      //   align: "center",
      // },
      tooltip: {
        theme: "dark",
        x: {
          show: false,
        },
        y: {
          title: {
            formatter: function () {
              return "";
            },
          },
        },
      },
    };
  }

  private cargardatos(): void {
      // this.mostrarOverlayCarga = true;
      this.http.get(`${environment.apiBaseUrl}/Dashboards/VentasPorMes`, {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe({
        next: data => {

          console.log('Datos de ventas por mes:', data);
          
          // console.log('añong', new Date().getFullYear());
          this.ventasPorMesData = data as any[];

          
          this.anioSeleccionado = this.ventasPorMesData.sort((a, b) => b.Anio - a.Anio)[0]?.Anio;
          this.aniosSelect = this.ventasPorMesData.map(item => item.Anio)
                                  .filter((anio, index, self) => self.indexOf(anio) === index);
          console.log('añong22', this.anioSeleccionado);

          

          
          this._totalrevenueChart('["--table table-gridjs"]');

          this.vendedormesesddl = this.ventasPorMesData
                                  .filter(item => item.Anio === getFullYear(new Date() ) )
                                  .map(item => ({ Mes: item.Mes, MesNombre: item.MesNombre, Anio: item.Anio }))
                                  .sort((a, b) => a.Mes - b.Mes);

          this.vendedormesSelected = this.vendedormesesddl.filter(
            item => item.Mes == getMonth(new Date()) +1
            
          )[0];   

          console.log("meses month: ", getMonth(new Date()) )

          // this.vendedormesSelected.MesNombre = this.vendedormesesddl.filter(
          //   item => item.Mes === getMonth(new Date())
          // ).map(item => item.MesNombre)[0];   
          
          console.log('mes seleccionado', this.vendedormesSelected);

          // this.chart = new ApexCharts(document.querySelector(".apex-charts"), this.totalrevenueChart);
          // this.chart.render();          


          // this.chart.updateOptions(this.totalrevenueChart);
          // this.ventasPorMesData = data as any[];


          this.cargardatosVendedoresMes();
        },
        error: error => {
          console.error('Error al cargar roles:', error);
          
        }
      });
    }

    private cargardatosCategorias(): void {
      // this.mostrarOverlayCarga = true;
      const apibody: any = {
        mes: this.barraMesSelected.Mes,
        anio: this.barraMesSelected.Anio,
        cate_Id: 0
      };

      this.http.post(`${environment.apiBaseUrl}/Dashboards/VentasPorMesCategorias`, 
        apibody,
        {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe({
        next: data => {

          console.log('Datos de ventas por mes:', data);
          this.categoriasdata = data as any[];
          
          this._simpleDonutChart('["--tb-primary", "--tb-warning", "--tb-success", "--tb-danger", "--tb-info"]');
          // this._multipleRadialbarChart('["--tb-primary", "--tb-success", "--tb-warning", "--tb-danger"]');
          this._multipleRadialbarChart('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e" ]');
          
          this.graficocategorias = true;
        },
        error: error => {
          console.error('Error al cargar categorias:', error);
          
        }
      });
    }

    cargardatosCategoriasList(): void {

      this.http.get(`${environment.apiBaseUrl}/Categorias/Listar`, 
        {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe({
        next: data => {

          console.log('Datos de categorias list:', data);
          this.categoriasddl = data as any[];

        },
        error: error => {
          console.error('Error al listar cate:', error);
          
        }
      });
    }

    cargardatosProductosCategorias(): void {
      // this.mostrarOverlayCarga = true;
      const apibody: any = {
        mes: 0,
        anio: 2025,
        cate_Id: this.categoriaSelected.cate_Id
      };

      this.http.post(`${environment.apiBaseUrl}/Dashboards/TopProductosPorCategoria`, 
        apibody,
        {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe({
        next: data => {

          console.log('productos cate', data);
          this.productosCategoriasData = data as any[];
          
          this._simplePieChart('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e" ]');
          
        },
        error: error => {
          console.error('Error al cargar categorias:', error);
          
        }
      });
    }

    cargardatosVendedoresMes(): void {
      // this.mostrarOverlayCarga = true;
      const apibody: any = {
        mes: this.mesNumeroSelected,
        anio: 2025,
        cate_Id: 0
      };

      console.log('mes enviando', apibody);

      this.http.post(`${environment.apiBaseUrl}/Dashboards/TopVendedoresPorMes`, 
        apibody,
        {
        headers: { 'x-api-key': environment.apiKey }
      }).subscribe({
        next: data => {

          console.log('Datos de vendedore por mes:', data);
          this.vendedoresPorMesData = data as any[];
          
          this._customDataLabelsChart('["#14192e", "#29142e", "#2e2914", "#192e14", "#2e1c14", "#262e14", "#2e1419", "#142e1c", "#1c142e", "#14262e" ]');
          
        },
        error: error => {
          console.error('Error al cargar vendedores:', error);
          
        }
      });
    }

  cargarDatosSesion(): void {
    // Obtener datos del usuario usando las funciones de utilidad
    const userId = getUserId();
    this.usuarioId = userId > 0 ? userId : 'No disponible';
    this.nombreUsuario = getUserName() || 'No disponible';
    this.rolUsuario = getUserRole() || 'No disponible';
    
    const ultimoAccesoStr = localStorage.getItem('ultimoAcceso');
    if (ultimoAccesoStr) {
      try {
        this.ultimoAcceso = new Date(ultimoAccesoStr);
      } catch (e) {
        this.ultimoAcceso = new Date();
      }
    } else {
      this.ultimoAcceso = new Date();
    }

    // Obtener datos del entorno
    this.apiUrl = environment.apiBaseUrl || 'No configurada';
    this.authMode = environment.defaultauth || 'No configurado';
    this.appVersion = '1.0.0'; // Versión de la aplicación
    
    // Determinar si estamos en producción
    const isProduction = window.location.hostname !== 'localhost' && 
                        !window.location.hostname.includes('127.0.0.1');
    this.isProd = isProduction;
    this.entorno = isProduction ? 'Producción' : 'Desarrollo';
  }

  cambioAnio(): void {
    
    this._totalrevenueChart('["--table table-gridjs"]');
    // this.chart = new ApexCharts(document.querySelector(".apex-charts"), this.totalrevenueChart);
    // this.chart.updateptions(this.totalrevenueChart);

    console.log('ventas meses luego', this.ventasPorMesData);
    
  }
  changeVendedorMes(){
    this.mesNumeroSelected = this.vendedormesSelected.Mes;
    console.log('mes seleccionado cambio', this.mesNumeroSelected);
    this.cargardatosVendedoresMes();

  }

  onBarClick(category: string, value: any) {
  // Do something with the clicked bar info
    console.log('Clicked bar:', category, value);
    console.log('Barra seleccionada:', this.barraMesSelected);
    // this.graficocategorias = true;

    this.ngZone.run(() => {
      this.cargardatosCategorias();
      // this.graficocategorias = true;
      this.cdr.detectChanges();
    });
    
    
}

}

