module.exports = (brain, cb) => {
    brain.lazydb.$register("pulseOffers", {
      title: { type: String, required: true },
      is_valid_from: { type: Date },
      is_valid_until: { type: Date },
      header: { type: String },
      footer: { type: String },
    });
  
    cb();
  };
  