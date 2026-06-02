import axios from 'axios';

export const getMemberCount = async () => {
  const response = await axios.get('/api/stats/public/member-count');
  return response.data;
};
