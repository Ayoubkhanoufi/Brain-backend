
const passport = require("passport");
var ObjectID = require('mongoose').Types.ObjectId

module.exports = (brain, cb) => {
  brain.pulse.router.get("/projects", /*passport.authenticate("jwt", { session: false }),*/ async (req, res) => {
    try {
      const result = await brain.lazydb.pulseProjects.find({}).lean().exec();
      return res.json(result);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.post("/projects", async (req, res) => {
    try {
      const data = req.body;
      const result = new brain.lazydb.pulseProjects(data);
      const project = await result.save();
      return res.status(201).json(project);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.get("/projects/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (id == null) {
        return res.error(400, "Bad request");
      }
      const result = await brain.lazydb.pulseProjects
        .findById(ObjectID(id))
        .lean()
        .exec();
      return res.json(result);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.put("/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = req.body;

      const project = await brain.lazydb.pulseProjects.findByIdAndUpdate(
        ObjectID(id),
        { $set: data },
        { new: true }
      );

      return res.json(project);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.delete("/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;

      const project = await brain.lazydb.pulseProjects.findByIdAndRemove(ObjectID(id));

      return res.json(project);
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.get("/count", async (req, res) => {
    try {

      const pCount = await brain.lazydb.pulseProjects.count({});
      return res.json(pCount)
      
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  brain.pulse.router.get("/perMount", async (req, res) => {
    try {
      const pCount = await brain.lazydb.pulseProjects
      .aggregate([
        {$group: {
            _id: {$month: "$start_date"}, 
            numberofproject: {$sum: 1} 
            }
        },
        {
          $sort : { _id: 1 }
        }
      ]);

      return res.json(pCount);
      
    } catch (error) {
      return res.error(400, "Something goes wrong");
    }
  });

  cb();
};
