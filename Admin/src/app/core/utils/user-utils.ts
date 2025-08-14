/**
 * Utilidades para manejo de datos de usuario
 */

/**
 * Obtiene el ID del usuario actual desde localStorage o environment
 * Si no está disponible, devuelve un valor predeterminado (0)
 * @returns number - ID del usuario o 0 si no está disponible
 */


export function getUserId(): number {
  
  const usuarioId = localStorage.getItem('usuarioId');
  return usuarioId ? parseInt(usuarioId, 10) : 0;
}

/**
 * Obtiene el nombre del usuario actual desde localStorage
 * @returns string - Nombre del usuario o cadena vacía si no está disponible
 */
export function getUserName(): string {
  return localStorage.getItem('nombreUsuario') || '';
}

/**
 * Obtiene el rol del usuario actual desde localStorage
 * @returns string - Rol del usuario o cadena vacía si no está disponible
 */
export function getUserRole(): string {
  return localStorage.getItem('rolUsuario') || '';
}


/**
 * Utilidades para manejo de datos del usuario desde localStorage
 */

/**
 * Obtiene el objeto del usuario actual desde localStorage
 * @returns any | null - Objeto del usuario o null si no está disponible
 */
function obtenerUsuarioActual(): any | null {
  const datosUsuario = localStorage.getItem('currentUser');
  if (!datosUsuario) return null;

  try {
    return JSON.parse(datosUsuario);
  } catch {
    return null;
  }
}

/* ========== IDs ========== */

/** ID del usuario */
export function obtenerUsuarioId(): number {
  const usuario = obtenerUsuarioActual();
  return usuario?.usua_Id || 0;
}

/** ID de la persona */
export function obtenerPersonaId(): number {
  const usuario = obtenerUsuarioActual();
  return usuario?.personaId || 0;
}

/** ID del rol */
export function obtenerRolId(): number {
  const usuario = obtenerUsuarioActual();
  return usuario?.role_Id || 0;
}

/** ID del cargo */
export function obtenerCargoId(): number {
  const usuario = obtenerUsuarioActual();
  return usuario?.carg_Id || 0;
}

/** ID de la sucursal */
export function obtenerSucursalId(): number {
  const usuario = obtenerUsuarioActual();
  return usuario?.sucu_Id || 0;
}

/* ========== Información personal ========== */

/** Usuario (nombre de usuario) */
export function obtenerUsuario(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.usua_Usuario || '';
}

/** Nombres */
export function obtenerNombres(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.nombres || '';
}

/** Apellidos */
export function obtenerApellidos(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.apellidos || '';
}

/** DNI */
export function obtenerDNI(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.dni || '';
}

/** Correo electrónico */
export function obtenerCorreo(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.correo || '';
}

/** Teléfono */
export function obtenerTelefono(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.telefono || '';
}

/** Código (ej. EMP-234) */
export function obtenerCodigoUsuario(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.codigo || '';
}

/* ========== Imágenes ========== */

/** Imagen del usuario (personal) */
export function obtenerImagenUsuario(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.imagen || '';
}

/** Imagen de la cuenta (foto de perfil del sistema) */
export function obtenerImagenCuenta(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.usua_Imagen || '';
}

/* ========== Roles y cargos ========== */

/** Descripción del rol */
export function obtenerRolDescripcion(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.role_Descripcion || '';
}

/** Nombre del cargo */
export function obtenerCargo(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.cargo || '';
}

/** Nombre de la sucursal */
export function obtenerSucursal(): string {
  const usuario = obtenerUsuarioActual();
  return usuario?.sucursal || '';
}

/* ========== Permisos booleanos ========== */

/** ¿Es vendedor? */
export function esVendedor(): boolean {
  const usuario = obtenerUsuarioActual();
  return usuario?.usua_EsVendedor || false;
}

/** ¿Es administrador? */
export function esAdministrador(): boolean {
  const usuario = obtenerUsuarioActual();
  return usuario?.usua_EsAdmin || false;
}

/** ¿Está activo? */
export function estaActivo(): boolean {
  const usuario = obtenerUsuarioActual();
  return usuario?.usua_Estado || false;
}
