export const formatAmount = (amount) =>
  amount === null ? '' : `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
