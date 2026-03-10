// Global Express augmentation — adds userId to every Request
// This means ALL route handlers can use req.userId without importing AuthRequest
declare namespace Express {
  interface Request {
    userId?: string;
  }
}
