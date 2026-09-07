# Zod Validators - Implementation Guide

## 📋 Overview

This directory contains comprehensive Zod validation schemas organized by feature/domain. All schemas follow enterprise-level best practices with reusable base schemas, proper TypeScript types, and detailed error messages.

## 📁 Directory Structure

```
validators/
├── users-zod/              # User & Authentication schemas
│   ├── register.zod.ts     # Registration & reusable base schemas
│   ├── login.zod.ts        # Login validation
│   ├── changePswd.zod.ts   # Password management
│   ├── forgotPswd.zod.ts   # Password reset flow
│   ├── verifyEmail.zod.ts  # Email verification & OTP
│   ├── editProfile.zod.ts  # Profile updates
│   ├── becomeMod.zod.ts    # Moderator application
│   ├── search.zod.ts       # Global search
│   └── index.ts            # Centralized exports
│
├── admin-zod/              # Admin management schemas
│   ├── modManagement.zod.ts
│   ├── notesManagement.zod.ts
│   ├── pyqsManagement.zod.ts
│   ├── syllabusManagement.zod.ts
│   ├── userManagement.zod.ts
│   └── index.ts
│
├── mods-zod/               # Moderator action schemas
│   ├── notesManagement.zod.ts
│   ├── pyqsManagement.zod.ts
│   ├── syllabusManagement.zod.ts
│   └── index.ts
│
├── social-zod/             # Social features schemas
│   ├── post.zod.ts         # Post creation & editing
│   ├── comment.zod.ts      # Comments
│   ├── like.zod.ts         # Likes/reactions
│   ├── follow.zod.ts       # Follow/unfollow
│   ├── notification.zod.ts # Notifications
│   └── index.ts
│
├── notes-zod/              # Notes schemas
│   ├── notes.zod.ts        # Upload, query, update
│   └── index.ts
│
├── pyqs-zod/               # PYQs schemas
│   ├── pyqs.zod.ts         # Upload, query, update
│   └── index.ts
│
├── syllabus-zod/           # Syllabus schemas
│   ├── syllabus.zod.ts     # Upload, query, update
│   └── index.ts
│
└── index.ts                # Main entry point (re-exports all)
```

## 🚀 Quick Start

### 1. Basic Usage in Controllers

```typescript
import { loginSchema, registerSchema } from "@/lib/validators";
import { Request, Response } from "express";

export const loginUser = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = loginSchema.parse(req.body);

    // validatedData is fully typed and safe to use
    const { email, password } = validatedData;

    // Continue with your logic...
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        errors: error.errors,
      });
    }
  }
};
```

### 2. Usage with try-catch and safeParse

```typescript
import { registerSchema, RegisterInput } from "@/lib/validators";

export const registerUser = async (req: Request, res: Response) => {
  // Use safeParse to avoid throwing
  const result = registerSchema.safeParse(req.body);

  if (!result.success) {
    return res.status(400).json({
      success: false,
      errors: result.error.flatten(),
    });
  }

  // result.data is fully typed
  const userData: RegisterInput = result.data;
  // Continue with registration logic...
};
```

### 3. Validation Middleware Pattern

```typescript
import { ZodSchema } from "zod";

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.error.flatten(),
      });
    }

    // Store validated data in request for later use
    req.body = result.data;
    next();
  };
};

// Usage in routes
router.post("/login", validateRequest(loginSchema), loginUser);
router.post("/register", validateRequest(registerSchema), registerUser);
```

## 📚 Available Schemas

### User & Authentication (`users-zod/`)

| Schema                    | Type  | Purpose                        |
| ------------------------- | ----- | ------------------------------ |
| `registerSchema`          | Input | User registration validation   |
| `loginSchema`             | Input | User login validation          |
| `changePasswordSchema`    | Input | Password change when logged in |
| `forgotPasswordSchema`    | Input | Forgot password (OTP request)  |
| `createNewPasswordSchema` | Input | Create new password with OTP   |
| `verifyEmailSchema`       | Input | Email verification with OTP    |
| `resendOtpSchema`         | Input | Resend OTP request             |
| `editProfileSchema`       | Input | Profile update validation      |
| `becomeModeratorSchema`   | Input | Moderator application          |
| `searchSchema`            | Input | Global search query            |

### Base/Reusable Schemas

```typescript
// Exported from users-zod/register.zod.ts
export const passwordSchema; // Strong password requirements
export const shardaEmailSchema; // Sharda University email validation
export const resourceMetadataSchema; // Course/program metadata (reused in notes/pyqs/syllabus)
```

### Resources (`notes-zod/`, `pyqs-zod/`, `syllabus-zod/`)

| Schema                                                            | Purpose                  |
| ----------------------------------------------------------------- | ------------------------ |
| `notesSchema` / `pyqsSchema` / `syllabusSchema`                   | Upload/create resource   |
| `updateNotesSchema` / `updatePYQsSchema` / `updateSyllabusSchema` | Update resource metadata |
| `notesQuerySchema` / `pyqsQuerySchema` / `syllabusQuerySchema`    | Query/filter resources   |

### Admin Management (`admin-zod/`)

| Schema                       | Purpose                           |
| ---------------------------- | --------------------------------- |
| `reviewModRequestSchema`     | Approve/reject moderator requests |
| `deleteNoteParamsSchema`     | Delete note validation            |
| `deletePYQParamsSchema`      | Delete PYQ validation             |
| `deleteSyllabusParamsSchema` | Delete syllabus validation        |
| `deleteUserParamsSchema`     | Delete user validation            |

