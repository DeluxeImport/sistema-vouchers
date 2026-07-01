import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import {
  createRequireAuth,
  type AuthUserRecord,
  type AuthUserRepository,
} from "./auth.js";
import {
  hashToken,
  type SessionRecord,
  type SessionRepository,
} from "../application/auth/sessionUseCases.js";

class FakeSessionRepository implements SessionRepository {
  sessions: SessionRecord[] = [];

  async create(data: Omit<SessionRecord, "id">): Promise<SessionRecord> {
    const session = { id: this.sessions.length + 1, ...data };
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

class FakeUserRepository implements AuthUserRepository {
  constructor(private readonly user: AuthUserRecord | null) {}

  findById(): Promise<AuthUserRecord | null> {
    return Promise.resolve(this.user);
  }
}

function createResponse() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
}

const user: AuthUserRecord = {
  id: "USR001",
  username: "usuario1",
  rol: "ADMIN",
  categoriasPermitidas: null,
  puedeSubir: true,
  puedeVerGaleria: true,
  puedeVerDashboard: true,
  puedeDescargar: true,
};

test("requireAuth rejects a valid JWT when its session has been revoked", async () => {
  const jwtSecret = "test-secret-with-enough-length";
  const token = jwt.sign({ sub: user.id, username: user.username }, jwtSecret, { expiresIn: "8h" });
  const req = { headers: { authorization: `Bearer ${token}` } } as any;
  const res = createResponse();
  let nextCalled = false;

  const requireAuth = createRequireAuth({
    jwtSecret,
    sessionRepository: new FakeSessionRepository(),
    userRepository: new FakeUserRepository(user),
  });

  await requireAuth(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { error: "Sesion expirada o revocada" });
});

test("requireAuth accepts a valid JWT only when the session exists and the user is active", async () => {
  const jwtSecret = "test-secret-with-enough-length";
  const token = jwt.sign({ sub: user.id, username: user.username }, jwtSecret, { expiresIn: "8h" });
  const sessionRepository = new FakeSessionRepository();
  sessionRepository.sessions.push({
    id: 1,
    usuarioId: user.id,
    tokenHash: hashToken(token),
    ip: "127.0.0.1",
    userAgent: "node-test",
    expiraEn: new Date(Date.now() + 60_000),
  });
  const req = { headers: { authorization: `Bearer ${token}` } } as any;
  const res = createResponse();
  let nextCalled = false;

  const requireAuth = createRequireAuth({
    jwtSecret,
    sessionRepository,
    userRepository: new FakeUserRepository(user),
  });

  await requireAuth(req, res as any, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(req.authToken, token);
  assert.equal(req.usuario.username, "usuario1");
  assert.equal(req.usuario.esAdmin, true);
});
