import { connectToDatabase } from "@/lib/db/mongoose";
import { badRequest, conflict, unauthorized } from "@/lib/server/errors";
import { hashPassword, verifyPassword } from "@/lib/security/password";
import type { LoginRequest, SignupRequest } from "@/lib/types/api";
import { UserModel } from "@/models";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePassword(password: string) {
  return password.length >= 8;
}

function validateNickname(nickname: string) {
  const trimmed = nickname.trim();
  return trimmed.length >= 2 && trimmed.length <= 24;
}

export async function signupUser(input: SignupRequest) {
  const email = normalizeEmail(input.email);
  const nickname = input.nickname.trim();
  const password = input.password;

  if (!validateEmail(email)) {
    throw badRequest("Email must be a valid address.");
  }

  if (!validatePassword(password)) {
    throw badRequest("Password must be at least 8 characters.");
  }

  if (!validateNickname(nickname)) {
    throw badRequest("Nickname must be between 2 and 24 characters.");
  }

  await connectToDatabase();

  const existingUser = await UserModel.findOne({ email });

  if (existingUser) {
    throw conflict("An account with that email already exists.");
  }

  const user = await UserModel.create({
    email,
    passwordHash: hashPassword(password),
    nickname
  });

  return user;
}

export async function loginUser(input: LoginRequest) {
  const email = normalizeEmail(input.email);
  const password = input.password;

  if (!validateEmail(email)) {
    throw badRequest("Email must be a valid address.");
  }

  if (!validatePassword(password)) {
    throw badRequest("Password must be at least 8 characters.");
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw unauthorized("Email or password is incorrect.");
  }

  return user;
}
