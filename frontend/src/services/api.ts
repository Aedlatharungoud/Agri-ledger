import axios from "axios";

/*
 * IMPORTANT:
 * Use localhost consistently.
 *
 * React:
 * http://localhost:5173
 *
 * Flask:
 * http://localhost:5000
 *
 * Do NOT use 127.0.0.1 here while the frontend
 * is running on localhost.
 */

const api = axios.create({
  baseURL: "http://localhost:5000/api",

  /*
   * Required for Flask session cookies.
   */
  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },
});

export default api;