module.exports = (brain, cb) => {
  brain.lazydb.$register("pulseProjects", {
    name: { type: String, required: true },
    nr: { type: String, required: true, unique: true },
    start_date: { type: Date },
    end_date: { type: Date },
    comment: { type: String },
    pr_invoice_type_amount: { type: String },
    pr_budget_type_amount: { type: String },
  });

  cb();
};
