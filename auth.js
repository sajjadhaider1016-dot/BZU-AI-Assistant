const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

const router = express.Router();

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

router.post("/signup", async (req, res) => {
    try {
        const name = String(req.body?.name || "").trim();
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: "Name, email and password are required." });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "An account with this email already exists. Please sign in." });
        }

        const user = await prisma.user.create({
            data: { name, email, passwordHash: await bcrypt.hash(password, 12), emailVerified: true }
        });
        return saveAuthenticatedSession(req, res, user, 201, "Account created successfully.");
    } catch (error) {
        console.error("SIGNUP ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to create account." });
    }
});

router.post("/login", async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim().toLowerCase();
        const password = String(req.body?.password || "");
        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required." });
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        return saveAuthenticatedSession(req, res, user);
    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(500).json({ success: false, message: "Unable to login." });
    }
});

router.get("/me", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ success: false, authenticated: false });
        }

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
        if (error) {
            return res.status(500).json({ success: false, message: "Unable to logout." });
        }
        res.clearCookie("connect.sid");
        return res.json({ success: true, message: "Logged out successfully." });
    });
});

module.exports = router;
