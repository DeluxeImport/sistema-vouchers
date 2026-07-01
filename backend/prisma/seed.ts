import { PrismaClient } from "@prisma/client";
import { generarPasswordTemporal, hashPassword } from "../src/services/authService.js";

const prisma = new PrismaClient();

const CATEGORIAS = ["COMPRAS", "RECOMPRAS", "SERVICIOS", "ALQUILER", "NOTA", "FACTURA", "BOLETA"];

// Solo se asegura la cuenta ADMIN de arranque (usuario1). El resto de
// usuarios los crea el admin desde el panel /admin. Asi un reinicio no
// resucita usuarios que el admin haya eliminado.
const USUARIOS = [
  { id: "USR001", nombre: "Administrador", username: "usuario1", rol: "ADMIN" },
];

async function main() {
  // Contadores secuenciales por categoria
  for (const categoria of CATEGORIAS) {
    await prisma.contador.upsert({
      where: { categoria },
      update: {},
      create: { categoria, ultimoNumero: 0 },
    });
  }

  // Usuarios con contrasena temporal aleatoria, impresa solo al crearse.
  for (const u of USUARIOS) {
    const passwordPlano = generarPasswordTemporal();
    const passwordHash = await hashPassword(passwordPlano);
    const esAdmin = u.rol === "ADMIN";
    await prisma.usuario.upsert({
      where: { id: u.id },
      // update vacio: no pisar cambios que el admin haga luego desde el panel.
      update: {},
      create: {
        id: u.id,
        nombre: u.nombre,
        username: u.username,
        passwordHash,
        rol: u.rol,
        // Admin: null = todas. Usuario normal: todas por defecto.
        categoriasPermitidas: esAdmin ? null : CATEGORIAS.join(","),
        debeCambiar: true,
        totpActivo: false,
      },
    });
    console.log(`Usuario ${u.username} (${u.rol}) -> contrasena temporal: ${passwordPlano}`);
  }

  console.log("\nSeed completado.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
