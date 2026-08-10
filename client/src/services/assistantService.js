import api from "../api/axios";

const sendAssistantMessage = async ({ message, history = [] }) => {
  const response = await api.post("/assistant/chat", {
    message,
    history,
  });

  return response.data.data;
};

export { sendAssistantMessage };
