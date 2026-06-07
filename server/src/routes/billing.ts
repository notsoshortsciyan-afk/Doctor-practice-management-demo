import { Router } from "express";
import { z } from "zod";
import { Prisma, type InvoiceStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { serializeInvoice } from "../lib/serialize";

const router = Router();
router.use(requireAuth);

const invoiceInclude = {
  payments: true,
  patient: { select: { id: true, code: true, name: true } },
} satisfies Prisma.InvoiceInclude;

function computeStatus(total: number, paid: number, date: Date): InvoiceStatus {
  if (paid >= total - 0.001) return "Paid";
  if (paid > 0) return "Partial";
  // unpaid & past due (older than 30 days) → Overdue
  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > 30 ? "Overdue" : "Unpaid";
}

async function genInvoiceNumber(): Promise<string> {
  const count = await prisma.invoice.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

// GET /api/billing/invoices?patientId=&status=
router.get(
  "/invoices",
  wrap(async (req, res) => {
    const where: Prisma.InvoiceWhereInput = {};
    if (req.query.patientId) where.patientId = String(req.query.patientId);
    if (req.query.status) where.status = String(req.query.status) as InvoiceStatus;
    const rows = await prisma.invoice.findMany({
      where,
      include: invoiceInclude,
      orderBy: { date: "desc" },
    });
    res.json(rows.map(serializeInvoice));
  })
);

const lineItem = z.object({ description: z.string().min(1), amount: z.coerce.number() });
const createSchema = z.object({
  patientId: z.string().min(1),
  lineItems: z.array(lineItem).min(1),
  date: z.string().optional(),
});

router.post(
  "/invoices",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(createSchema),
  wrap(async (req, res) => {
    const b = req.body as z.infer<typeof createSchema>;
    const total = b.lineItems.reduce((s, li) => s + li.amount, 0);
    const date = b.date ? new Date(b.date) : new Date();
    const inv = await prisma.invoice.create({
      data: {
        patientId: b.patientId,
        number: await genInvoiceNumber(),
        date,
        total,
        status: computeStatus(total, 0, date),
        lineItems: b.lineItems as Prisma.InputJsonValue,
      },
      include: invoiceInclude,
    });
    res.status(201).json(serializeInvoice(inv));
  })
);

const paymentSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.string().optional(),
});

router.post(
  "/invoices/:id/payments",
  requireRole("DOCTOR", "RECEPTIONIST"),
  validate(paymentSchema),
  wrap(async (req, res) => {
    const b = req.body as z.infer<typeof paymentSchema>;
    const invoice = await prisma.invoice.findUnique({
      where: { id: req.params.id },
      include: { payments: true },
    });
    if (!invoice) throw new HttpError(404, "Invoice not found");

    await prisma.payment.create({
      data: { invoiceId: invoice.id, amount: b.amount, method: b.method ?? "Cash" },
    });

    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0) + b.amount;
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: computeStatus(invoice.total, paid, invoice.date) },
      include: invoiceInclude,
    });
    res.json(serializeInvoice(updated));
  })
);

export default router;
