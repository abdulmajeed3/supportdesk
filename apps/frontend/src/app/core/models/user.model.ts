export type UserRole = 'CUSTOMER' | 'AGENT' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: Omit<User, 'updatedAt'>;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export function fullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return `${user.firstName} ${user.lastName}`;
}
