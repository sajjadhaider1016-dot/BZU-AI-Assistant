const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const prisma = require("./lib/prisma");

const router = express.Router();
const VERIFY_EMAIL = "verify-email";
const RESET_PASSWORD = "reset-password";

function appUrl(req) {
    const configured = process.env.APP_URL;
    if (configured) return configured.replace(/\/$/, "");
    if (process.env.RAILWAY_PUBLIC_DOMAIN) {
        return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`.replace(/\/$/, "");
    }
    return `${req.protocol}://${req.get("host")}`.replace(/\/$/, "");
}

function emailIsConfigured() {
    return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function htmlEscape(value) {
    return String(value || "").replace(/[&<>"']/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

async function sendEmail(to, subject, html, text) {
    if (!emailIsConfigured()) {
        throw new Error("Email is not configured. Set RESEND_API_KEY and EMAIL_FROM.");
    }

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, html, text })
    });

    if (!response.ok) {
        const details = await response.text().catch(() => "");
        console.error("EMAIL PROVIDER ERROR:", response.status, details.slice(0, 500));
        throw new Error("The email provider rejected the message.");
    }
}

function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}

async function createToken(userId, purpose, lifetimeMs) {
    const token = crypto.randomBytes(32).toString("hex");
    await prisma.authToken.deleteMany({ where: { userId, purpose } });
    await prisma.authToken.create({
        data: {
            userId,
            purpose,
            tokenHash: hashToken(token),
            expiresAt: new Date(Date.now() + lifetimeMs)
        }
    });
    return token;
}

async function sendVerificationEmail(req, user) {
    const token = await createToken(user.id, VERIFY_EMAIL, 24 * 60 * 60 * 1000);
    const link = `${appUrl(req)}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const name = htmlEscape(user.name);
    await sendEmail(
        user.email,
        "Verify your BZU AI account",
        `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>Verify your email</h2><p>Hello ${name},</p><p>Confirm your email address to finish creating your BZU AI account.</p><p><a href="${link}" style="display:inline-block;background:#2563eb;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Verify email</a></p><p>This link expires in 24 hours. If you did not create this account, you can ignore this message.</p></div>`,
        `Hello ${user.name}, verify your BZU AI account using this link (expires in 24 hours): ${link}`
    );
}

function saveAuthenticatedSession(req, res, user, statusCode = 200, message = "Login successful.") {
    req.session.regenerate(regenerateError => {
        if (regenerateError) {
            console.error("SESSION REGENERATE ERROR:", regenerateError);
            return res.status(500).json({ success: false, message: "Could not start a secure login session. Please try again." });
        }
        req.session.userId = user.id;
        req.session.save(error => {
            if (error) {
                console.error("SESSION SAVE ERROR:", error);
                return res.status(500).json({ success: false, message: "Your login session could not be saved. Please try again." });
            }
            return res.status(statusCode).json({
                success: true,
                message,
                user: { id: user.id, name: user.name, email: user.email }
            });
        });
    });
}

function completeOAuthSession(req, user) {
    return new Promise((resolve, reject) => {
        req.session.regenerate(error => {
            if (error) return reject(error);
            req.session.userId = user.id;
            req.session.save(saveError => saveError ? reject(saveError) : resolve());
        });
    });
}

router.post("/signup", async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim();
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");

        if (!name || !email || !password) return res.status(400).json({ success: false, message: "Name, email and password are required." });
        if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        if (!emailIsConfigured()) return res.status(503).json({ success: false, message: "Email verification is not configured yet. Please contact the administrator." });

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(409).json({ success: false, message: "An account with this email already exists. Sign in or request a password reset." });

        const user = await prisma.user.create({
            data: { name, email, passwordHash: await bcrypt.hash(password, 12), emailVerified: false }
        });

        try {
            await sendVerificationEmail(req, user);
        } catch (emailError) {
            console.error("VERIFICATION EMAIL ERROR:", emailError.message);
            return res.status(503).json({
                success: false,
                code: "VERIFICATION_EMAIL_SEND_FAILED",
                message: "Your account was created, but we could not send the verification email. Use Resend verification or try again later."
            });
        }

        return res.status(201).json({ success: true, verificationRequired: true, message: "Check your email for a verification link. It expires in 24 hours." });
    } catch (error) {
        console.error("SIGNUP ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to create account." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");
        if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required." });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        if (!user.emailVerified) {
            return res.status(403).json({ success: false, code: "EMAIL_NOT_VERIFIED", message: "Verify your email before signing in. You can request a new verification link below." });
        }
        return saveAuthenticatedSession(req, res, user);
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to login." });
    }
});

router.post("/resend-verification", async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, message: "Enter your email address." });
        if (!emailIsConfigured()) return res.status(503).json({ success: false, message: "Email verification is not configured. Please contact the administrator." });

        const user = await prisma.user.findUnique({ where: { email } });
        if (user && !user.emailVerified) await sendVerificationEmail(req, user);
        return res.json({ success: true, message: "If that account needs verification, a new link has been sent." });
    } catch (error) {
        console.error("RESEND VERIFICATION ERROR:", error);
        return res.status(503).json({ success: false, message: "Could not send the verification email. Please try again later." });
    }
});

router.get("/verify-email", async (req, res) => {
    try {
        const rawToken = String(req.query.token || "");
        if (!/^[a-f0-9]{64}$/i.test(rawToken)) return res.redirect(`${appUrl(req)}/?verified=invalid`);
        const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
        if (!record || record.purpose !== VERIFY_EMAIL || record.expiresAt <= new Date()) {
            return res.redirect(`${appUrl(req)}/?verified=expired`);
        }
        await prisma.$transaction([
            prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
            prisma.authToken.deleteMany({ where: { userId: record.userId, purpose: VERIFY_EMAIL } })
        ]);
        return res.redirect(`${appUrl(req)}/?verified=1`);
    } catch (error) {
        console.error("VERIFY EMAIL ERROR:", error);
        return res.redirect(`${appUrl(req)}/?verified=error`);
    }
});

