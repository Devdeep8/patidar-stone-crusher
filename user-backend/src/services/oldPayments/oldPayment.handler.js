// src/services/oldPayments/oldPayment.handler.js
import db from '@src/db/models/index.js';
import { BaseHandler } from '@src/libs/base.handler.js';
import { AppError } from '@src/errors/app.error.js';
import Errors from '@src/errors/errorCodes.js';
import { emitEvent } from '@src/events/event.bus.js';
import { EVENTS } from '@src/events/event.types.js';
import { isValidDateString, todayInBusinessTimeZone } from '@src/helpers/time.helpers.js';

const auditActor = (context) => ({
  actorId: context?.userId ?? null,
  actorType: context?.user ? 'user' : 'system',
  actorEmail: context?.user?.email ?? null
});

const { OldPayment } = db;

const AMOUNT_MAX = 9999999;
const PAYER_NAME_MAX_LENGTH = 100;
const NOTE_MAX_LENGTH = 500;

// --- old-payment field rules — owned here, not by the route schema ---
const assertValidAmount = (amount, traceId) => {
  const parsed = Number(amount);
  if (!(parsed > 0) || parsed > AMOUNT_MAX) {
    throw new AppError(Errors.INVALID_INPUT, {
      traceId,
      field: 'amount',
      message: `amount must be a number greater than 0 and at most ${AMOUNT_MAX}`
    });
  }
  return parsed;
};

const parseRequiredText = (value, field, maxLength, traceId) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    throw new AppError(Errors.INVALID_INPUT, {
      traceId,
      field,
      message: `${field} is required`
    });
  }
  if (trimmed.length > maxLength) {
    throw new AppError(Errors.INVALID_INPUT, {
      traceId,
      field,
      message: `${field} must be at most ${maxLength} characters`
    });
  }
  return trimmed;
};

const parseOptionalText = (value, field, maxLength, traceId) => {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return null;
  if (trimmed.length > maxLength) {
    throw new AppError(Errors.INVALID_INPUT, {
      traceId,
      field,
      message: `${field} must be at most ${maxLength} characters`
    });
  }
  return trimmed;
};

export class CreateOldPaymentHandler extends BaseHandler {
  /**
   * Record one old-payment entry: money received now for a pre-app order
   * (no order/customer row exists). Defaults to today; any past date is
   * allowed (the paper book is 10 years old). Runs inside the request
   * transaction started by contextMiddleware(true).
   */
  async run () {
    const { payer_name: payerName, amount, note, date } = this.args;
    const t = this.dbTransaction;

    const validPayerName = parseRequiredText(payerName, 'payer_name', PAYER_NAME_MAX_LENGTH, this.traceId);
    const validAmount = assertValidAmount(amount, this.traceId);
    const validNote = parseOptionalText(note, 'note', NOTE_MAX_LENGTH, this.traceId);

    const paymentDate = date ?? todayInBusinessTimeZone();
    if (!isValidDateString(paymentDate)) {
      throw new AppError(Errors.INVALID_INPUT, {
        traceId: this.traceId,
        field: 'date',
        message: 'date must be a valid YYYY-MM-DD'
      });
    }
    if (paymentDate > todayInBusinessTimeZone()) {
      throw new AppError(Errors.INVALID_INPUT, {
        traceId: this.traceId,
        field: 'date',
        message: 'date cannot be in the future'
      });
    }

    const oldPayment = await OldPayment.create(
      {
        payment_date: paymentDate,
        payer_name: validPayerName,
        amount: validAmount,
        note: validNote,
        created_by: this.context?.userId ?? null
      },
      { transaction: t }
    );

    emitEvent(EVENTS.ENTITY_CREATED, {
      ...auditActor(this.context),
      entity: 'old_payment',
      entityId: oldPayment.id,
      after: oldPayment.toJSON()
    }, this.context);

    return oldPayment;
  }
}

export class ListOldPaymentsHandler extends BaseHandler {
  /**
   * All old-payment entries for one business-local day (defaults to today),
   * newest first, plus a day total — the day-book income shape.
   */
  async run () {
    const { date } = this.args;
    const paymentDate = date ?? todayInBusinessTimeZone();
    if (!isValidDateString(paymentDate) || paymentDate > todayInBusinessTimeZone()) {
      throw new AppError(Errors.INVALID_INPUT, {
        traceId: this.traceId,
        message: 'date must be a valid YYYY-MM-DD and cannot be in the future'
      });
    }

    const oldPayments = await OldPayment.findAll({
      where: { payment_date: paymentDate },
      order: [['created_at', 'DESC']]
    });
    const total = oldPayments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return { date: paymentDate, total, old_payments: oldPayments };
  }
}

export class DeleteOldPaymentHandler extends BaseHandler {
  /**
   * Remove a mistyped entry. Runs inside the request transaction started by
   * contextMiddleware(true).
   */
  async run () {
    const { id } = this.args;
    const t = this.dbTransaction;

    const oldPayment = await OldPayment.findByPk(id, { transaction: t });
    if (!oldPayment) {
      throw new AppError(Errors.NOT_FOUND, { traceId: this.traceId, message: 'Old payment not found' });
    }

    const previous = oldPayment.toJSON();
    await oldPayment.destroy({ transaction: t });

    emitEvent(EVENTS.ENTITY_DELETED, {
      ...auditActor(this.context),
      entity: 'old_payment',
      entityId: id,
      before: previous
    }, this.context);

    return { id };
  }
}
