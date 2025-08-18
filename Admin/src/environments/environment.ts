// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
const usuarioId = localStorage.getItem('usuarioId');
const idUsuario = usuarioId ? parseInt(usuarioId, 10) : null; // Usa null como valor predeterminado si no hay ID

// Configuración de conexiones
const apiUrls = {
  local: 'http://192.168.1.146:8091',
  remote: 'http://200.59.27.115:8091'
};

// Función para obtener la URL base de la API
function getApiBaseUrl(): string {
  // Usamos la URL local por defecto
  // El ConnectionService se encargará de cambiar dinámicamente según disponibilidad
  return apiUrls.local;
}

export const environment = {
  production: false,
  defaultauth: 'fakebackend',
  firebaseConfig: {
    apiKey: "AIzaSyCqS9cSPrDCNSQ-Ku2kZf5DBWjPPv7hvcA",
    authDomain: "test-demo-774f8.firebaseapp.com",
    databaseURL: "https://test-demo-774f8-default-rtdb.firebaseio.com",
    projectId: "test-demo-774f8",
    storageBucket: "test-demo-774f8.appspot.com", 
    messagingSenderId: "916438010670",
    appId: "1:916438010670:web:c70cf404da6c0fe7b048bf",
    measurementId: "G-1N6FB2GG55"
  },

  // Configuración de conexiones
  apiUrls: apiUrls,
  apiBaseUrl: getApiBaseUrl(), // Valor inicial que será reemplazado por ConnectionService
  
  apiKey: 'bdccf3f3-d486-4e1e-ab44-74081aefcdbc',
  usua_Id: idUsuario,

  googleMapsApiKey: 'AIzaSyA9EK4FIVnj-VGaI_CE9T4LFSe6GSm0GZg'
};



/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
