import { Router } from 'express';
import OldPaymentsController from '@controllers/oldPayments.controller.js';
import asyncHandler from '@src/utils/async-handler.js';
import contextMiddleware from '@src/rest-resources/middlewares/context.middleware.js';
import isUserAuthenticated from '@src/rest-resources/middlewares/isUserAuthenticated.middleware.js';
import requestValidationMiddleware from '@src/rest-resources/middlewares/requestValidation.middleware.js';
import {
  createOldPaymentSchema,
  listOldPaymentsSchema,
  deleteOldPaymentSchema
} from '@src/json-schemas/oldPayments/oldPayment.schema.js';

const router = Router();

/**
 * @route   POST /api/v1/old-payments
 * @desc    Record money received for a pre-app order (no order/customer; date defaults to today)
 * @access  Private — write, one transaction
 */
router.post(
  '/',
  contextMiddleware(true),
  isUserAuthenticated(),
  requestValidationMiddleware(createOldPaymentSchema),
  asyncHandler(OldPaymentsController.createOldPayment)
);

/**
 * @route   GET /api/v1/old-payments?date=YYYY-MM-DD
 * @desc    One day's old-payment entries + total
 * @access  Private (read — no transaction)
 */
router.get(
  '/',
  contextMiddleware(false),
  isUserAuthenticated(),
  requestValidationMiddleware(listOldPaymentsSchema),
  asyncHandler(OldPaymentsController.listOldPayments)
);

/**
 * @route   DELETE /api/v1/old-payments/:id
 * @desc    Remove a mistyped old-payment entry
 * @access  Private — write, one transaction
 */
router.delete(
  '/:id',
  contextMiddleware(true),
  isUserAuthenticated(),
  requestValidationMiddleware(deleteOldPaymentSchema),
  asyncHandler(OldPaymentsController.deleteOldPayment)
);

export default router;
