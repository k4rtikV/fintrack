const STORAGE_KEY = "fintrack_transaction_templates";

const readTemplates = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const saveTemplate = (transaction) => {
  const templates = readTemplates();
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

  localStorage.setItem(STORAGE_KEY, JSON.stringify([template, ...templates].slice(0, 12)));
  return template;
};

const deleteTemplate = (templateId) => {
  const templates = readTemplates().filter((template) => template.id !== templateId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  return templates;
};

export { deleteTemplate, readTemplates, saveTemplate };
