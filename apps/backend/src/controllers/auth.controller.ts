import type { NextFunction } from "express";
import type { Request, Response } from "express";
import { client } from "db/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { SignupSchema, LoginSchema } from "comman/types";

export const Register = async (req: Request, res: Response) => {
  const parseResult = SignupSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const { username, email, password } = parseResult.data;

  const exist = await client.user.findUnique({
    where: {
      email: email,
    },
  });

  if (exist) {
    return res.status(400).json({ error: "User already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await client.user.create({
    data:{
       name: username,
       email,
       password: hashedPassword,
    }
  });

  const token = jwt.sign(
    { userId: newUser.id, email: newUser.email },
    process.env.JWT_SECRET as string,
  );

  return res.status(201).json({
    message: "User registered successfully",
    token,
    user: {
      id: newUser.id.toString(),
      email: newUser.email,
      username: newUser.name,
    },
  });
};

export const login = async (req: Request, res: Response) => {
  const parseResult = LoginSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error });
  }

  const { email, password } = parseResult.data;

  const user = await client.user.findUnique({
    where: {
      email: email,
    },
  });

  if (!user) {
    return res.status(400).json({ error: "Invalid email or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ error: "Invalid email or password" });
  }
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET as string,
  );
  return res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user.id.toString(),
      email: user.email,
      username: user.name,
    },
  });
};
