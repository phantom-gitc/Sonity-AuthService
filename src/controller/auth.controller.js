import userModel from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import config from "../config/config.js";
import { publishToQueue } from "../broker/rabbit.js";

// Register a new User

export async function register(req, res) {
    const {
        email,
        password,
        fullName: { firstName, lastName },role="user"
    } = req.body;

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
        role: req.body.role || 'user',
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
