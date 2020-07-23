const Axios = require("axios");

class Bexio {
  constructor(config = {}) {
    this.client = Axios.create({
      baseURL: config.apiBaseUrl,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        Accept: "application/json",
      },
    });
  }

  get(resource, id = "") {
    return this.client.get(`${resource}/${id}`);
  }

  post(resource, payload = {}) {
    return this.client.post(`${resource}`, payload);
  }

  put(resource, payload = {}) {
    return this.client.put(`${resource}`, payload);
  }

  delete(resource, id = "") {
    return this.client.delete(`${resource}/${id}`);
  }
}

module.exports = Bexio;
