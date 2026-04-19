import {
  buildSessionCookie,
  clearSessionCookie,
  cookieName,
  findUserBySessionToken,
  parseCookies,
  revokeSessionToken,
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
} from "../services/authStore.js";
import { sendJsonError } from "../utils/http.js";

export async function signUp(req, res) {
  try {
    const user = await signUpWithEmail({
      email: req.body?.email,
      password: req.body?.password,
      displayName: req.body?.displayName,
    });

    const session = await signInWithEmail({
      email: req.body?.email,
      password: req.body?.password,
    });

    res.setHeader("Set-Cookie", buildSessionCookie(session.token));
    res.status(201).json({ user, session: { authenticated: true } });
  } catch (error) {
    sendJsonError(res, 400, error instanceof Error ? error.message : "Unable to create account.");
  }
}

export async function signIn(req, res) {
  try {
    const session = await signInWithEmail({
      email: req.body?.email,
      password: req.body?.password,
    });

    res.setHeader("Set-Cookie", buildSessionCookie(session.token));
    res.json({ user: session.user, session: { authenticated: true } });
  } catch (error) {
    sendJsonError(res, 401, error instanceof Error ? error.message : "Authentication failed.");
  }
}

export async function signOut(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[cookieName()];
  if (token) {
    await revokeSessionToken(token);
  }

  res.setHeader("Set-Cookie", clearSessionCookie());
  res.json({ ok: true });
}

export async function authSession(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[cookieName()];
  if (!token) {
    res.status(401).json({ authenticated: false });
    return;
  }

  const user = await findUserBySessionToken(token);
  if (!user) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(401).json({ authenticated: false });
    return;
  }

  res.json({ authenticated: true, user });
}

export async function requireAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[cookieName()];
  if (!token) {
    sendJsonError(res, 401, "Authentication required.");
    return;
  }

  const user = await findUserBySessionToken(token);
  if (!user) {
    res.setHeader("Set-Cookie", clearSessionCookie());
    sendJsonError(res, 401, "Session expired. Please sign in again.");
    return;
  }

  req.user = user;
  next();
}

export async function googleAuth(req, res) {
  try {
    const { googleId, email, displayName, photoURL, idToken } = req.body || {};

    // Validate required fields
    if (!googleId || !email) {
      throw new Error("Google ID and email are required.");
    }

    // In production, you should verify the ID token against Google's servers
    // For now, we trust the frontend's JWT validation
    // TODO: Implement server-side token verification with Google's API

    const session = await signInWithGoogle({
      googleId,
      email,
      displayName,
      photoURL,
    });

    res.setHeader("Set-Cookie", buildSessionCookie(session.token));
    res.status(200).json({
      user: session.user,
      session: { authenticated: true },
    });
  } catch (error) {
    sendJsonError(res, 401, error instanceof Error ? error.message : "Google sign-in failed.");
  }
}
