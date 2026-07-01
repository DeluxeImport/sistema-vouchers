import test from "node:test";
import assert from "node:assert/strict";
import { generarPasswordTemporal, validarPasswordSegura } from "./authService.js";

test("generarPasswordTemporal creates non-predictable passwords that satisfy the password policy", () => {
  const first = generarPasswordTemporal();
  const second = generarPasswordTemporal();

  assert.notEqual(first, second);
  assert.notEqual(first, "Voucher2024_usuario1");
  assert.deepEqual(validarPasswordSegura(first), []);
});
