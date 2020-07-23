module.exports = (brain, cb) => {
  const client = brain.gitlabClient;
  const prefex = "";
  const resource = "projects";

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

  brain.pulse.router.get("/sync", async (req, res) => { });

  brain.pulse.router.get("/projects/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const result = await client.get(`${prefex}${resource}/${id}`);
      return res.json(result.data);
    } catch (error) {
      const status = error.response.status || 500;
      const message = error.response.statusText || "Unexpected error occurred";
      return res.error(status, message);
    }
  });
  brain.pulse.router.get("/projects/:id/issues", async (req, res) => {
    const { id } = req.params;

    try {
      const result = await client.get(`${prefex}${resource}/${id}/issues`);
      return res.json(result.data);
    } catch (error) {
      const status = error.response.status || 500;
      const message = error.response.statusText || "Unexpected error occurred";
      return res.error(status, message);
    }
  });

  cb();
};
