const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Node.js 18+ — built-in AbortSignal.timeout (replaces node-fetch@2's internal timeout which is unreliable)
const FETCH_TIMEOUT_MS = 20_000;

exports.corsProxy = functions.https.onRequest(async (req, res) => {
  // Set CORS headers on EVERY response path so the browser gets a valid CORS response even on errors
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.status(400).json({ error: "Missing 'url' query parameter" });
    return;
  }

  // Only allow specific domains for security
  const allowedDomains = [
    "www.clchungary.com",
    "clchungary.com",
    "bookline.hu",
    "www.bookline.hu",
    "moly.hu",
    "www.moly.hu",
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (!allowedDomains.includes(parsedUrl.hostname)) {
    res.status(403).json({ error: "Domain not allowed" });
    return;
  }

  try {
    const response = await fetch(targetUrl, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });

    if (!response.ok) {
      res
        .status(502)
        .json({ error: `Upstream returned ${response.status}` });
      return;
    }

    const html = await response.text();
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (error) {
    console.error("Proxy fetch error:", error.message);

    // Distinguish timeout from other errors
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      res.status(504).json({ error: "Upstream request timed out" });
    } else {
      res.status(502).json({ error: "Failed to fetch target URL" });
    }
  }
});

// ===== Invite Email Function =====
// Triggers when a new invite document is created in the RTDB.
// Sends a registration link email to the invited person.

async function sendInviteEmailHandler(snap, context) {
  const invite = snap.val();
  const inviteId = context.params.inviteId;

  // Only send email for invites in "pending" status
  if (!invite || invite.status !== "pending") {
    console.log(`Invite ${inviteId}: skipping — status is not pending`);
    return null;
  }

  const { email, token, invitedByName } = invite;
  if (!email || !token) {
    console.error(`Invite ${inviteId}: missing email or token`);
    await snap.ref.update({ status: "email_failed", error: "Missing email or token" });
    return null;
  }

  const smtpConfig = functions.config().smtp;
  if (!smtpConfig || !smtpConfig.host || !smtpConfig.user) {
    console.warn("SMTP not configured — invite will work but no email will be sent. Set via: firebase functions:config:set smtp.host=... smtp.user=... smtp.pass=... smtp.from='Omega Könyvek <email>'");
    // Leave invite as "pending" — it's still valid, the admin can share the link manually
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: parseInt(smtpConfig.port) || 587,
    secure: parseInt(smtpConfig.port) === 465,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  // Detect staging vs production from the database ref path
  // Staging trigger: staging/invites/{inviteId} → use teszt subdomain
  const refPath = snap.ref.toString();
  const isStaging = refPath.includes("/staging/");
  const baseUrl = isStaging ? "https://teszt.omegakonyvek.hu" : "https://omegakonyvek.hu";
  const inviteLink = `${baseUrl}/accept-invite?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;
  const inviterName = invitedByName || "Egy adminisztrátor";

  const mailOptions = {
    from: smtpConfig.from || `"Omega Könyvek" <${smtpConfig.user}>`,
    to: email,
    subject: "Meghívás az Omega Könyvekbe",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #F6F8FD; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #3741A8; padding: 32px 24px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Üdvözlünk az Omega Könyvekben!</h2>
        </div>
        <div style="padding: 24px;">
          <p style="color: #1e293b; font-size: 15px; line-height: 1.6;">${inviterName} meghívott Téged, hogy csatlakozz az Omega Könyvek csapatához <strong>szolgálóként</strong>.</p>
          <p style="color: #1e293b; font-size: 15px; line-height: 1.6;">A regisztráció befejezéséhez kattints az alábbi gombra:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${inviteLink}"
               style="background-color: #3741A8; color: white; padding: 14px 36px;
                      text-decoration: none; border-radius: 8px; font-size: 16px;
                      font-weight: 600; display: inline-block;">
              Regisztráció Befejezése
            </a>
          </div>
          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            Ha a gomb nem működik, másold ki az alábbi linket a böngésződbe:<br/>
            <a href="${inviteLink}" style="color: #3741A8;">${inviteLink}</a>
          </p>
          <p style="color: #64748b; font-size: 13px;">
            Ez a meghívó 7 napig érvényes.
          </p>
        </div>
        <div style="border-top: 1px solid #C2C7E6; padding: 16px 24px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            Omega Könyvek
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Invite email sent to ${email} (invite: ${inviteId})`);
    await snap.ref.update({ status: "sent" });
  } catch (error) {
    console.error(`Failed to send invite email to ${email}:`, error.message);
    await snap.ref.update({ status: "email_failed", error: error.message });
  }

  return null;
}

// Production trigger: invites/{inviteId}
exports.sendInviteEmail = functions.database.ref("invites/{inviteId}")
  .onCreate(sendInviteEmailHandler);

// Staging trigger: staging/invites/{inviteId}
exports.sendInviteEmailStaging = functions.database.ref("staging/invites/{inviteId}")
  .onCreate(sendInviteEmailHandler);

// ===== Invite Validation & Acceptance (Callable Functions) =====
// These provide secure invite token validation without exposing the invites/ node
// to unauthenticated clients. Admin SDK bypasses all security rules.

