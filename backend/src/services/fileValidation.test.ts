import test from "node:test";
import assert from "node:assert/strict";
import {
  extDesdeMime,
  prepararArchivoParaGuardar,
  validarMagicBytes,
} from "./voucherService.js";

test("extDesdeMime maps electronic invoice PDFs to pdf", () => {
  assert.equal(extDesdeMime("application/pdf"), "pdf");
});

test("validarMagicBytes accepts real PDF buffers and rejects spoofed PDFs", () => {
  const pdf = Buffer.from("%PDF-1.7\ncontenido");
  const spoofed = Buffer.from("no-es-pdf");

  assert.equal(validarMagicBytes(pdf, "pdf"), true);
  assert.equal(validarMagicBytes(spoofed, "pdf"), false);
});

test("prepararArchivoParaGuardar keeps PDFs unchanged and marks them as pdf", async () => {
  const buffer = Buffer.from("%PDF-1.7\nfactura electronica");
  const preparado = await prepararArchivoParaGuardar({
    buffer,
    mimetype: "application/pdf",
    size: buffer.length,
  });

  assert.equal(preparado.ext, "pdf");
  assert.equal(preparado.buffer, buffer);
});

test("prepararArchivoParaGuardar rejects files whose content does not match the declared type", async () => {
  await assert.rejects(
    () =>
      prepararArchivoParaGuardar({
        buffer: Buffer.from("contenido falso"),
        mimetype: "application/pdf",
        size: 15,
      }),
    /El contenido del archivo no coincide/
  );
});
