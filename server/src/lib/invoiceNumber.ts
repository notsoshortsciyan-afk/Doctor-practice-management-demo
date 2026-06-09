import { prisma } from "./prisma";

// Next invoice number for the current year, e.g. "INV-2026-0007".
//
// The suffix is derived from the HIGHEST existing number for this year's prefix
// — NOT from prisma.invoice.count(). A count-based scheme (count + 1) reuses a
// number whenever an invoice is deleted (count drops below the live max), and
// the `number` column is @unique, so the next insert blows up with
// "Unique constraint failed on the fields: (`number`)". Taking max-suffix + 1
// can never collide with an existing row.
//
// Suffixes are zero-padded to 4 digits, so a lexical `orderBy desc` matches
// numeric order up to 9999 invoices/year (well beyond a solo chamber's volume).
export async function nextInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const latest = await prisma.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const lastSeq = latest ? parseInt(latest.number.slice(prefix.length), 10) : 0;
  const seq = Number.isFinite(lastSeq) ? lastSeq : 0;
  return `${prefix}${String(seq + 1).padStart(4, "0")}`;
}
