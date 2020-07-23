const OutlookProvider = require("./providers/outlook");
const ejs = require("ejs");
const fs = require("fs");

class Mailer {
  constructor(options = {}) {
    const provider = new OutlookProvider(options);
    this.provider = provider.getTransporter();

    this.template = "default.js";

    this.payload = {
      from: null,
      
      replyTo: null,
      to: null,
      subject: null,
      cc: null,
      bcc: null,
      text: null,
      html: null,
      attachments: null
    };
  }

  setPayload(options) {
    this.payload = {
      from: options.from || "dev@pulse.digital",
      replyTo: options.replyTo || "dev@pulse.digital",
      to: options.to || null,
      subject: options.subject || null,
      cc: options.cc || null,
      bcc: options.bcc || null,
      text: options.text || null,
      html: options.html || null,
      attachments: options.attachments || null
    };
  }

  setHTML(template, data) {
    this.setTemplate(template);
    this.payload.html = ejs.render(this.template, data);
  }

  setTemplate(template) {
    const tpl = template || this.template;

    const content = fs.readFileSync(
      `./services/mail/templates/${tpl}.ejs`,
      "utf-8"
    );

    this.template = content;
  }

  send() {
    return this.provider.sendMail(this.payload);
  }
}

module.exports = Mailer;
