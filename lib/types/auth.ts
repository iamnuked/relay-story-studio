export type AuthSession = {
  userId: string;
  email: string;
  nickname: string;
  expiresAt: string;
};

export type AuthUser = {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
};
