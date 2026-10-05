import { getAssistantReply } from "../services/assistant.service.js";

const chatWithAssistant = async (req, res) => {
  const controller = new AbortController();
  const cancelDisconnectedRequest = () => {
    if (!res.writableEnded) {
      controller.abort();
    }
  };

  req.once("aborted", cancelDisconnectedRequest);
  res.once("close", cancelDisconnectedRequest);

  try {
    const result = await getAssistantReply({
      user: req.user,
      ...req.validatedData.body,
      signal: controller.signal,
    });

    if (controller.signal.aborted || res.writableEnded) {
      return;
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    throw error;
  } finally {
    req.off("aborted", cancelDisconnectedRequest);
    res.off("close", cancelDisconnectedRequest);
  }
};

export { chatWithAssistant };
