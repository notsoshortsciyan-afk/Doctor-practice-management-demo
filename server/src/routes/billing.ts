import { Router } from "express";
import { z } from "zod";
import { Prisma, type InvoiceStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { validate, wrap } from "../middleware/validate";
import { requireAuth, requireRole } from "../middleware/auth";
import { HttpError } from "../middleware/error";
import { serializeInvoice } from "../lib/serialize";
import { nextInvoiceNumber } from "../lib/invoiceNumber";

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

// GET /api/billing/invoices?patientId=&status=
router.get(
  "/invoices",
  wrap(async (req, res) => {
    const where: Prisma.InvoiceWhereInput = {};
    if (req.query.patientId) where.patientId = String(req.query.patientId);
    if (req.query.status) where.status = String(req.query.status) as InvoiceStatus;
    const rows = await prisma.invoice.findMany({
      // One SQL statement for rows + relations (payments/patient) — the remote DB
      // makes per-relation round trips the dominant cost.
      relationLoadStrategy: "join",
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
      relationLoadStrategy: "join",
      data: {
        patientId: b.patientId,
        number: await nextInvoiceNumber(),
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

    // Batch the read + insert into one transaction round trip. Statements run in
    // order on one connection, so `invoice.payments` still excludes the new payment
    // and the `+ b.amount` arithmetic below stays correct. A missing invoice either
    // reads null or trips the payment's FK (P2003) — both become the same 404.
    let invoice;
    try {
      [invoice] = await prisma.$transaction([
        prisma.invoice.findUnique({
          where: { id: req.params.id },
          include: { payments: true },
        }),
        prisma.payment.create({
          data: { invoiceId: req.params.id, amount: b.amount, method: b.method ?? "Cash" },
        }),
      ]);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
        throw new HttpError(404, "Invoice not found");
      }
      throw e;
    }
    if (!invoice) throw new HttpError(404, "Invoice not found");

    const paid = invoice.payments.reduce((s, p) => s + p.amount, 0) + b.amount;
    const updated = await prisma.invoice.update({
      relationLoadStrategy: "join",
      where: { id: invoice.id },
      data: { status: computeStatus(invoice.total, paid, invoice.date) },
      include: invoiceInclude,
    });
    res.json(serializeInvoice(updated));
  })
);

export default router;
