const Axios = require("axios");

class Gitlab {
  constructor(config = {}) {
    this.client = Axios.create({
      baseURL: config.host,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/json",
      },
    });
  }

  get(resource, id = "") {
    return this.client.get(`${resource}/${id}`);
  }

  post(resource, id = "", payload = {}) {
    return this.client.post(`${resource}/${id}`, payload);
  }

  put(resource, id = "", payload = {}) {
    return this.client.put(`${resource}/${id}`, payload);
  }

  delete(resource, id = "") {
    return this.client.delete(`${resource}/${id}`);
  }
}

module.exports = Gitlab;
