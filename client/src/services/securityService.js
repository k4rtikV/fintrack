import api from "../api/axios";

const getActiveSessions = async () => {
  const response = await api.get("/security/sessions");
  return response.data;
};

const revokeSession = async (sessionId) => {
  const response = await api.delete(
    `/security/sessions/${sessionId}`,
  );
  return response.data;
};

const revokeOtherSessions = async () => {
  const response = await api.post(
    "/security/sessions/revoke-others",
  );
  return response.data;
};

const getSecurityActivity = async (limit = 20) => {
  const response = await api.get("/security/activity", {
    params: {
      limit,
    },
  });

  return response.data;
};

export {
  getActiveSessions,
  getSecurityActivity,
  revokeOtherSessions,
  revokeSession,
};
