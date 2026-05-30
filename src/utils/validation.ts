import { z } from 'zod';

// Auth Schemas
export const loginSchema = z.object({
    emailOrPhone: z.string().min(1, 'Email or Phone is required'),
    password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/\d/, 'Password must contain at least 1 number'),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

export const forgotPasswordSchema = z.object({
    emailOrPhone: z.string().min(1, 'Email or Phone is required'),
});

export const editProfileSchema = z.object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'),
});

// Ad Creation Schemas
export const adSchema = z.object({
    title: z.string().min(3, 'Title is required (min 3 chars)'),
    primaryText: z.string().min(10, 'Primary text is required (min 10 chars)'),
    cta: z.string(),
    dailyBudget: z.number().min(100, 'Minimum budget is ₹100'),
    durationDays: z.number().min(1, 'Duration must be at least 1 day'),
    // Fields that might be partially filled in drafts need to be optional for draft save, 
    // but we will enforce them validation in UI steps or before publish.
    // For strict object shape:
    location: z.string().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type EditProfileFormData = z.infer<typeof editProfileSchema>;
