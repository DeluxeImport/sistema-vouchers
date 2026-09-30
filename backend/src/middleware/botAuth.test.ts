import test from "node:test";
import assert from "node:assert/strict";

// config depende de variables de entorno leidas al importar el modulo, asi
// que las fijamos antes de importar cualquier cosa que dependa de config.js.
process.env.BOT_SERVICE_TOKEN = "token-de-prueba-1234567890";

const { requireServiceToken } = await import("./botAuth.js");

function mockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = undefined;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body: unknown) => {
    res.body = body;
    return res;
  };
  return res;
}

test("requireServiceToken rechaza sin header Authorization", () => {
  const req: any = { headers: {} };
  const res = mockRes();
  let llamoNext = false;
  requireServiceToken(req, res, () => {
    llamoNext = true;
  });
  assert.equal(llamoNext, false);
  assert.equal(res.statusCode, 401);
});

test("requireServiceToken rechaza un token incorrecto", () => {
  const req: any = { headers: { authorization: "Bearer token-equivocado" } };
  const res = mockRes();
  let llamoNext = false;
  requireServiceToken(req, res, () => {
    llamoNext = true;
  });
  assert.equal(llamoNext, false);
  assert.equal(res.statusCode, 401);
});

test("requireServiceToken acepta el token de servicio correcto", () => {
  const req: any = { headers: { authorization: "Bearer token-de-prueba-1234567890" } };
  const res = mockRes();
  let llamoNext = false;
  requireServiceToken(req, res, () => {
    llamoNext = true;
  });
  assert.equal(llamoNext, true);
});
