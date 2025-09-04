const usuarioId = localStorage.getItem('usuarioId');
const idUsuario = usuarioId ? parseInt(usuarioId, 10) : null; // Usa null como valor predeterminado si no hay ID

export const environment = {
  production: true,
  defaultauth: 'fakebackend', // Cambiado de 'firebase' para evitar errores de API key
  firebaseConfig: {
    apiKey: 'AIzaSyCqS9cSPrDCNSQ-Ku2kZf5DBWjPPv7hvcA',
    authDomain: 'test-demo-774f8.firebaseapp.com',
    databaseURL: 'https://test-demo-774f8-default-rtdb.firebaseio.com',
    projectId: 'test-demo-774f8',
    storageBucket: 'test-demo-774f8.appspot.com',
    messagingSenderId: '916438010670',
    appId: '1:916438010670:web:c70cf404da6c0fe7b048bf',
    measurementId: 'G-1N6FB2GG55',
  },
  //apiBaseUrl: 'https://localhost:7071', //cambiar si es necesario
  apiBaseUrl: 'http://200.59.27.115:8091', //cambiar si es necesario
  //apiBaseUrl: 'http://192.168.1.146:8091', //cambiar si es necesario
  // apiBaseUrl: 'http://sidcop.somee.com', //cambiar si es necesario

  apiKey: 'bdccf3f3-d486-4e1e-ab44-74081aefcdbc',
  usua_Id: idUsuario, // Se establecerá dinámicamente al iniciar sesión

  googleMapsApiKey: 'AIzaSyA9EK4FIVnj-VGaI_CE9T4LFSe6GSm0GZg',
};
