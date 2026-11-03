// src/db/models/oldPayment.model.js
// One row = one "old payment received" entry: money collected now for a
// pre-app order that was never entered in the system (the 10-year paper-book
// era). No order, no customer — just who paid, how much, and the business day
// the money arrived, so it counts in that day's received/in-hand totals.
export default (sequelize, DataTypes) => {
  const OldPayment = sequelize.define('OldPayment', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    payment_date: {
      // Business-local calendar day the money arrived (YYYY-MM-DD, Asia/Kolkata)
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    payer_name: {
      // Who paid — free text (name from the old book, village, etc.)
      type: DataTypes.STRING(100),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: 0.01
      }
    },
    note: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    created_by: {
      // Logical ref to users.id — no FK (loose coupling between backends)
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'old_payments',
    underscored: true,
    timestamps: true
  });

  // Serialize to the API contract: snake_case keys, plain numbers
  OldPayment.prototype.toJSON = function () {
    const values = { ...this.get() };
    return {
      id: values.id,
      payment_date: values.payment_date,
      payer_name: values.payer_name,
      amount: Number(values.amount),
      note: values.note ?? null,
      created_by: values.created_by ?? null,
      created_at: values.createdAt,
      updated_at: values.updatedAt
    };
  };

  return OldPayment;
};
