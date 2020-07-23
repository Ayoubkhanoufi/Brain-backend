module.exports = (brain, cb) => {
  brain.pulse.router.get("/offers", async (req, res) => {
    try {
      const result = await brain.lazydb.pulseOffers.find({}).lean().exec();
      return res.json(result);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.post("/offers", async (req, res) => {
    try {
      const data = req.body;
      const result = new brain.lazydb.pulseOffers(data);
      const offer = await result.save();
      return res.status(201).json(offer);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.get("/offers/:id", async (req, res) => {
    try {
      const data = req.body;
      const result = new brain.lazydb.pulseOffers(data);
      const offer = await result.save();
      return res.status(201).json(offer);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.put("/offers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const offer = await brain.lazydb.pulseOffers.findOneAndUpdate(
        id,
        { $set: data },
        { new: true }
      );

      return res.json(offer);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.delete("/offers/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const offer = await brain.lazydb.pulseOffers.findOneAndRemove(id);

      return res.json(offer);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  cb();
};
