import apiClient from './authApi.js';

export const getDietEntries = async (params = {}) => {
    const response = await apiClient.get('/diet/entries', {params});
    return response.data;
};

export const createDietEntry = async (entryData) => {
    const response = await apiClient.post('/diet/entries', entryData);
    return response.data;
};

export const updateDietEntry = async (entryId, entryData) => {
    const response = await apiClient.put(`/diet/entries/${entryId}`, entryData);
    return response.data;
};

export const deleteDietEntry = async (entryId) => {
    const response = await apiClient.delete(`/diet/entries/${entryId}`);
    return response.data;
};

export const toggleDietFavorite = async (entryId, isFavorite) => {
    const response = await apiClient.patch(`/diet/entries/${entryId}/favorite`, {
        is_favorite: isFavorite,
    });
    return response.data;
};

export const updateDietGoals = async (goals) => {
    const response = await apiClient.patch('/diet/goals', goals);
    return response.data;
};

export const analyzeDietImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await apiClient.post('/diet/ai/analyze-image', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
    });
    return response.data;
};

export const getDietCoachFeedback = async (payload) => {
    const response = await apiClient.post('/diet/ai/coach', payload);
    return response.data;
};

