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

export interface MetadatosVoucher {
  fechaVoucher?: Date | null;
  descripcion?: string | null;
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
  fechaVoucher: Date | null;
  descripcion: string | null;
}

// Guarda la imagen en disco con la nomenclatura [ID]_[USERID]_[YYYYMMDD].[ext]
// y registra la metadata en BD.
export async function procesarYGuardar(
  archivo: ArchivoSubido,
  categoria: Categoria,
  usuarioId: string,
  ip: string,
  meta: MetadatosVoucher = {}
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
      fechaVoucher: meta.fechaVoucher ?? null,
      descripcion: meta.descripcion?.trim() || null,
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
    fechaVoucher: voucher.fechaVoucher,
    descripcion: voucher.descripcion,
  };
}

export function rutaAbsolutaVoucher(rutaRelativa: string): string {
  return path.resolve(config.storagePath, rutaRelativa);
}

// Dias que un voucher permanece en la papelera antes de borrarse para siempre.
export const DIAS_PAPELERA = 15;

// Borra el archivo fisico de un voucher (no falla si ya no existe).
export async function borrarArchivoVoucher(rutaRelativa: string): Promise<void> {
  try {
    await fs.unlink(rutaAbsolutaVoucher(rutaRelativa));
  } catch {
    /* el archivo ya no existe: ignorar */
  }
}

// Elimina definitivamente los vouchers con mas de DIAS_PAPELERA en la papelera.
export async function limpiarPapelera(): Promise<number> {
  const limite = new Date(Date.now() - DIAS_PAPELERA * 24 * 60 * 60 * 1000);
  const vencidos = await prisma.voucher.findMany({
    where: { eliminadoEn: { not: null, lt: limite } },
    select: { voucherId: true, rutaArchivo: true },
  });
  for (const v of vencidos) {
    await borrarArchivoVoucher(v.rutaArchivo);
    await prisma.voucher.delete({ where: { voucherId: v.voucherId } });
  }
  return vencidos.length;
}
