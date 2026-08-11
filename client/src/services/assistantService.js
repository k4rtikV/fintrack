import api from "../api/axios";

// Assistant turns can legitimately require multiple server-side AI/tool steps.
// Keep this endpoint-specific timeout above the shared 15s API default without
// slowing down or masking timeouts for the rest of FinTrack.
const ASSISTANT_REQUEST_TIMEOUT_MS = 90000;

const sendAssistantMessage = async ({ message, history = [] }) => {
  const response = await api.post(
    "/assistant/chat",
    {
      message,
      history,
    },
    {
      timeout: ASSISTANT_REQUEST_TIMEOUT_MS,
    },
  );

  return response.data.data;
};

export { sendAssistantMessage };