router.post("/forgot-password", async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        if (!email) return res.status(400).json({ success: false, message: "Enter your email address." });
        if (!emailIsConfigured()) return res.status(503).json({ success: false, message: "Password recovery email is not configured. Please contact the administrator." });

        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            const token = await createToken(user.id, RESET_PASSWORD, 60 * 60 * 1000);
            const link = `${appUrl(req)}/?resetToken=${encodeURIComponent(token)}`;
            await sendEmail(
                user.email,
                "Reset your BZU AI password",
                `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033"><h2>Reset your password</h2><p>Hello ${htmlEscape(user.name)},</p><p>Use the button below to choose a new password. This link expires in one hour and can only be used once.</p><p><a href="${link}" style="display:inline-block;background:#2563eb;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">Reset password</a></p><p>If you did not request this, you can ignore this message.</p></div>`,
                `Reset your BZU AI password (link expires in one hour): ${link}`
            );
        }
        return res.json({ success: true, message: "If an account exists for that email, a password reset link has been sent." });
    } catch (error) {
        console.error("FORGOT PASSWORD ERROR:", error);
        return res.status(503).json({ success: false, message: "Could not send a password reset email. Please try again later." });
    }
});

router.post("/reset-password", async (req, res) => {
    try {
        const token = String(req.body?.token || "");
        const password = String(req.body?.password || "");
        if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(400).json({ success: false, message: "This password reset link is invalid or expired." });
        if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });

        const record = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) } });
        if (!record || record.purpose !== RESET_PASSWORD || record.expiresAt <= new Date()) {
            return res.status(400).json({ success: false, message: "This password reset link is invalid or expired." });
        }

        await prisma.$transaction([
            prisma.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } }),
            prisma.authToken.deleteMany({ where: { userId: record.userId, purpose: RESET_PASSWORD } })
        ]);
        return res.json({ success: true, message: "Your password has been reset. You can now sign in." });
    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to reset the password." });
    }
});

router.get("/google", async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.redirect(`${appUrl(req)}/?authError=google_unconfigured`);
    }
    try {
        const state = crypto.randomBytes(32).toString("hex");
        req.session.googleOAuthState = state;
        await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
        const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${appUrl(req)}/api/auth/google/callback`;
        const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authorizeUrl.search = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: callbackUrl,
            response_type: "code",
            scope: "openid email profile",
            state,
            prompt: "select_account"
        }).toString();
        return res.redirect(authorizeUrl.toString());
    } catch (error) {
        console.error("GOOGLE AUTH START ERROR:", error);
        return res.status(500).send("Could not start Google sign-in. Please try again.");
    }
});

router.get("/google/callback", async (req, res) => {
    const base = appUrl(req);
    try {
        const { code, state, error: providerError } = req.query;
        if (providerError) return res.redirect(`${base}/?authError=google_cancelled`);
        if (!code || !state || !req.session.googleOAuthState || state !== req.session.googleOAuthState) {
            return res.redirect(`${base}/?authError=google_state`);
        }
        delete req.session.googleOAuthState;

        const callbackUrl = process.env.GOOGLE_CALLBACK_URL || `${base}/api/auth/google/callback`;
        const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code: String(code),
                client_id: process.env.GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                redirect_uri: callbackUrl,
                grant_type: "authorization_code"
            })
        });
        if (!tokenResponse.ok) throw new Error(`Google token exchange failed (${tokenResponse.status}).`);
        const tokens = await tokenResponse.json();
        const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        if (!profileResponse.ok) throw new Error(`Google profile request failed (${profileResponse.status}).`);
        const profile = await profileResponse.json();
        const email = String(profile.email || "").trim().toLowerCase();
        if (!email || profile.email_verified !== true) throw new Error("Google did not return a verified email address.");

        let user = await prisma.user.findUnique({ where: { email } });
        if (user) {
            if (!user.emailVerified) user = await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
        } else {
            user = await prisma.user.create({
                data: {
                    name: String(profile.name || email.split("@")[0]).slice(0, 100),
                    email,
                    emailVerified: true,
                    passwordHash: await bcrypt.hash(crypto.randomBytes(48).toString("hex"), 12)
                }
            });
        }
        await completeOAuthSession(req, user);
        return res.redirect(`${base}/`);
    } catch (error) {
        console.error("GOOGLE AUTH CALLBACK ERROR:", error);
        return res.redirect(`${base}/?authError=google`);
    }
});

router.get("/me", async (req, res) => {
    try {
        if (!req.session.userId) return res.status(401).json({ success: false, authenticated: false });
        const user = await prisma.user.findUnique({
            where: { id: req.session.userId },
            select: { id: true, name: true, email: true, emailVerified: true }
        });
        if (!user) {
            req.session.destroy(() => {});
            return res.status(401).json({ success: false, authenticated: false });
        }
        return res.json({ success: true, authenticated: true, user });
    } catch (error) {
        console.error("AUTH CHECK ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to check authentication." });
    }
});

router.post("/logout", (req, res) => {
    req.session.destroy(error => {
        if (error) return res.status(500).json({ success: false, message: "Unable to logout." });
        res.clearCookie("connect.sid");
        return res.json({ success: true, message: "Logged out successfully." });
    });
});

module.exports = router;
