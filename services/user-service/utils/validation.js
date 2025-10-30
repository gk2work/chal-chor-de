const Joi = require("joi");

// User registration validation schema
const registerSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"))
    .required()
    .messages({
      "string.min": "Password must be at least 8 characters long",
      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      "any.required": "Password is required",
    }),
  full_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(new RegExp("^[a-zA-Z\\s]+$"))
    .required()
    .messages({
      "string.min": "Full name must be at least 2 characters long",
      "string.max": "Full name cannot exceed 100 characters",
      "string.pattern.base": "Full name can only contain letters and spaces",
      "any.required": "Full name is required",
    }),
  office_id: Joi.string().default("office_001").messages({
    "string.base": "Office ID must be a string",
  }),
});

// User login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
  password: Joi.string().required().messages({
    "any.required": "Password is required",
  }),
});

// Profile update validation schema
const updateProfileSchema = Joi.object({
  full_name: Joi.string()
    .min(2)
    .max(100)
    .pattern(new RegExp("^[a-zA-Z\\s]+$"))
    .messages({
      "string.min": "Full name must be at least 2 characters long",
      "string.max": "Full name cannot exceed 100 characters",
      "string.pattern.base": "Full name can only contain letters and spaces",
    }),
  preferences: Joi.object({
    notifications_enabled: Joi.boolean(),
    location_sharing: Joi.boolean(),
    email_notifications: Joi.boolean(),
    push_notifications: Joi.boolean(),
    marketing_emails: Joi.boolean(),
  }).messages({
    "object.base": "Preferences must be an object",
  }),
});

// Password change validation schema
const changePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    "any.required": "Current password is required",
  }),
  new_password: Joi.string()
    .min(8)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)"))
    .required()
    .messages({
      "string.min": "New password must be at least 8 characters long",
      "string.pattern.base":
        "New password must contain at least one uppercase letter, one lowercase letter, and one number",
      "any.required": "New password is required",
    }),
  confirm_password: Joi.string()
    .valid(Joi.ref("new_password"))
    .required()
    .messages({
      "any.only": "Password confirmation does not match new password",
      "any.required": "Password confirmation is required",
    }),
});

// Rating validation schema
const ratingSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    "number.base": "Rating must be a number",
    "number.integer": "Rating must be a whole number",
    "number.min": "Rating must be at least 1",
    "number.max": "Rating cannot exceed 5",
    "any.required": "Rating is required",
  }),
  comment: Joi.string().max(500).allow("").messages({
    "string.max": "Comment cannot exceed 500 characters",
  }),
  transaction_type: Joi.string()
    .valid("carpool", "bike", "book", "general")
    .default("general")
    .messages({
      "any.only":
        "Transaction type must be one of: carpool, bike, book, general",
    }),
  transaction_id: Joi.string().allow(null).messages({
    "string.base": "Transaction ID must be a string",
  }),
});

// Token validation schema
const tokenSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "Token is required",
    "string.base": "Token must be a string",
  }),
});

// Refresh token schema
const refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required().messages({
    "any.required": "Refresh token is required",
    "string.base": "Refresh token must be a string",
  }),
});

// Email validation utility
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password strength checker
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let strength = "weak";
  if (score >= 4) strength = "strong";
  else if (score >= 3) strength = "medium";

  return {
    score,
    strength,
    checks,
    suggestions: [
      !checks.length && "Use at least 8 characters",
      !checks.lowercase && "Include lowercase letters",
      !checks.uppercase && "Include uppercase letters",
      !checks.number && "Include numbers",
      !checks.special && "Include special characters",
    ].filter(Boolean),
  };
};

// Sanitize user input
const sanitizeInput = (input) => {
  if (typeof input !== "string") return input;

  return input
    .trim()
    .replace(/[<>]/g, "") // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
  ratingSchema,
  tokenSchema,
  refreshTokenSchema,
  isValidEmail,
  checkPasswordStrength,
  sanitizeInput,
};
