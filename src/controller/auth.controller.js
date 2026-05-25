import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { publishToQueue } from "../broker/rabbit.js";
import crypto from "crypto";
import { uploadProfileImage, deleteFromCloudinary } from "../services/cloudinary.services.js";

// Register a new User

export async function register(req, res) {
    let {
        email,
        password,
        fullName: { firstName, lastName },
        role = "listener"
    } = req.body;

    // Normalize roles
    if (role === "artist" || role === "creator") {
        role = "creator";
    } else {
        role = "listener";
    }

    // Check if user already exists

    const isUserAlreadyExist = await userModel.findOne({ email });

    if (isUserAlreadyExist) {
        return res.status(400).json({
            message: "User Already Exists",
        });
    }

    // Hash the password

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create a new user in the database

    const user = await userModel.create({
        email,
        password: hashedPassword,
        fullName: {
            firstName,
            lastName,
        },
        role,
    });

    // Generate JWT Token

    const token = jwt.sign(
        {
            id: user._id,
            fullName: user.fullName,
            role: user.role,
        },
        config.JWT_SECRET,
        { expiresIn: "2d" },
    );

    // Publish the user creation event to RabbitMQ.

    await publishToQueue("user_created", {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
    });

    // set the token in the cookie
    res.cookie("token", token);

    // Send the response

    res.status(201).json({
        message: "User Created Successfully",

        user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        },
    });
}

// Login a user with email/password
export async function login(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email });
    if (!user) {
        return res.status(400).json({
            message: "Invalid credentials",
        });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(400).json({
            message: "Invalid credentials",
        });
    }

    const token = jwt.sign(
        {
            id: user._id,
            fullName: user.fullName,
            role: user.role,
        },
        config.JWT_SECRET,
        { expiresIn: "2d" },
    );

    res.cookie("token", token);

    try {
        await publishToQueue("user_logged_in", {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        });
    } catch (error) {
        console.error("Failed to publish login event:", error);
    }

    res.status(200).json({
        message: "User Logged in Successfully",
        user: {
            id: user._id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
        },
    });
}

//Google OAuth callback handler

export async function googleOAuthCallback(req, res) {
    
    const user = req.user;

    const isUserAlreadyExist = await userModel.findOne({
        $or: [
        { email: user.emails[0].value }, 
        { googleId: user.id }
    ],
    });

    // If user already exists, log them in
    
    if (isUserAlreadyExist) {

        // Generate JWT Token

        const token = jwt.sign(
            {
                id: isUserAlreadyExist._id,
                fullName: isUserAlreadyExist.fullName,
                role: isUserAlreadyExist.role,
            },
              config.JWT_SECRET,
            { expiresIn: "2d" },
        );
        // set the token in the cookie
        res.cookie("token", token);

        try {
            await publishToQueue("user_logged_in", {
                id: isUserAlreadyExist._id,
                email: isUserAlreadyExist.email,
                fullName: isUserAlreadyExist.fullName,
                role: isUserAlreadyExist.role,
            });
        } catch (error) {
            console.error("Failed to publish login event:", error);
        }

        // Redirect to the frontend homepage
        return res.redirect(`${config.FRONTEND_URL}/home`);

    }

    // If user does not exist, create a new user

    const displayName = user.displayName || '';
    const nameParts = displayName.trim().split(' ').filter(Boolean);
    const firstName = user.name?.givenName || nameParts[0] || 'User';
    const lastName = user.name?.familyName || nameParts.slice(1).join(' ') || 'Google';

    const newUser = await userModel.create({
        email: user.emails[0].value,
        fullName: {
            firstName,
            lastName,
        },
        googleId: user.id, // Store the Google ID for future reference
    })

        // Publish the user creation event to RabbitMQ.

        await publishToQueue("user_created", {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
    });

    // Generate JWT Token

    const token = jwt.sign({
        id: newUser._id,
        fullName: newUser.fullName,
        role: newUser.role,  
    },config.JWT_SECRET, {expiresIn: "2d"});

    // set the token in the cookie

    res.cookie("token", token);

    // Redirect to the frontend homepage
    res.redirect(`${config.FRONTEND_URL}/home`);

}

// Logout a user
export async function logout(req, res) {
    res.clearCookie("token");
    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
}

// Request forgot password link
export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(200).json({
                success: true,
                message: "If that email exists in our database, we have sent a reset link.",
            });
        }

        const token = crypto.randomBytes(20).toString("hex");
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour expiry
        await user.save();

        const resetLink = `${config.FRONTEND_URL}/reset-password/${token}`;
        await publishToQueue("password_reset", {
            email: user.email,
            fullName: user.fullName,
            resetLink,
        });

        return res.status(200).json({
            success: true,
            message: "If that email exists in our database, we have sent a reset link.",
        });
    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ success: false, message: "Failed to send reset link" });
    }
}

// Reset password using token
export async function resetPassword(req, res) {
    try {
        const { token } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long",
            });
        }

        const user = await userModel.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "Password reset token is invalid or has expired",
            });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password has been reset successfully",
        });
    } catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ success: false, message: "Failed to reset password" });
    }
}

// Fetch current user profile
export async function getProfile(req, res) {
    try {
        const user = await userModel.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }
        return res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

// Update profile details
export async function updateProfile(req, res) {
    try {
        const { firstName, lastName, password, removeProfileImage } = req.body;
        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (firstName) user.fullName.firstName = firstName;
        if (lastName) user.fullName.lastName = lastName;
        if (password) {
            if (password.length < 6) {
                return res.status(400).json({
                    success: false,
                    message: "Password must be at least 6 characters long",
                });
            }
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        // Handle profile image removal
        if (removeProfileImage === "true" || removeProfileImage === true) {
            if (user.profileImagePublicId) {
                try {
                    await deleteFromCloudinary(user.profileImagePublicId);
                } catch (err) {
                    console.error("Failed to delete profile image:", err);
                }
            }
            user.profileImage = null;
            user.profileImagePublicId = null;
        }

        // Handle new profile image upload
        if (req.file) {
            // Delete old profile image if exists
            if (user.profileImagePublicId) {
                try {
                    await deleteFromCloudinary(user.profileImagePublicId);
                } catch (err) {
                    console.error("Failed to delete old profile image:", err);
                }
            }

            const result = await uploadProfileImage(req.file.buffer, req.file.originalname);
            user.profileImage = result.url;
            user.profileImagePublicId = result.public_id;
        }

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                profileImage: user.profileImage,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}
