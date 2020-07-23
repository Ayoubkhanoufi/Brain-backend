const Mailer = require("../services/mail");

describe("Service", function () {
  describe("Mail", function () {
    it("should send email using outlook provider", function (done) {
      const service = new Mailer();

      const payload = {
        to: "soubai@gmail.com",
        subject: "Mocha Test",
      };

      service.setPayload(payload);

      service.setHTML("default", {});

      service
        .send()
        .catch((error) => done(error))
        .then((res) => done());
    });
  });
});
