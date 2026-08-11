import {
  createGoalForUser,
  deleteGoalForUser,
  getGoalWithProgressByIdForUser,
  getGoalsForUser,
  updateGoalForUser,
} from "../services/goal.service.js";

const createGoal = async (req, res) => {
  const goal = await createGoalForUser({
    userId: req.user._id,
    timezone: req.user.timezone,
    ...req.validatedData.body,
  });

  res.status(201).json({
    success: true,
    message: "Goal created successfully",
    data: {
      goal,
    },
  });
};

const getGoals = async (req, res) => {
  const goals = await getGoalsForUser({
    userId: req.user._id,
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    results: goals.length,
    data: {
      goals,
    },
  });
};

const getGoal = async (req, res) => {
  const goal = await getGoalWithProgressByIdForUser({
    goalId: req.validatedData.params.goalId,
    userId: req.user._id,
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    data: {
      goal,
    },
  });
};

const updateGoal = async (req, res) => {
  const goal = await updateGoalForUser({
    goalId: req.validatedData.params.goalId,
    userId: req.user._id,
    updates: req.validatedData.body,
    timezone: req.user.timezone,
  });

  res.status(200).json({
    success: true,
    message: "Goal updated successfully",
    data: {
      goal,
    },
  });
};

const deleteGoal = async (req, res) => {
  await deleteGoalForUser({
    goalId: req.validatedData.params.goalId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Goal deleted successfully",
  });
};

export {
  createGoal,
  deleteGoal,
  getGoal,
  getGoals,
  updateGoal,
};
