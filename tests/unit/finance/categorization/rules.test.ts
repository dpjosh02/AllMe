import { describe, expect, it } from "vitest";

import {
  doesConditionMatch,
  findBestCategoryRuleMatch,
} from "@/features/finance/categorization/rules";

const orderingOutTransaction = {
  amount: "-14.25",
  category: "Restaurant",
  description: "Example Lunch",
  merchant: "Example Restaurant",
  rawPayload: {
    category: ["Food and Drink", "Restaurants", "Fast Food"],
    personal_finance_category: {
      primary: "FOOD_AND_DRINK",
      detailed: "FOOD_AND_DRINK_FAST_FOOD",
      confidence_level: "VERY_HIGH",
    },
  },
};

describe("finance categorization rules", () => {
  it("matches detailed personal finance categories", () => {
    expect(
      doesConditionMatch(
        {
          field: "personal_finance_category.detailed",
          operator: "in",
          value: ["FOOD_AND_DRINK_RESTAURANT", "FOOD_AND_DRINK_FAST_FOOD"],
        },
        orderingOutTransaction,
      ),
    ).toBe(true);
  });

  it("matches raw category arrays with contains_any", () => {
    expect(
      doesConditionMatch(
        {
          field: "raw.category",
          operator: "contains_any",
          value: ["Coffee Shop", "Fast Food"],
        },
        orderingOutTransaction,
      ),
    ).toBe(true);
  });

  it("uses priority before specificity when choosing the best match", () => {
    const match = findBestCategoryRuleMatch({
      transaction: orderingOutTransaction,
      rules: [
        {
          id: "general-food",
          categoryId: "food",
          priority: 50,
          matchLogic: "all",
          conditions: [
            {
              field: "personal_finance_category.primary",
              operator: "equals",
              value: "FOOD_AND_DRINK",
            },
          ],
        },
        {
          id: "ordering-out",
          categoryId: "ordering-out",
          priority: 20,
          matchLogic: "any",
          conditions: [
            {
              field: "personal_finance_category.detailed",
              operator: "equals",
              value: "FOOD_AND_DRINK_FAST_FOOD",
            },
          ],
        },
      ],
    });

    expect(match?.rule.id).toBe("ordering-out");
    expect(match?.rule.categoryId).toBe("ordering-out");
  });

  it("supports investment transaction type matching", () => {
    expect(
      doesConditionMatch(
        {
          field: "investment.type",
          operator: "in",
          value: ["BUY", "SELL", "DIVIDEND"],
        },
        {
          amount: "100.00",
          category: null,
          description: "Example Dividend",
          merchant: null,
          rawPayload: {
            type: "DIVIDEND",
          },
        },
      ),
    ).toBe(true);
  });
});
