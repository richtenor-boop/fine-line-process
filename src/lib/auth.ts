import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      roleId: string;
      roleName: string;
      name: string;
      email: string;
    };
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId?: string;
    organizationId?: string;
    roleId?: string;
    roleName?: string;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Proxy defaults to the Node.js runtime in Next.js 16, so a single config (Prisma + bcrypt
  // included) works everywhere — no edge-safe auth.config.ts split needed. See docs/01-architecture.md §5.
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { role: true },
        });
        if (!user || user.deletedAt || user.status !== "ACTIVE") return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          organizationId: user.organizationId,
          roleId: user.roleId,
          roleName: user.role.name,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.organizationId = (user as { organizationId: string }).organizationId;
        token.roleId = (user as { roleId: string }).roleId;
        token.roleName = (user as { roleName: string }).roleName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && token.organizationId && token.roleId) {
        session.user.id = token.userId;
        session.user.organizationId = token.organizationId;
        session.user.roleId = token.roleId;
        session.user.roleName = token.roleName ?? "";
      }
      return session;
    },
  },
});
