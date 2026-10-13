import { DefaultSession } from "next-auth";

/**
 * The three account kinds this platform has.
 *
 * - `teacher`       a customer. Uses the installed app; the website is only for
 *                   registration, payment, activation and downloads.
 * - `admin`         internal staff. Full access to the internal LMS.
 * - `sales_agent`   internal, narrowed. Registers customers, records payments and
 *                   issues activation codes; cannot publish course content.
 */
export type UserRole = "teacher" | "admin" | "sales_agent";

/** Roles that may open the internal LMS at all. */
export type InternalRole = "admin" | "sales_agent";

declare module "next-auth" {
  interface Session {
    user: { id: string; role: UserRole } & DefaultSession["user"];
  }
  interface User {
    role?: UserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: UserRole;
  }
}
