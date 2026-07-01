import type { UsuarioConPermisos } from "../../utils/permisos.js";

export interface AuthUserRecord extends UsuarioConPermisos {
  id: string;
  username: string;
  rol: string;
}

export interface AuthUserRepository {
  findById(id: string): Promise<AuthUserRecord | null>;
}
