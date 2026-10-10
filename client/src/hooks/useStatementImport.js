import { useContext } from "react";
import StatementImportContext from "../context/StatementImportContext";

const useStatementImport = () => {
  const context = useContext(StatementImportContext);
  if (!context) throw new Error("Statement Import must be opened within the authenticated app shell");
  return context;
};
export default useStatementImport;
