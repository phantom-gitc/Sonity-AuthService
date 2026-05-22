import { body, validationResult } from 'express-validator';


// Validation Middleware
const validate = (req, res, next) => {
    
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            errors: errors.array()
        });
    }

// If there are no validation errors , proceed to the next middleware or route handler/

    next();
};

// Register User Validation Rules
export const registerUserValidationRules = [
    
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email'),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),

    body('fullName.firstName')
        .notEmpty()
        .withMessage('First Name is required'),

    body('fullName.lastName')
        .notEmpty()
        .withMessage('Last Name is required'),
    validate
];