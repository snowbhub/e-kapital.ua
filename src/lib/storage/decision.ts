import { z } from "zod";
const amount = z.number().finite().min(0).max(1e12);
export const decisionInputsSchema = z.object({
  referenceCurrency: z.enum(["UAH", "USD", "EUR"]).optional(),
  macro: z.enum(["stable", "history5", "history10", "stress"]).optional(),
  savingFrequency: z.enum(["monthly", "annual"]).optional(),
  valuation: z.enum(["reference", "real"]).optional(),
  currency: z.enum(["UAH", "USD", "EUR"]).default("UAH"),
  capital: amount.default(0),
  monthly: amount.default(0),
  months: z.number().int().min(1).max(360).default(12),
  purpose: z.enum(["grow", "income", "home"]).default("grow"),
});
export const decisionPlanSchema = z.object({
  id: z.string().max(100),
  createdAt: z.string(),
  kind: z.enum(["investment", "housing", "property", "business"]),
  name: z.string().max(160),
  inputs: decisionInputsSchema,
  assumptions: z.record(
    z.string(),
    z.union([z.number().finite(), z.string(), z.boolean()]),
  ),
  result: z.string().max(1000),
  nextStep: z.string().max(500),
  sourceDate: z.string(),
});
export const decisionSchema = z
  .object({
    resumeId: z.string().max(100).nullable().default(null),
    inputs: decisionInputsSchema.default({
      currency: "UAH",
      capital: 0,
      monthly: 0,
      months: 12,
      purpose: "grow",
    }),
    plans: z.array(decisionPlanSchema).max(30).default([]),
  })
  .default({
    resumeId: null,
    inputs: {
      currency: "UAH",
      capital: 0,
      monthly: 0,
      months: 12,
      purpose: "grow",
    },
    plans: [],
  });
export type DecisionPlan = z.infer<typeof decisionPlanSchema>;