### Moderator Actions (`mods-zod/`)

| Schema                 | Purpose                     |
| ---------------------- | --------------------------- |
| `rejectNoteSchema`     | Reject note with reason     |
| `rejectPYQSchema`      | Reject PYQ with reason      |
| `rejectSyllabusSchema` | Reject syllabus with reason |

### Social Features (`social-zod/`)

| Schema                       | Purpose                        |
| ---------------------------- | ------------------------------ |
| `createPostSchema`           | Create new post                |
| `editPostSchema`             | Edit existing post             |
| `lostFoundStatusUpdateSchema`| Resolve/reopen a lost & found post |
| `createCommentSchema`        | Create comment                 |
| `editCommentSchema`          | Edit comment                   |
| `getCommentsSchema`          | Fetch comments with pagination |
| `likeActionSchema`           | Like/unlike action             |
| `followActionSchema`         | Follow/unfollow user           |
| `followListSchema`           | Fetch followers/following      |
| `getNotificationsSchema`     | Fetch notifications            |
| `markNotificationReadSchema` | Mark notifications as read     |

## 🔍 Key Features

### 1. Reusable Base Schemas

Base schemas reduce duplication:

```typescript
// Defined once in register.zod.ts
export const passwordSchema;
export const shardaEmailSchema;
export const resourceMetadataSchema;

// Reused across multiple schemas
import { passwordSchema, shardaEmailSchema } from "./register.zod";

export const changePasswordSchema = z.object({
  email: shardaEmailSchema,
  newPassword: passwordSchema,
  // ...
});
```

### 2. Composite Validation

Schemas can be combined and extended:

```typescript
// Base schema
export const notesSchema = z.object({
  title: z.string(),
  ...resourceMetadataSchema.shape,
});

// Partial schema for updates
export const updateNotesSchema = notesSchema.partial();
```

### 3. Type Safety

TypeScript types are automatically inferred:

```typescript
import { RegisterInput } from "@/lib/validators";

function processRegistration(data: RegisterInput) {
  // TypeScript knows all properties and types
  console.log(data.email); // string
  console.log(data.password); // string
}
```

### 4. Advanced Validation

Schemas support complex validation rules:

```typescript
// Cross-field validation
.refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

// Custom validation logic
.refine((email) => email.split("@")[1] === "ug.sharda.ac.in", {
  message: "Only Sharda University emails allowed",
})

// Enum validation
z.enum(["approve", "reject", "pending"])

// Number ranges
z.number().min(1).max(12)

// URL validation
z.string().url()

// Regex patterns
z.string().regex(/^[0-9]{10}$/)
```

## 📝 Best Practices

### 1. Keep Schemas Organized

```typescript
// ✅ GOOD: Related schemas in same file
export const createPostSchema = z.object({...});
export const editPostSchema = z.object({...});
export const postParamsSchema = z.object({...});

// ❌ AVOID: Mixing unrelated schemas
// Don't mix post and comment schemas in same file
```

### 2. Use Descriptive Names

```typescript
// ✅ GOOD: Clear intent
export const becomeModeratorSchema;
export const deleteNoteParamsSchema;
export const rejectNoteSchema;

// ❌ AVOID: Vague names
export const modSchema;
export const deleteSchema;
```

### 3. Export Type Definitions

```typescript
// ✅ GOOD: Always export inferred types
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// Use in controllers:
function processLogin(data: LoginInput) {
  // Fully typed data
}
```

### 4. Provide Clear Error Messages

```typescript
// ✅ GOOD: User-friendly messages
z.string().min(6, { message: "Password must be at least 6 characters" });

// ❌ AVOID: Vague messages
z.string().min(6);
```

### 5. Validate at Entry Points

```typescript
// ✅ GOOD: Validate as early as possible
router.post(
  "/register",
  validateRequest(registerSchema), // Middleware validates
  registerUser,
);

// Use safeParse for additional validation
export const registerUser = (req: Request, res: Response) => {
  const additionalResult = customSchema.safeParse(req.body);
};
```

## 🔧 Common Patterns

### Pattern 1: Paginated Queries

```typescript
const paginatedSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 1))
    .refine((val) => val > 0),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 10))
    .refine((val) => val > 0 && val <= 100),
});
```

### Pattern 2: Conditional Fields

```typescript
const postSchema = z
  .object({
    content: z.string().optional(),
    // files handled separately
  })
  .refine(
    (data) => data.content?.trim() || true, // Must have content or files
    { message: "Post must have content or media" },
  );
```

### Pattern 3: Partial Updates

```typescript
const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
});

const updateSchema = createSchema.partial();
```

## 🐛 Error Handling Example

```typescript
import { ZodError } from "zod";

try {
  const data = registerSchema.parse(req.body);
  // Process data
} catch (error) {
  if (error instanceof ZodError) {
    // Format Zod errors nicely
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: error.flatten().fieldErrors,
      // errors = {
      //   email: ["Only Sharda emails allowed"],
      //   password: ["Password too weak"]
      // }
    });
  }
}
```

## 📖 Additional Resources

- [Zod Documentation](https://zod.dev)
- [Zod Error Handling](https://zod.dev/error-handling)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

When adding new validators:

1. Create in appropriate subdirectory
2. Export from category `index.ts`
3. Re-export from main `index.ts`
4. Add TypeScript type exports
5. Document in this file
6. Use reusable base schemas where possible
7. Provide clear error messages
