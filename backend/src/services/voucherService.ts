import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { prisma } from "../db.js";
import { config, PREFIJOS, CARPETAS, type Categoria } from "../config.js";

// Generacion atomica del siguiente ID secuencial por categoria.
// El contador nunca se reinicia ni se reutiliza.
export async function generarVoucherId(categoria: Categoria): Promise<string> {
  const contador = await prisma.contador.update({
    where: { categoria },
    data: { ultimoNumero: { increment: 1 } },
  });
  const numero = String(contador.ultimoNumero).padStart(5, "0");
  return `${PREFIJOS[categoria]}${numero}`;
}

function fechaYYYYMMDD(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function extDesdeMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
  };
  return map[mime] ?? "jpg";
}

export interface ArchivoSubido {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export interface ResultadoCarga {
  voucherId: string;
  usuarioId: string;
  categoria: Categoria;
  nombreArchivo: string;
  rutaArchivo: string;
  tamanoBytes: number;
  formato: string;
  fechaCarga: Date;
}

// Guarda la imagen en disco con la nomenclatura [ID]_[USERID]_[YYYYMMDD].[ext]
// y registra la metadata en BD.
export async function procesarYGuardar(
  archivo: ArchivoSubido,
  categoria: Categoria,
  usuarioId: string,
  ip: string
): Promise<ResultadoCarga> {
  const voucherId = await generarVoucherId(categoria);
  let ext = extDesdeMime(archivo.mimetype);
  const carpeta = CARPETAS[categoria];
  const dir = path.resolve(config.storagePath, carpeta);
  await fs.mkdir(dir, { recursive: true });

  const nombreArchivo = `${voucherId}_${usuarioId}_${fechaYYYYMMDD()}.${ext}`;
  const rutaAbs = path.join(dir, nombreArchivo);

  let buffer = archivo.buffer;
  // Compresion del lado del servidor para imagenes grandes (>5MB), excepto HEIC.
  if (ext !== "heic" && archivo.size > 5 * 1024 * 1024) {
    buffer = await sharp(archivo.buffer)
      .resize({ width: 2000, withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
  }
  await fs.writeFile(rutaAbs, buffer);

  const rutaRelativa = path.join(carpeta, nombreArchivo).replace(/\\/g, "/");

  const voucher = await prisma.voucher.create({
    data: {
      voucherId,
      usuarioId,
      categoria,
      nombreArchivo,
      rutaArchivo: rutaRelativa,
      tamanoBytes: buffer.length,
      formato: ext,
      ipCarga: ip,
    },
  });

  return {
    voucherId: voucher.voucherId,
    usuarioId: voucher.usuarioId,
    categoria: voucher.categoria as Categoria,
    nombreArchivo: voucher.nombreArchivo,
    rutaArchivo: voucher.rutaArchivo,
    tamanoBytes: voucher.tamanoBytes ?? buffer.length,
    formato: voucher.formato ?? ext,
    fechaCarga: voucher.fechaCarga,
  };
}

export function rutaAbsolutaVoucher(rutaRelativa: string): string {
  return path.resolve(config.storagePath, rutaRelativa);
}
