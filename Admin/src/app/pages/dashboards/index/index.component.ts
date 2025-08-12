import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LocalstorageDebugComponent } from './localstorage-debug.component';

import {
  obtenerNombres,
  obtenerApellidos,
  obtenerCorreo,
  obtenerTelefono,
  obtenerCodigoUsuario,
  obtenerImagenUsuario,
  obtenerRolDescripcion,
  obtenerCargo,
  obtenerSucursal,
  esAdministrador,
  esVendedor,
  obtenerUsuarioId,
  obtenerPersonaId,
  obtenerRolId,
  obtenerCargoId,
  obtenerSucursalId,
  obtenerUsuario
} from 'src/app/core/utils/user-utils';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss']
})
export class IndexComponent implements OnInit {

  // Datos personales
  nombres: string = '';
  apellidos: string = '';
  correo: string = '';
  telefono: string = '';
  codigo: string = '';
  imagen: string = '';

  // Información de rol y ubicación
  rol: string = '';
  cargo: string = '';
  sucursal: string = '';
  usuario: string = '';


  // Flags de permisos
  esAdmin: boolean = false;
  esVendedor: boolean = false;

  // Identificadores
  usuarioId: number = 0;
  personaId: number = 0;
  rolId: number = 0;
  cargoId: number = 0;
  sucursalId: number = 0;

  ngOnInit(): void {
    this.cargarDatosSesion();
  }

  cargarDatosSesion(): void {
    // Carga todos los datos del usuario desde user-utils
    this.nombres = obtenerNombres();
    this.apellidos = obtenerApellidos();
    this.correo = obtenerCorreo();
    this.telefono = obtenerTelefono();
    this.codigo = obtenerCodigoUsuario();
    this.imagen = obtenerImagenUsuario();

    this.rol = obtenerRolDescripcion();
    this.cargo = obtenerCargo();
    this.sucursal = obtenerSucursal();
    this.usuario = obtenerUsuario();
    this.esAdmin = esAdministrador();
    this.esVendedor = esVendedor();

    this.usuarioId = obtenerUsuarioId();
    this.personaId = obtenerPersonaId();
    this.rolId = obtenerRolId();
    this.cargoId = obtenerCargoId();
    this.sucursalId = obtenerSucursalId();
  }
}
