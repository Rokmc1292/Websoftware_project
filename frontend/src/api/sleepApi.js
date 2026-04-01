import apiClient from "./authApi.js";

export const getSleepRecords = async () => {
  const response = await apiClient.get("/sleep-records");
  return response.data;
};

export const getSleepRecordByDate = async (recordDate) => {
  const response = await apiClient.get(`/sleep-records/${recordDate}`);
  return response.data;
};

export const saveSleepRecord = async (payload) => {
  const response = await apiClient.post("/sleep-records", payload);
  return response.data;
};

export const getSleepCoachFeedback = async (payload) => {
  const response = await apiClient.post("/sleep-coach", payload);
  return response.data;
};