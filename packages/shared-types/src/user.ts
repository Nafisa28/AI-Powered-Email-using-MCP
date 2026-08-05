export interface UserDto {
  id: string;
  name: string;
  email: string;
  authProvider: string;
  createdAt: string;
}

export interface EmailAccountDto {
  id: string;
  userId: string;
  provider: 'GMAIL' | 'OUTLOOK';
  providerEmail: string;
  connectedAt: string;
}

export interface AuthResponse {
  token: string;
  user: UserDto;
}
