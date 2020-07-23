const nodemailer = require("nodemailer");

class OutlookProvider {
  constructor(options = {}) {
    this.transporter = nodemailer.createTransport(options);
  }

  getTransporter() {
    return this.transporter;
  }
}

module.exports = OutlookProvider;
