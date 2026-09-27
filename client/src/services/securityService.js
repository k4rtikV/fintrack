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

const getPinStatus = async () => {
  const response = await api.get("/security/pin/status");
  return response.data;
};

const enrollPin = async (pin) => {
  const response = await api.post("/security/pin/enroll", { pin });
  return response.data;
};

const lockPin = async () => {
  const response = await api.post("/security/pin/lock");
  return response.data;
};

const unlockPin = async (pin) => {
  const response = await api.post("/security/pin/unlock", { pin });
  return response.data;
};

const changePin = async ({ currentPin, newPin }) => {
  const response = await api.post("/security/pin/change", {
    currentPin,
    newPin,
  });
  return response.data;
};

const resetPin = async (newPin) => {
  const response = await api.post("/security/pin/reset", { newPin });
  return response.data;
};

const disablePin = async () => {
  const response = await api.delete("/security/pin");
  return response.data;
};

export {
  changePin,
  disablePin,
  enrollPin,
  getActiveSessions,
  getPinStatus,
  getSecurityActivity,
  lockPin,
  resetPin,
  revokeOtherSessions,
  revokeSession,
  unlockPin,
};
