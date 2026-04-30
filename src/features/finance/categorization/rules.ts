import type { FinanceCategoryRuleCondition } from "@/server/db/schema";

export type CategorizationTransactionInput = {
  amount: string;
  category: string | null;
  description: string;
  merchant: string | null;
  rawPayload: Record<string, unknown> | null;
};

export type CategoryRuleForEvaluation = {
  id: string;
  categoryId: string;
  priority: number;
  matchLogic: string;
  conditions: FinanceCategoryRuleCondition[];
};

export type CategoryRuleMatch = {
  rule: CategoryRuleForEvaluation;
  confidence: number;
};

export function findBestCategoryRuleMatch({
  rules,
  transaction,
}: {
  rules: CategoryRuleForEvaluation[];
  transaction: CategorizationTransactionInput;
}): CategoryRuleMatch | null {
  const matches = rules
    .filter((rule) => doesRuleMatch(rule, transaction))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return getRuleSpecificity(right) - getRuleSpecificity(left);
    });

  if (matches.length === 0) {
    return null;
  }

  const bestRule = matches[0];

  return {
    rule: bestRule,
    confidence: Math.min(100, 60 + getRuleSpecificity(bestRule) * 8),
  };
}

export function doesRuleMatch(
  rule: CategoryRuleForEvaluation,
  transaction: CategorizationTransactionInput,
) {
  if (rule.conditions.length === 0) {
    return false;
  }

  const results = rule.conditions.map((condition) =>
    doesConditionMatch(condition, transaction),
  );

  return rule.matchLogic === "any"
    ? results.some(Boolean)
    : results.every(Boolean);
}

export function doesConditionMatch(
  condition: FinanceCategoryRuleCondition,
  transaction: CategorizationTransactionInput,
) {
  const actual = getFieldValue(condition.field, transaction);

  if (isComparableOperator(condition.operator)) {
    return matchesComparableOperator(condition, actual);
  }

  if (isTextOperator(condition.operator)) {
    return matchesTextOperator(condition, actual);
  }

  if (isAmountOperator(condition.operator)) {
    return matchesAmountOperator(condition, transaction.amount);
  }

  if (String(condition.operator) === "exists") {
    return actual !== null && actual !== undefined && actual !== "";
  }

  return false;
}

function isComparableOperator(
  operator: FinanceCategoryRuleCondition["operator"],
) {
  return (
    operator === "equals" || operator === "not_equals" || operator === "in"
  );
}

function isTextOperator(operator: FinanceCategoryRuleCondition["operator"]) {
  return (
    operator === "contains" ||
    operator === "contains_any" ||
    operator === "starts_with" ||
    operator === "regex"
  );
}

function isAmountOperator(operator: FinanceCategoryRuleCondition["operator"]) {
  return operator === "amount_less_than" || operator === "amount_greater_than";
}

function matchesComparableOperator(
  condition: FinanceCategoryRuleCondition,
  actual: unknown,
) {
  switch (condition.operator) {
    case "equals":
      return (
        normalizeComparable(actual) === normalizeComparable(condition.value)
      );
    case "not_equals":
      return (
        normalizeComparable(actual) !== normalizeComparable(condition.value)
      );
    case "in":
      return Array.isArray(condition.value)
        ? condition.value
            .map((value) => normalizeComparable(value))
            .includes(normalizeComparable(actual))
        : false;
    default:
      return false;
  }
}

function matchesTextOperator(
  condition: FinanceCategoryRuleCondition,
  actual: unknown,
) {
  switch (condition.operator) {
    case "contains":
      return valueContains(actual, condition.value);
    case "contains_any":
      return Array.isArray(condition.value)
        ? condition.value.some((expected) => valueContains(actual, expected))
        : false;
    case "starts_with":
      return String(actual ?? "")
        .toLowerCase()
        .startsWith(String(condition.value ?? "").toLowerCase());
    case "regex":
      return regexMatches(actual, condition.value);
    default:
      return false;
  }
}

function matchesAmountOperator(
  condition: FinanceCategoryRuleCondition,
  amount: string,
) {
  switch (condition.operator) {
    case "amount_less_than":
      return Number(amount) < Number(condition.value);
    case "amount_greater_than":
      return Number(amount) > Number(condition.value);
    default:
      return false;
  }
}

export function getFieldValue(
  field: string,
  transaction: CategorizationTransactionInput,
) {
  if (field === "amount") {
    return transaction.amount;
  }

  if (field === "category") {
    return transaction.category;
  }

  if (field === "description") {
    return transaction.description;
  }

  if (field === "merchant") {
    return transaction.merchant;
  }

  const rawPayload = transaction.rawPayload ?? {};
  const normalizedField = field
    .replace(/^raw\./, "")
    .replace(/^investment\./, "")
    .replace(/^personal_finance_category\./, "personal_finance_category.");

  return getPathValue(rawPayload, normalizedField);
}

function getPathValue(source: Record<string, unknown>, path: string) {
  return path.split(".").reduce<unknown>((current, segment) => {
    if (current && typeof current === "object" && segment in current) {
      return (current as Record<string, unknown>)[segment];
    }

    return undefined;
  }, source);
}

function valueContains(actual: unknown, expected: unknown) {
  const expectedValue = String(expected ?? "").toLowerCase();

  if (expectedValue.length === 0) {
    return false;
  }

  if (Array.isArray(actual)) {
    return actual.some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(expectedValue),
    );
  }

  return String(actual ?? "")
    .toLowerCase()
    .includes(expectedValue);
}

function regexMatches(actual: unknown, expected: unknown) {
  if (typeof expected !== "string" || expected.length === 0) {
    return false;
  }

  try {
    return new RegExp(expected, "i").test(String(actual ?? ""));
  } catch {
    return false;
  }
}

function normalizeComparable(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function getRuleSpecificity(rule: CategoryRuleForEvaluation) {
  return rule.conditions.reduce((score, condition) => {
    if (condition.field === "merchant_entity_id") {
      return score + 8;
    }

    if (condition.field === "merchant" || condition.field === "merchant_name") {
      return score + 7;
    }

    if (condition.field === "personal_finance_category.detailed") {
      return score + 6;
    }

    if (condition.field === "raw.category") {
      return score + 4;
    }

    if (condition.field === "personal_finance_category.primary") {
      return score + 3;
    }

    return score + 1;
  }, 0);
}
