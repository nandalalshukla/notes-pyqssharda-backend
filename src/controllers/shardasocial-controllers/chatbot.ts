import { Request, Response } from "express";
import { sendError } from "../../utils/apiResponse.js";

export const chatWithBot = async (req: Request, res: Response) => {
  return sendError(res, 501, "Chatbot not implemented", "NOT_IMPLEMENTED");
};

export const clearChatHistory = async (req: Request, res: Response) => {
  return sendError(res, 501, "Chatbot not implemented", "NOT_IMPLEMENTED");
};

export default { chatWithBot, clearChatHistory };
