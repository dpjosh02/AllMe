import type { FinanceCategoryRuleConditions } from "@/server/db/schema";

export type DefaultFinanceCategory = {
  name: string;
  slug: string;
  color: string;
  icon: string;
  includeInSpending: boolean;
  includeInIncome: boolean;
  sortOrder: number;
  rules: {
    name: string;
    priority: number;
    matchLogic: "any" | "all";
    conditions: FinanceCategoryRuleConditions;
  }[];
};

export const DEFAULT_FINANCE_CATEGORIES = [
  {
    name: "Ordering Out",
    slug: "ordering-out",
    color: "#22c55e",
    icon: "utensils",
    includeInSpending: true,
    includeInIncome: false,
    sortOrder: 10,
    rules: [
      {
        name: "Restaurants, fast food, coffee, and food service",
        priority: 20,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.detailed",
            operator: "in",
            value: [
              "FOOD_AND_DRINK_RESTAURANT",
              "FOOD_AND_DRINK_FAST_FOOD",
              "FOOD_AND_DRINK_COFFEE",
            ],
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Restaurants", "Fast Food", "Coffee Shop", "Food and Beverage"],
          },
        ],
      },
    ],
  },
  {
    name: "Groceries",
    slug: "groceries",
    color: "#84cc16",
    icon: "shopping-basket",
    includeInSpending: true,
    includeInIncome: false,
    sortOrder: 20,
    rules: [
      {
        name: "Grocery stores and food markets",
        priority: 30,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.detailed",
            operator: "equals",
            value: "FOOD_AND_DRINK_GROCERIES",
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Supermarkets and Groceries", "Food and Beverage Store"],
          },
        ],
      },
    ],
  },
  {
    name: "Medical",
    slug: "medical",
    color: "#ef4444",
    icon: "heart-pulse",
    includeInSpending: true,
    includeInIncome: false,
    sortOrder: 30,
    rules: [
      {
        name: "Medical care, pharmacies, and supplements",
        priority: 30,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.primary",
            operator: "equals",
            value: "MEDICAL",
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Pharmacies", "Medical"],
          },
        ],
      },
    ],
  },
  {
    name: "Transportation",
    slug: "transportation",
    color: "#0ea5e9",
    icon: "car",
    includeInSpending: true,
    includeInIncome: false,
    sortOrder: 40,
    rules: [
      {
        name: "Transit, taxis, and ride shares",
        priority: 40,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.primary",
            operator: "equals",
            value: "TRANSPORTATION",
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Taxi", "Public Transportation Services"],
          },
        ],
      },
    ],
  },
  {
    name: "Shopping And Lifestyle",
    slug: "shopping-and-lifestyle",
    color: "#f97316",
    icon: "shopping-bag",
    includeInSpending: true,
    includeInIncome: false,
    sortOrder: 50,
    rules: [
      {
        name: "General merchandise and personal care",
        priority: 50,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.primary",
            operator: "in",
            value: ["GENERAL_MERCHANDISE", "PERSONAL_CARE"],
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: [
              "Department Stores",
              "Computers and Electronics",
              "Clothing and Accessories",
              "Digital Purchase",
            ],
          },
        ],
      },
    ],
  },
  {
    name: "Entertainment",
    slug: "entertainment",
    color: "#a855f7",
    icon: "ticket",
    includeInSpending: true,
    includeInIncome: false,
    sortOrder: 60,
    rules: [
      {
        name: "Entertainment, games, movies, events, and recreation",
        priority: 60,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.primary",
            operator: "equals",
            value: "ENTERTAINMENT",
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Arts and Entertainment", "Stadiums and Arenas", "Entertainment"],
          },
        ],
      },
    ],
  },
  {
    name: "Transfers",
    slug: "transfers",
    color: "#64748b",
    icon: "repeat",
    includeInSpending: false,
    includeInIncome: false,
    sortOrder: 70,
    rules: [
      {
        name: "Bank, app, and account transfers",
        priority: 70,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.primary",
            operator: "in",
            value: ["TRANSFER_IN", "TRANSFER_OUT"],
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Transfer"],
          },
        ],
      },
    ],
  },
  {
    name: "Credit Card Payments",
    slug: "credit-card-payments",
    color: "#94a3b8",
    icon: "credit-card",
    includeInSpending: false,
    includeInIncome: false,
    sortOrder: 80,
    rules: [
      {
        name: "Credit card payment transfers",
        priority: 10,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.detailed",
            operator: "equals",
            value: "LOAN_PAYMENTS_CREDIT_CARD_PAYMENT",
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Credit Card"],
          },
        ],
      },
    ],
  },
  {
    name: "Income",
    slug: "income",
    color: "#16a34a",
    icon: "wallet",
    includeInSpending: false,
    includeInIncome: true,
    sortOrder: 90,
    rules: [
      {
        name: "Wages, tax refunds, and income deposits",
        priority: 90,
        matchLogic: "any",
        conditions: [
          {
            field: "personal_finance_category.primary",
            operator: "equals",
            value: "INCOME",
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Payroll"],
          },
        ],
      },
    ],
  },
  {
    name: "Investing",
    slug: "investing",
    color: "#2563eb",
    icon: "line-chart",
    includeInSpending: false,
    includeInIncome: false,
    sortOrder: 100,
    rules: [
      {
        name: "Investment activity",
        priority: 100,
        matchLogic: "any",
        conditions: [
          {
            field: "investment.type",
            operator: "in",
            value: ["BUY", "SELL", "DIVIDEND", "CONTRIBUTION", "TRANSFER", "FEE", "REI"],
          },
          {
            field: "personal_finance_category.detailed",
            operator: "equals",
            value: "TRANSFER_OUT_INVESTMENT_AND_RETIREMENT_FUNDS",
          },
          {
            field: "raw.category",
            operator: "contains_any",
            value: ["Financial Planning and Investments"],
          },
        ],
      },
    ],
  },
] satisfies DefaultFinanceCategory[];
