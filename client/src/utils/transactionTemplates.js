const LEGACY_STORAGE_KEY = "fintrack_transaction_templates";
const STORAGE_PREFIX = "fintrack_transaction_templates:";

const getUserStorageId = (user) =>
  user?._id || user?.id || user?.email || "anonymous";

const getStorageKey = (user) =>
  `${STORAGE_PREFIX}${getUserStorageId(user)}`;

const discardLegacyTemplates = () => {
  try {
    // Older FinTrack builds used one shared key for every account in the
    // browser. Do not migrate it automatically because that could expose one
    // account's finance template data to another account on a shared device.
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Template storage is optional.
  }
};

const readTemplates = (user) => {
  try {
    discardLegacyTemplates();
    const parsed = JSON.parse(
      localStorage.getItem(getStorageKey(user)) || "[]",
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeTemplates = (user, templates) => {
  localStorage.setItem(
    getStorageKey(user),
    JSON.stringify(templates.slice(0, 12)),
  );
};

const saveTemplate = (transaction, user) => {
  const templates = readTemplates(user);
  const template = {
    id: crypto.randomUUID(),
    name: transaction.title,
    type: transaction.type,
    title: transaction.title,
    amount: transaction.amount,
    accountId: transaction.account?._id || transaction.account,
    categoryId: transaction.category?._id || transaction.category,
    paymentMethod: transaction.paymentMethod,
    tags: transaction.tags || [],
    note: transaction.note || "",
  };

  writeTemplates(user, [template, ...templates]);
  return template;
};

const deleteTemplate = (templateId, user) => {
  const templates = readTemplates(user).filter(
    (template) => template.id !== templateId,
  );
  writeTemplates(user, templates);
  return templates;
};

export { deleteTemplate, readTemplates, saveTemplate };
