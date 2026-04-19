import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_PATH = path.resolve(__dirname, "..", "data", "auth.json");
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "flowsense_session";

let writeChain = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function safeBase64(buffer) {
  return buffer.toString("base64url");
}

function parseBase64(value) {
  return Buffer.from(value, "base64url");
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password, digest) {
  const [salt, hash] = String(digest || "").split(":");
  if (!salt || !hash) return false;
  const incoming = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(incoming, "hex"));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanExpiredSessions(store) {
  const now = Date.now();
  Object.entries(store.sessions || {}).forEach(([tokenHash, session]) => {
    if (!session || Number(session.expiresAt) <= now) {
      delete store.sessions[tokenHash];
    }
  });
}

async function readStore() {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return {
      users: parsed.users || {},
      sessions: parsed.sessions || {},
      profiles: parsed.profiles || {},
      analyses: parsed.analyses || {},
    };
  } catch {
    return { users: {}, sessions: {}, profiles: {}, analyses: {} };
  }
}

async function writeStore(store) {
  writeChain = writeChain.then(() => fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8"));
  await writeChain;
}

export function cookieName() {
  return COOKIE_NAME;
}

export function buildSessionCookie(value) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}${secure}`;
}

export function clearSessionCookie() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}

export function parseCookies(headerValue) {
  if (!headerValue) return {};
  return String(headerValue)
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const index = pair.indexOf("=");
      if (index <= 0) return acc;
      const key = pair.slice(0, index).trim();
      const value = pair.slice(index + 1).trim();
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});
}

function createSessionToken(userId) {
  const nonce = safeBase64(crypto.randomBytes(24));
  const issuedAt = String(Date.now());
  const signature = safeBase64(
    crypto.createHmac("sha256", process.env.AUTH_JWT_SECRET || "flowsense-dev-secret")
      .update(`${userId}.${issuedAt}.${nonce}`)
      .digest()
  );

  return `${safeBase64(Buffer.from(userId, "utf8"))}.${issuedAt}.${nonce}.${signature}`;
}

function parseSessionToken(token) {
  const [encodedId, issuedAt, nonce, signature] = String(token || "").split(".");
  if (!encodedId || !issuedAt || !nonce || !signature) return null;

  const userId = parseBase64(encodedId).toString("utf8");
  const expected = safeBase64(
    crypto.createHmac("sha256", process.env.AUTH_JWT_SECRET || "flowsense-dev-secret")
      .update(`${userId}.${issuedAt}.${nonce}`)
      .digest()
  );

  const incoming = Buffer.from(signature);
  const baseline = Buffer.from(expected);
  if (incoming.length !== baseline.length) return null;
  if (!crypto.timingSafeEqual(incoming, baseline)) return null;

  return {
    userId,
    issuedAt: Number(issuedAt),
    nonce,
  };
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName || "",
    createdAt: user.createdAt,
  };
}

export async function signUpWithEmail({ email, password, displayName }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !password || password.length < 8) {
    throw new Error("Email and a password with at least 8 characters are required.");
  }

  const store = await readStore();
  const existing = Object.values(store.users).find((user) => user.email === normalizedEmail);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const userId = crypto.randomUUID();
  const user = {
    id: userId,
    email: normalizedEmail,
    displayName: String(displayName || "").trim(),
    passwordHash: hashPassword(password),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  store.users[userId] = user;
  store.profiles[userId] = {
    displayName: user.displayName,
    companyName: "",
    companyStage: "",
    organization: "",
    role: "",
    website: "",
    productUrl: "",
    relevantUrls: "",
    agentName: "",
    agentMode: "",
    agentNotes: "",
    bio: "",
    email: user.email,
    profileComplete: false,
    updatedAt: nowIso(),
  };

  await writeStore(store);
  return publicUser(user);
}

export async function signInWithEmail({ email, password }) {
  const normalizedEmail = normalizeEmail(email);
  const store = await readStore();
  const user = Object.values(store.users).find((entry) => entry.email === normalizedEmail);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw new Error("Invalid email or password.");
  }

  const token = createSessionToken(user.id);
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  store.sessions[tokenHash] = {
    userId: user.id,
    expiresAt: Date.now() + SESSION_TTL_MS,
    createdAt: nowIso(),
  };
  cleanExpiredSessions(store);
  await writeStore(store);

  return { token, user: publicUser(user) };
}

export async function findUserBySessionToken(token) {
  const parsed = parseSessionToken(token);
  if (!parsed) return null;

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const store = await readStore();
  cleanExpiredSessions(store);

  const session = store.sessions[tokenHash];
  if (!session || session.userId !== parsed.userId) {
    await writeStore(store);
    return null;
  }

  const user = store.users[session.userId];
  if (!user) return null;

  return publicUser(user);
}

export async function revokeSessionToken(token) {
  if (!token) return;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const store = await readStore();
  delete store.sessions[tokenHash];
  await writeStore(store);
}

export async function getProfileForUser(userId) {
  const store = await readStore();
  const profile = store.profiles[userId] || {};
  const user = store.users[userId];
  return {
    displayName: String(profile.displayName || user?.displayName || ""),
    companyName: String(profile.companyName || ""),
    companyStage: String(profile.companyStage || ""),
    organization: String(profile.organization || ""),
    role: String(profile.role || ""),
    website: String(profile.website || ""),
    productUrl: String(profile.productUrl || ""),
    relevantUrls: String(profile.relevantUrls || ""),
    agentName: String(profile.agentName || ""),
    agentMode: String(profile.agentMode || ""),
    agentNotes: String(profile.agentNotes || ""),
    bio: String(profile.bio || ""),
    email: user?.email || profile.email,
    photoURL: String(profile.photoURL || ""),
    profileComplete: Boolean(profile.profileComplete),
  };
}

export async function saveProfileForUser(userId, profile) {
  const store = await readStore();
  const user = store.users[userId];
  if (!user) throw new Error("User not found.");

  const normalized = {
    displayName: String(profile.displayName || "").trim(),
    companyName: String(profile.companyName || "").trim(),
    companyStage: String(profile.companyStage || "").trim(),
    organization: String(profile.organization || "").trim(),
    role: String(profile.role || "").trim(),
    website: String(profile.website || "").trim(),
    productUrl: String(profile.productUrl || "").trim(),
    relevantUrls: String(profile.relevantUrls || "").trim(),
    agentName: String(profile.agentName || "").trim(),
    agentMode: String(profile.agentMode || "").trim(),
    agentNotes: String(profile.agentNotes || "").trim(),
    bio: String(profile.bio || "").trim(),
    email: user.email,
    photoURL: String(profile.photoURL || "").trim(),
    profileComplete: Boolean(
      String(profile.displayName || "").trim() &&
      String(profile.companyName || "").trim() &&
      String(profile.website || "").trim() &&
      String(profile.productUrl || "").trim() &&
      String(profile.agentName || "").trim()
    ),
    updatedAt: nowIso(),
  };

  store.profiles[userId] = normalized;
  user.displayName = normalized.displayName || user.displayName;
  user.updatedAt = nowIso();
  store.users[userId] = user;
  await writeStore(store);
  return normalized;
}

export async function saveAnalysisForUser(userId, report, execution) {
  const store = await readStore();
  const existing = store.analyses[userId] || [];
  const cleaned = existing.filter((item) => item.id !== report.id);
  const payload = {
    ...report,
    execution: execution || null,
    createdAt: nowIso(),
  };
  store.analyses[userId] = [payload, ...cleaned].slice(0, 24);
  await writeStore(store);
  return payload;
}

export async function listAnalysesForUser(userId, max = 12) {
  const store = await readStore();
  const entries = store.analyses[userId] || [];
  return entries
    .slice()
    .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
    .slice(0, max);
}
