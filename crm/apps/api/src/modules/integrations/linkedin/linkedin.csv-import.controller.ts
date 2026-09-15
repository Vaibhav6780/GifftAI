import type { Request, Response } from "express";
import type { ApiResponse } from "@gifftai/shared";
import { asyncHandler } from "../../../lib/asyncHandler";
import { AppError } from "../../../lib/apiError";
import { linkedinCsvImportService } from "./linkedin.csv-import.service";

export const linkedinCsvImportController = {
  import: asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    if (!file) throw AppError.badRequest("No CSV file uploaded");

    const result = await linkedinCsvImportService.importCsv(file.buffer);
    const body: ApiResponse<typeof result> = { success: true, data: result };
    res.status(200).json(body);
  }),
};
