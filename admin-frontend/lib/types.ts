// admin-frontend/lib/types.ts

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: boolean;
  role: string;
  organizationId: string | null;
}
