import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { CATEGORIAS, CLAVES_CONTADOR } from "../src/config.js";

const prisma = new PrismaClient();

// Solo se asegura la cuenta ADMIN de arranque (usuario1). El resto de
// usuarios los crea el admin desde el panel /admin. Asi un reinicio no
// resucita usuarios que el admin haya eliminado.
const USUARIOS = [
  { id: "USR001", nombre: "Administrador", username: "usuario1", rol: "ADMIN" },
];

async function main() {
  // Contadores secuenciales: uno por categoria principal y uno por tipo de documento.
  for (const categoria of CLAVES_CONTADOR) {
    await prisma.contador.upsert({
      where: { categoria },
      update: {},
      create: { categoria, ultimoNumero: 0 },
    });
  }

  // Usuarios con contrasena por defecto Voucher2024_[username]
  for (const u of USUARIOS) {
    const passwordPlano = `Voucher2024_${u.username}`;
    const passwordHash = await bcrypt.hash(passwordPlano, 12);
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
    console.log(`Usuario ${u.username} (${u.rol}) -> contrasena por defecto: ${passwordPlano}`);
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
