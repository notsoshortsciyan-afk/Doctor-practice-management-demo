// Single source of truth for currency formatting (Bangladeshi Taka, whole-number).
export const money = (n: number) => `৳${n.toLocaleString("en-BD", { maximumFractionDigits: 0 })}`;
