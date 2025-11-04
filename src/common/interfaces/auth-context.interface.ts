export interface AuthContext {
  req: {
    headers: {
      authorization?: string;
    };
    user?: {
      userId: string;
      username: string;
    };
  };
}

export interface UserPayload {
  userId: string;
  username: string;
}

export const MOCK_USERS = {
  'token-user-1': { userId: 'user-1', username: 'Taiwo' },
  'token-user-2': { userId: 'user-2', username: 'Daniel' },
  'token-user-3': { userId: 'user-3', username: 'Akerele' },
} as const;