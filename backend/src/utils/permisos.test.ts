import test from "node:test";
import assert from "node:assert/strict";
import { categoriasDe, categoriasACsv, esAdmin } from "./permisos.js";

// Estas mismas funciones son las que usa el bot de Telegram (via
// GET /api/bot/usuario/:telegramUserId y POST /api/bot/vouchers) para saber
// que categorias puede ver/usar cada persona -- son las reglas de permisos
// reales del sistema, no algo propio del bot.

test("esAdmin identifica el rol ADMIN", () => {
  assert.equal(esAdmin({ rol: "ADMIN" }), true);
  assert.equal(esAdmin({ rol: "USUARIO" }), false);
});

test("categoriasDe: un admin ve todas las categorias sin importar su CSV", () => {
  const cats = categoriasDe({
    rol: "ADMIN",
    categoriasPermitidas: null,
    puedeSubir: true,
    puedeVerGaleria: true,
    puedeVerDashboard: true,
    puedeDescargar: true,
  });
  assert.ok(cats.includes("SFIJOS_FLETE"));
  assert.ok(cats.includes("COMPRAS_PROVEEDORES"));
  assert.ok(cats.length > 10);
});

test("categoriasDe: un usuario sin CSV (null o vacio) no ve ninguna categoria", () => {
  assert.deepEqual(
    categoriasDe({ rol: "USUARIO", categoriasPermitidas: null, puedeSubir: true, puedeVerGaleria: true, puedeVerDashboard: true, puedeDescargar: true }),
    []
  );
  assert.deepEqual(
    categoriasDe({ rol: "USUARIO", categoriasPermitidas: "", puedeSubir: true, puedeVerGaleria: true, puedeVerDashboard: true, puedeDescargar: true }),
    []
  );
});

test("categoriasDe: un usuario solo ve exactamente las categorias de su CSV", () => {
  const cats = categoriasDe({
    rol: "USUARIO",
    categoriasPermitidas: "SFIJOS_FLETE,COMPRAS_PROVEEDORES",
    puedeSubir: true,
    puedeVerGaleria: true,
    puedeVerDashboard: true,
    puedeDescargar: true,
  });
  assert.deepEqual(cats.sort(), ["COMPRAS_PROVEEDORES", "SFIJOS_FLETE"]);
});

test("categoriasDe: ignora categorias desconocidas y normaliza mayusculas/espacios del CSV", () => {
  const cats = categoriasDe({
    rol: "USUARIO",
    categoriasPermitidas: " sfijos_flete , NO_EXISTE ,alquiler ",
    puedeSubir: true,
    puedeVerGaleria: true,
    puedeVerDashboard: true,
    puedeDescargar: true,
  });
  assert.deepEqual(cats.sort(), ["ALQUILER", "SFIJOS_FLETE"]);
});

test("categoriasACsv: filtra categorias invalidas y quita duplicados", () => {
  const csv = categoriasACsv(["sfijos_flete", "NO_EXISTE", "sfijos_flete", "alquiler"]);
  assert.equal(csv, "SFIJOS_FLETE,ALQUILER");
});

test("categoriasACsv: un valor que no es arreglo produce CSV vacio", () => {
  assert.equal(categoriasACsv("no-es-un-arreglo"), "");
  assert.equal(categoriasACsv(undefined), "");
});
