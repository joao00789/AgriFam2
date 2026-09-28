import { ApiError } from "../middlewares/errorHandler.js";

export const parseIdParam = (raw: string | string[] | undefined) => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "ID inválido.");
  return id;
};
