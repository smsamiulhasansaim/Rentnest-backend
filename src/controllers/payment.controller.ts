import { Request, Response } from 'express';
import prisma from '../config/db';
import stripe from '../config/stripe';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

// Create a Stripe Checkout session for an APPROVED rental request
export const createPayment = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.id;
  const { rentalRequestId } = req.body;

  if (!rentalRequestId) {
    throw new AppError('rentalRequestId is required.', 422);
  }

  const rentalRequest = await prisma.rentalRequest.findUnique({
    where: { id: rentalRequestId },
    include: { property: true, payment: true },
  });

  if (!rentalRequest) throw new AppError('Rental request not found.', 404);
  if (rentalRequest.tenantId !== tenantId) {
    throw new AppError('You do not have access to this rental request.', 403);
  }
  if (rentalRequest.status !== 'APPROVED') {
    throw new AppError('Only approved rental requests can be paid for.', 400);
  }
  if (rentalRequest.payment) {
    throw new AppError('A payment already exists for this rental request.', 409);
  }

  const amount = Number(rentalRequest.property.price);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Rent - ${rentalRequest.property.title}`,
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    metadata: {
      rentalRequestId: rentalRequest.id,
      tenantId,
    },
  });

  const payment = await prisma.payment.create({
    data: {
      transactionId: session.id,
      amount,
      provider: 'STRIPE',
      status: 'PENDING',
      rentalRequestId: rentalRequest.id,
      tenantId,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Payment session created successfully',
    errorDetails: null,
    data: { checkoutUrl: session.url, payment },
  });
});

// Confirm payment - called from client redirect or webhook
export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    throw new AppError('sessionId is required.', 422);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  const payment = await prisma.payment.findUnique({ where: { transactionId: sessionId } });
  if (!payment) throw new AppError('Payment record not found.', 404);

  if (session.payment_status === 'paid') {
    const updated = await prisma.payment.update({
      where: { transactionId: sessionId },
      data: { status: 'COMPLETED', paidAt: new Date() },
    });

    await prisma.rentalRequest.update({
      where: { id: payment.rentalRequestId },
      data: { status: 'ACTIVE' },
    });

    return res.status(200).json({
      success: true,
      message: 'Payment confirmed successfully',
      errorDetails: null,
      data: updated,
    });
  }

  const updated = await prisma.payment.update({
    where: { transactionId: sessionId },
    data: { status: 'FAILED' },
  });

  res.status(200).json({
    success: true,
    message: 'Payment not completed',
    errorDetails: null,
    data: updated,
  });
});

export const getMyPayments = asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.user!.id;

  const payments = await prisma.payment.findMany({
    where: { tenantId },
    include: { rentalRequest: { include: { property: true } } },
    orderBy: { createdAt: 'desc' },
  });

  res.status(200).json({
    success: true,
    message: 'Payment history fetched successfully',
    errorDetails: null,
    data: payments,
  });
});

export const getPaymentById = asyncHandler(async (req: Request, res: Response) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: { rentalRequest: { include: { property: true } } },
  });

  if (!payment) throw new AppError('Payment not found.', 404);
  if (payment.tenantId !== req.user!.id && req.user!.role !== 'ADMIN') {
    throw new AppError('You do not have access to this payment.', 403);
  }

  res.status(200).json({
    success: true,
    message: 'Payment fetched successfully',
    errorDetails: null,
    data: payment,
  });
});

// Stripe webhook - raw body required (configured in index.ts)
export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET as string
    );
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Webhook signature verification failed',
      errorDetails: (err as Error).message,
    });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string };
    const payment = await prisma.payment.findUnique({ where: { transactionId: session.id } });
    if (payment) {
      await prisma.payment.update({
        where: { transactionId: session.id },
        data: { status: 'COMPLETED', paidAt: new Date() },
      });
      await prisma.rentalRequest.update({
        where: { id: payment.rentalRequestId },
        data: { status: 'ACTIVE' },
      });
    }
  }

  res.status(200).json({ received: true });
});