/**
 * Validates an invite token and email combination.
 * Unauthenticated — called from the AcceptInvite page before login.
 *
 * @param {object} data — { token: string, email: string }
 * @returns { valid: boolean, status?: string, email?: string }
 */
exports.validateInvite = functions.https.onCall(async (data) => {
  const { token, email } = data;
  if (!token || !email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Token and email are required.",
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Search a given invites node for a matching token+email
  const checkPath = async (path) => {
    const snapshot = await admin.database().ref(path).once("value");
    const invites = snapshot.val();
    if (!invites) return null;
    for (const [, inv] of Object.entries(invites)) {
      if (
        inv.token === token &&
        inv.email.toLowerCase() === normalizedEmail
      ) {
        return { status: inv.status, email: inv.email };
      }
    }
    return null;
  };

  // Try production first, then staging
  let result = await checkPath("invites");
  if (!result) {
    result = await checkPath("staging/invites");
  }

  if (!result) {
    return { valid: false };
  }

  if (result.status === "accepted") {
    return { valid: false, status: "accepted", email: result.email };
  }

  if (result.status === "expired") {
    return { valid: false, status: "expired", email: result.email };
  }

  // "pending" or "sent" — both are still valid
  return { valid: true, status: result.status, email: result.email };
});

/**
 * Marks an invite as accepted. Requires authentication — the caller must
 * be the user who just registered with the invited email.
 *
 * @param {object} data — { token: string, email: string }
 * @returns { success: boolean }
 */
exports.acceptInvite = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to accept an invite.",
    );
  }

  const { token, email } = data;
  if (!token || !email) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Token and email are required.",
    );
  }

  // Verify the caller's email matches the invite email
  const callerEmail = (context.auth.token.email || "").toLowerCase();
  const normalizedEmail = email.trim().toLowerCase();
  if (callerEmail !== normalizedEmail) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Email mismatch.",
    );
  }

  // Find and update the invite (check both paths)
  const findAndAccept = async (path) => {
    const snapshot = await admin.database().ref(path).once("value");
    const invites = snapshot.val();
    if (!invites) return false;
    for (const [id, inv] of Object.entries(invites)) {
      if (
        inv.token === token &&
        inv.email.toLowerCase() === normalizedEmail &&
        inv.status !== "accepted" &&
        inv.status !== "expired"
      ) {
        await admin.database().ref(`${path}/${id}`).update({
          status: "accepted",
          acceptedAt: new Date().toISOString(),
        });
        return true;
      }
    }
    return false;
  };

  let updated = await findAndAccept("invites");
  if (!updated) {
    updated = await findAndAccept("staging/invites");
  }

  if (!updated) {
    throw new functions.https.HttpsError(
      "not-found",
      "Invite not found or already accepted.",
    );
  }

  return { success: true };
});

// ===== Delete User Account (Callable Function) =====
// Requires authentication + admin role. Deletes the Firebase Auth account
// AND the RTDB record in a single server-side operation.

/**
 * Deletes a user's Firebase Auth account and RTDB record.
 * Caller must be authenticated and have role === "admin".
 *
 * @param {object} data — { uid: string }
 * @returns { success: boolean }
 */
exports.deleteUserAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to delete a user.",
    );
  }

  const { uid } = data;
  if (!uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "User UID is required.",
    );
  }

  // Prevent self-deletion
  if (context.auth.uid === uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "You cannot delete your own account.",
    );
  }

  // Verify the caller is an admin — check both prod and staging paths
  const callerUid = context.auth.uid;
  let isAdmin = false;

  const prodRoleSnap = await admin.database().ref(`users/${callerUid}/role`).once("value");
  if (prodRoleSnap.val() === "admin") {
    isAdmin = true;
  }

  if (!isAdmin) {
    const stagingRoleSnap = await admin.database().ref(`staging/users/${callerUid}/role`).once("value");
    if (stagingRoleSnap.val() === "admin") {
      isAdmin = true;
    }
  }

  if (!isAdmin) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Only administrators can delete users.",
    );
  }

  // Delete the Firebase Auth account
  try {
    await admin.auth().deleteUser(uid);
    console.log(`Auth account deleted: ${uid}`);
  } catch (authError) {
    // auth/user-not-found — Auth account already deleted, RTDB record remains.
    // This is not an error; we should still clean up RTDB.
    if (authError.code === "auth/user-not-found") {
      console.log(`Auth account not found for ${uid} — cleaning up RTDB only`);
    } else {
      console.error(`Failed to delete Auth account ${uid}:`, authError);
      throw new functions.https.HttpsError("internal", "Failed to delete user account.");
    }
  }

  // Remove RTDB record — try both prod and staging paths
  const prodRef = admin.database().ref(`users/${uid}`);
  const stagingRef = admin.database().ref(`staging/users/${uid}`);

  const [prodSnap, stagingSnap] = await Promise.all([
    prodRef.once("value"),
    stagingRef.once("value"),
  ]);

  const removals = [];
  if (prodSnap.exists()) {
    removals.push(prodRef.remove());
  }
  if (stagingSnap.exists()) {
    removals.push(stagingRef.remove());
  }

  await Promise.all(removals);

  if (removals.length === 0) {
    console.log(`No RTDB record found for ${uid} in either path`);
  } else {
    console.log(`RTDB records cleaned up for ${uid}: ${removals.length} path(s)`);
  }

  return { success: true };
});
