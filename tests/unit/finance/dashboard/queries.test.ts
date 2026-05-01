import { describe, expect, it } from "vitest";

import { extractRawTransactionDetails } from "@/features/finance/dashboard/queries";

describe("finance dashboard query helpers", () => {
  it("extracts raw transaction details from Plaid-style payloads", () => {
    expect(
      extractRawTransactionDetails({
        category: ["Food and Drink", "Restaurants", "Fast Food"],
        merchant_name: "Example Cafe",
        name: "EXAMPLE CAFE 123",
        personal_finance_category: {
          confidence_level: "VERY_HIGH",
          detailed: "FOOD_AND_DRINK_FAST_FOOD",
          primary: "FOOD_AND_DRINK",
        },
      }),
    ).toEqual({
      rawCategoryPath: "Food and Drink > Restaurants > Fast Food",
      rawDescription: "EXAMPLE CAFE 123",
      rawMerchantName: "Example Cafe",
      rawPersonalFinanceConfidence: "VERY_HIGH",
      rawPersonalFinanceDetailed: "FOOD_AND_DRINK_FAST_FOOD",
      rawPersonalFinancePrimary: "FOOD_AND_DRINK",
    });
  });

  it("handles scalar category values and non-string primitives", () => {
    expect(
      extractRawTransactionDetails({
        category: 42,
        merchant_name: true,
        name: "  Statement Name  ",
      }),
    ).toMatchObject({
      rawCategoryPath: "42",
      rawDescription: "Statement Name",
      rawMerchantName: "true",
    });
  });

  it("normalizes missing and empty raw details to null", () => {
    expect(
      extractRawTransactionDetails({
        category: [],
        merchant_name: "",
        name: "   ",
        personal_finance_category: null,
      }),
    ).toEqual({
      rawCategoryPath: "",
      rawDescription: null,
      rawMerchantName: null,
      rawPersonalFinanceConfidence: null,
      rawPersonalFinanceDetailed: null,
      rawPersonalFinancePrimary: null,
    });

    expect(extractRawTransactionDetails(null)).toEqual({
      rawCategoryPath: null,
      rawDescription: null,
      rawMerchantName: null,
      rawPersonalFinanceConfidence: null,
      rawPersonalFinanceDetailed: null,
      rawPersonalFinancePrimary: null,
    });
  });
});
