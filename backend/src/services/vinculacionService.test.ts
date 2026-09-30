import test from "node:test";
import assert from "node:assert/strict";
import { esTokenValido } from "./vinculacionService.js";

const AHORA = new Date("2026-01-01T12:00:00Z");

test("esTokenValido rechaza un token ya usado, aunque no haya vencido", () => {
  const tv = { usado: true, expiraEn: new Date("2026-01-01T12:05:00Z") };
  assert.equal(esTokenValido(tv, AHORA), false);
});

test("esTokenValido rechaza un token vencido, aunque no se haya usado", () => {
  const tv = { usado: false, expiraEn: new Date("2026-01-01T11:59:00Z") };
  assert.equal(esTokenValido(tv, AHORA), false);
});

test("esTokenValido acepta un token sin usar y vigente", () => {
  const tv = { usado: false, expiraEn: new Date("2026-01-01T12:05:00Z") };
  assert.equal(esTokenValido(tv, AHORA), true);
});

test("esTokenValido rechaza un token que vence exactamente ahora (borde inclusivo)", () => {
  const tv = { usado: false, expiraEn: AHORA };
  assert.equal(esTokenValido(tv, AHORA), false);
});
