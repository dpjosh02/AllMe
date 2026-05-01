export type RecentTransaction = {
  id: string;
  accountId: string;
  postedDate: string;
  description: string;
  amount: string;
  currency: string;
  storedCategory: string | null;
  assignedCategoryId: string | null;
  assignedCategoryName: string | null;
  assignedCategoryColor: string | null;
  categoryAssignmentSource:
    | "manual"
    | "rule"
    | "system"
    | "uncategorized"
    | null;
  accountName: string;
  rawDescription: string | null;
  rawMerchantName: string | null;
  rawCategoryPath: string | null;
  rawPersonalFinancePrimary: string | null;
  rawPersonalFinanceDetailed: string | null;
  rawPersonalFinanceConfidence: string | null;
};

export type AccountOption = {
  id: string;
  name: string;
  displayName: string | null;
};

export type CategoryOption = {
  id: string;
  name: string;
  slug: string;
  color: string;
  includeInIncome: boolean;
  includeInSpending: boolean;
  transactionCount: number;
};

export type TagMatchField =
  | "description"
  | "rawCategoryPath"
  | "rawMerchantName"
  | "rawPersonalFinanceDetailed"
  | "rawPersonalFinancePrimary";

export type TagMatchFieldOption = {
  description: string;
  id: TagMatchField;
  label: string;
};
