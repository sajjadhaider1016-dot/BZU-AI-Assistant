const express = require("express");
const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");

const router = express.Router();


// =====================================================
// SIGN UP
// =====================================================

router.post("/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message:
                    "Name, email and password are required."
            });

        }


        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters."
            });

        }


        const normalizedEmail =
            email.trim().toLowerCase();


        const existingUser =
            await prisma.user.findUnique({
                where: {
                    email: normalizedEmail
                }
            });


        if (existingUser) {

            return res.status(409).json({
                success: false,
                message:
                    "An account with this email already exists."
            });

        }


        const passwordHash =
            await bcrypt.hash(password, 12);


        const user =
            await prisma.user.create({

                data: {

                    name: name.trim(),

                    email: normalizedEmail,

                    passwordHash

                }

            });


        // Create login session
        req.session.userId = user.id;


        // Explicitly save session before responding
        req.session.save((sessionError) => {

            if (sessionError) {

                console.error(
                    "SIGNUP SESSION SAVE ERROR:",
                    sessionError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Account created, but unable to create login session."

                });

            }


            return res.status(201).json({

                success: true,

                message:
                    "Account created successfully.",

                user: {

                    id: user.id,

                    name: user.name,

                    email: user.email

                }

            });

        });


    } catch (error) {

        console.error(
            "SIGNUP ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to create account."

        });

    }

});



// =====================================================
// LOGIN
// =====================================================

router.post("/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required."

            });

        }


        const normalizedEmail =
            email.trim().toLowerCase();


        const user =
            await prisma.user.findUnique({

                where: {
                    email: normalizedEmail
                }

            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.passwordHash
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password."

            });

        }


        // Create login session
        req.session.userId = user.id;


        // Explicitly save session before responding
        req.session.save((sessionError) => {

            if (sessionError) {

                console.error(
                    "LOGIN SESSION SAVE ERROR:",
                    sessionError
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Login successful, but unable to create login session."

                });

            }


            return res.json({

                success: true,

                message:
                    "Login successful.",

                user: {

                    id: user.id,

                    name: user.name,

                    email: user.email

                }

            });

        });


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to login."

        });

    }

});



// =====================================================
// CURRENT USER
// =====================================================

router.get("/me", async (req, res) => {

    try {
console.log("ME SESSION:", req.session);
console.log("ME USER ID:", req.session.userId);
        if (!req.session.userId) {

            return res.status(401).json({

                success: false,

                authenticated: false

            });

        }


        const user =
            await prisma.user.findUnique({

                where: {
                    id: req.session.userId
                },

                select: {

                    id: true,

                    name: true,

                    email: true

                }

            });


        if (!user) {

            req.session.destroy(() => {});


            return res.status(401).json({

                success: false,

                authenticated: false

            });

        }


        return res.json({

            success: true,

            authenticated: true,

            user

        });


    } catch (error) {

        console.error(
            "AUTH CHECK ERROR:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Unable to check authentication."

        });

    }

});



// =====================================================
// LOGOUT
// =====================================================

router.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error(
                "LOGOUT ERROR:",
                error
            );


            return res.status(500).json({

                success: false,

                message:
                    "Unable to logout."

            });

        }


        res.clearCookie("connect.sid");


        return res.json({

            success: true,

            message:
                "Logged out successfully."

        });

    });

});



module.exports = router;