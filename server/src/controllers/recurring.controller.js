import {
  createRecurringForUser,
  deleteRecurringForUser,
  getRecurringByIdForUser,
  getRecurringForUser,
  processDueRecurringForUser,
  processSingleRecurringForUser,
  updateRecurringForUser,
} from "../services/recurring.service.js";

const createRecurring = async (req, res) => {
  const recurring = await createRecurringForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });

  res.status(201).json({
    success: true,
    message: "Autopay created successfully",
    data: {
      recurring,
    },
  });
};

const getRecurring = async (req, res) => {
  const recurring = await getRecurringForUser({
    userId: req.user._id,
    includeInactive: req.query.includeInactive !== "false",
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    results: recurring.length,
    data: {
      recurring,
    },
  });
};

const getRecurringById = async (req, res) => {
  const recurring = await getRecurringByIdForUser({
    recurringId: req.validatedData.params.recurringId,
    userId: req.user._id,
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    data: {
      recurring,
    },
  });
};

const updateRecurring = async (req, res) => {
  const recurring = await updateRecurringForUser({
    recurringId: req.validatedData.params.recurringId,
    userId: req.user._id,
    updates: req.validatedData.body,
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    message: "Autopay updated successfully",
    data: {
      recurring,
    },
  });
};

const deleteRecurring = async (req, res) => {
  await deleteRecurringForUser({
    recurringId: req.validatedData.params.recurringId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Autopay deleted successfully",
  });
};

const processRecurring = async (req, res) => {
  const result = await processDueRecurringForUser({
    userId: req.user._id,
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    message:
      result.generatedCount > 0
        ? `${result.generatedCount} Autopay transaction(s) generated`
        : "No Autopay transactions are due",
    data: result,
  });
};

const processSingleRecurring = async (req, res) => {
  const result = await processSingleRecurringForUser({
    recurringId: req.validatedData.params.recurringId,
    userId: req.user._id,
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    message: result.created
      ? "Autopay processed successfully"
      : "This occurrence was already processed",
    data: {
      recurring: result.recurring,
      generated: result.created,
    },
  });
};

export {
  createRecurring,
  deleteRecurring,
  getRecurring,
  getRecurringById,
  processRecurring,
  processSingleRecurring,
  updateRecurring,
};
