import axios from "axios";

const api = axios.create({
    baseURL: "https://omnistack-backend-erik.herokuapp.com"
});
export default api;
