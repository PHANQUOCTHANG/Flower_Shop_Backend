import { Request, Response, NextFunction } from 'express';

export type AsyncController<T extends Request = Request> = (
  req: T,
  res: Response,
  next: NextFunction
) => Promise<any>;

// Tự động catch error cho controller async
const asyncHandler =
  <T extends Request = Request>(fn: AsyncController<T>) =>
  (req: T, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
