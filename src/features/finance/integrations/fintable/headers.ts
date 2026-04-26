export const FINTABLE_PROVIDER = "fintable";

export const FINTABLE_ACCOUNT_HEADERS = {
  accountName: "⚡ Account Name",
  balance: "⚡ Balance",
  currency: "⚡ Currency",
  notes: "Notes",
  lastUpdate: "⚡ Last Update",
  institution: "⚡ Institution",
  accountId: "⚡ Account ID",
  rawData: "⚡ Raw Data",
} as const;

export const FINTABLE_TRANSACTION_HEADERS = {
  date: "⚡ Date",
  amount: "⚡ Amount",
  description: "⚡ Description",
  category: "⚡ Category",
  account: "⚡ Account",
  attachment: "Attachment",
  transactionId: "⚡ Transaction ID",
  rawData: "⚡ Raw Data",
} as const;

export const REQUIRED_FINTABLE_ACCOUNT_HEADERS = [
  FINTABLE_ACCOUNT_HEADERS.accountName,
  FINTABLE_ACCOUNT_HEADERS.balance,
  FINTABLE_ACCOUNT_HEADERS.currency,
  FINTABLE_ACCOUNT_HEADERS.lastUpdate,
  FINTABLE_ACCOUNT_HEADERS.institution,
  FINTABLE_ACCOUNT_HEADERS.accountId,
  FINTABLE_ACCOUNT_HEADERS.rawData,
] as const;

export const REQUIRED_FINTABLE_TRANSACTION_HEADERS = [
  FINTABLE_TRANSACTION_HEADERS.date,
  FINTABLE_TRANSACTION_HEADERS.amount,
  FINTABLE_TRANSACTION_HEADERS.description,
  FINTABLE_TRANSACTION_HEADERS.category,
  FINTABLE_TRANSACTION_HEADERS.account,
  FINTABLE_TRANSACTION_HEADERS.transactionId,
  FINTABLE_TRANSACTION_HEADERS.rawData,
] as const;
