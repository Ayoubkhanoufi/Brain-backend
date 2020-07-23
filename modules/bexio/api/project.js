module.exports = (brain, cb) => {
  const client = brain.bexio;
  let prefex = "pr_";
  let resource = "project";

  brain.pulse.router.get("/projects", async (req, res) => {
    try {
      const result = await client.get(`${prefex}${resource}`);
      return res.json(result.data);
    } catch (error) {
      const status = error.response.status || 500;
      const message = error.response.statusText || "Unexpected error occurred";
      return res.error(status, message);
    }
  });

  brain.pulse.router.get("/projects/sync", async (req, res) => {
    try {
      const result = await client.get(`${prefex}${resource}`);
      // return res.json(result.data);

      result.data.forEach(async (item) => {
        const { nr, id } = item;

        if (id) {
          item.bexioId = id;
        }

        await brain.lazydb.pulseProjects
          .updateOne({ nr }, { $set: item }, { upsert: true, new: true })
          .exec();
      });

      setTimeout(async (_) => {
        const projects = await brain.lazydb.pulseProjects.find({}).lean();

        res.json(projects);
      }, 500);
    } catch (error) {
      const status = error.response ? error.response.status : 500;
      const message = error.response
        ? error.response.statusText
        : "Unexpected error occurred";
      return res.error(status, message);
    }
  });

  brain.pulse.router.post("/timesheets/:id", async (req, res) => {
    const { id } = req.params;
    try {
      resource = "timesheet";
      prefex = "";

      const result = await client.post(`${prefex}${resource}/search`, [
        {
          field: "pr_project_id",
          value: id,
          criteria: "=",
        }
      ]);
      return res.json(result.data);
    } catch (error) {
      const status = error.response.status || 500;
      const message = error.response.statusText || "Unexpected error occurred";
      return res.error(status, message);
    }
  });

  brain.pulse.router.get("/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await client.get(`${prefex}${resource}/${id}`);
      return res.json(result.data);
    } catch (error) {
      const status = error.response.status || 500;
      const message = error.response.statusText || "Unexpected error occurred";
      return res.error(status, message);
    }
  });

  cb();
};
