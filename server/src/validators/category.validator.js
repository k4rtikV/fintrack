import { z } from "zod";

const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

const nameSchema = z
  .string()
  .trim()
  .min(2, "Category name must contain at least 2 characters")
  .max(40, "Category name cannot exceed 40 characters");

const iconSchema = z
  .string()
  .trim()
  .min(1, "Icon is required")
  .max(40, "Icon value is too long");

const colorSchema = z
  .string()
  .trim()
  .min(1, "Color is required")
  .max(30, "Color value is too long");

export const createCategorySchema = z.object({
  body: z.object({
    name: nameSchema,
    type: categoryTypeSchema,
    icon: iconSchema.default("circle"),
    color: colorSchema.default("slate"),
  }),
});

export const updateCategorySchema = z.object({
  params: z.object({
    categoryId: z.string().min(1, "Category ID is required"),
  }),

  body: z
    .object({
      name: nameSchema.optional(),
      icon: iconSchema.optional(),
      color: colorSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export const categoryIdSchema = z.object({
  params: z.object({
    categoryId: z.string().min(1, "Category ID is required"),
  }),
});