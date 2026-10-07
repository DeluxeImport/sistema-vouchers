import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIAS_CONTABLES, CLAVES_CONTADOR, GRUPOS, carpetaDe, errorCombinacion, numeracionDe } from "./config.js";

// Reglas de la estructura contable de categorias: que combinaciones de
// categoria + tipo de documento se aceptan, donde se guarda cada archivo y
// con que prefijo/contador se numera.

test("errorCombinacion: acepta un voucher con categoria contable", () => {
  assert.equal(errorCombinacion("GA_OFICINA_LUZ", null), null);
});

test("errorCombinacion: acepta un documento con categoria contable y tipo valido", () => {
  assert.equal(errorCombinacion("CV_MERCADERIA", "FACTURA"), null);
});

test("errorCombinacion: rechaza categorias anteriores para registros nuevos", () => {
  assert.notEqual(errorCombinacion("SERVICIOS_LUZ", null), null);
  assert.notEqual(errorCombinacion("FACTURA", "FACTURA"), null);
});

test("errorCombinacion: rechaza un tipo de documento desconocido", () => {
  assert.notEqual(errorCombinacion("CV_MERCADERIA", "RECIBO"), null);
});

test("errorCombinacion: transferencias entre cuentas propias solo en vouchers", () => {
  assert.equal(errorCombinacion("OTR_TRANSFERENCIAS", null), null);
  assert.notEqual(errorCombinacion("OTR_TRANSFERENCIAS", "BOLETA"), null);
});

test("carpetaDe: separa vouchers y documentos por grupo y categoria", () => {
  assert.equal(carpetaDe("GV_TIENDA_LUZ", null), "vouchers/ventas_marketing/gv_tienda_luz");
  assert.equal(carpetaDe("IMP_IGV", "FACTURA"), "documentos/factura/impuestos/imp_igv");
});

test("carpetaDe: las categorias anteriores conservan su carpeta historica", () => {
  assert.equal(carpetaDe("SFIJOS_FLETE", null), "servicios_fijos/flete");
  assert.equal(carpetaDe("BOLETA", "BOLETA"), "boleta");
});

test("numeracionDe: documentos por tipo, vouchers por categoria principal", () => {
  assert.deepEqual(numeracionDe("CV_FLETES", "FACTURA"), { clave: "FACTURA", prefijo: "FA" });
  assert.deepEqual(numeracionDe("CV_FLETES", null), { clave: "COSTO_VENTAS", prefijo: "CV" });
  // Recompras continua su contador y prefijo historicos.
  assert.deepEqual(numeracionDe("RECOMPRAS", null), { clave: "RECOMPRAS", prefijo: "RE" });
});

test("estructura: codigos y prefijos unicos, y un contador por grupo y tipo", () => {
  assert.equal(new Set(CATEGORIAS_CONTABLES).size, CATEGORIAS_CONTABLES.length);
  const prefijos = GRUPOS.map((g) => g.prefijo);
  assert.equal(new Set(prefijos).size, prefijos.length);
  assert.equal(CLAVES_CONTADOR.length, GRUPOS.length + 3);
});
