import apiClient from "./authApi.js";

export const connectFitbit = async () => {
  const response = await apiClient.get("/fitbit/connect");
  return response.data;
};

export const getFitbitStatus = async () => {
  const response = await apiClient.get("/fitbit/status");
  return response.data;
};

export const getFitbitSleepByDate = async (date) => {
  const response = await apiClient.get(`/fitbit/sleep/${date}`);
  return response.data;
};