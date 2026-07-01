import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  crearSesion,
  hashToken,
  revocarSesionesDeUsuario,
  validarSesionActiva,
  type SessionRepository,
  type SessionRecord,
} from "./sessionUseCases.js";

class FakeSessionRepository implements SessionRepository {
  private nextId = 1;
  sessions: SessionRecord[] = [];

  async create(data: Omit<SessionRecord, "id">): Promise<SessionRecord> {
    const session = { id: this.nextId++, ...data };
    this.sessions.push(session);
    return session;
  }

  async findValidByTokenHash(tokenHash: string, usuarioId: string, now: Date): Promise<SessionRecord | null> {
    return this.sessions.find((s) => s.tokenHash === tokenHash && s.usuarioId === usuarioId && s.expiraEn > now) ?? null;
  }

  async deleteByTokenHash(tokenHash: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.tokenHash !== tokenHash);
  }

  async deleteManyByUserId(usuarioId: string, exceptTokenHash?: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.usuarioId !== usuarioId || s.tokenHash === exceptTokenHash);
  }
}

test("hashToken hashes tokens deterministically without exposing the raw token", () => {
  const token = "jwt-token-value";
  const hash = hashToken(token);

  assert.equal(hash, hashToken(token));
  assert.notEqual(hash, token);
  assert.match(hash, /^[a-f0-9]{64}$/);
});

test("hashToken preserves the legacy session hash format used by existing sessions", () => {
  const token = "Mixed.Case.Jwt";
  const legacyHash = crypto.createHash("sha256").update(token.trim().toUpperCase()).digest("hex");

  assert.equal(hashToken(token), legacyHash);
});

test("validarSesionActiva accepts only persisted non-expired sessions for the token user", async () => {
  const repo = new FakeSessionRepository();
  const now = new Date("2026-07-01T10:00:00.000Z");
  const token = "valid.jwt.token";

  await crearSesion(repo, {
    usuarioId: "USR001",
    token,
    ip: "127.0.0.1",
    userAgent: "node-test",
    now,
  });

  assert.ok(await validarSesionActiva(repo, token, "USR001", now));
  assert.equal(await validarSesionActiva(repo, "missing.jwt.token", "USR001", now), null);
  assert.equal(await validarSesionActiva(repo, token, "USR002", now), null);
  assert.equal(await validarSesionActiva(repo, token, "USR001", new Date("2026-07-01T19:00:01.000Z")), null);
});

test("revocarSesionesDeUsuario removes previous sessions while preserving the current token when requested", async () => {
  const repo = new FakeSessionRepository();
  const now = new Date("2026-07-01T10:00:00.000Z");

  await crearSesion(repo, { usuarioId: "USR001", token: "old-token", now });
  await crearSesion(repo, { usuarioId: "USR001", token: "current-token", now });
  await crearSesion(repo, { usuarioId: "USR002", token: "other-user-token", now });

  await revocarSesionesDeUsuario(repo, "USR001", "current-token");

  assert.deepEqual(
    repo.sessions.map((s) => s.tokenHash),
    [hashToken("current-token"), hashToken("other-user-token")]
  );
}
);
