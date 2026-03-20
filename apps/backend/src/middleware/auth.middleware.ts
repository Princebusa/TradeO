import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";


export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token as string, process.env.JWT_SECRET as string, function(err, decoded) {
    if (err) {
      return res.status(401).json({ error: "Unauthorized" });
    }else{

      (req as any).userId = (decoded as any).userId;
    }
  });

  next();

}