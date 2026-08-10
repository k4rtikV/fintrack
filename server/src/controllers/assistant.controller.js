import { getAssistantReply } from "../services/assistant.service.js";

const chatWithAssistant = async (req, res) => {
  const result = await getAssistantReply({
    user: req.user,
    ...req.validatedData.body,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
};

export { chatWithAssistant };
