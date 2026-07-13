import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { verifyTotpCode } from "@/lib/totp";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 }, // 8h harte Obergrenze, Idle-Timeout separat im Client
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        code: {},
      },
      authorize: async (credentials) => {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim();
        const password = credentials?.password as string | undefined;
        const code = credentials?.code as string | undefined;

        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) return null;

        if (!code) return null; // 2FA-Code ist immer erforderlich

        if (user.totpEnabled && user.totpSecret) {
          const validCode = verifyTotpCode(user.totpSecret, code);
          if (!validCode) return null;
        } else if (user.totpSecretPending) {
          // Ersteinrichtung wird mit dem ersten gültigen Code abgeschlossen
          const validCode = verifyTotpCode(user.totpSecretPending, code);
          if (!validCode) return null;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              totpSecret: user.totpSecretPending,
              totpSecretPending: null,
              totpEnabled: true,
            },
          });
        } else {
          // Kein 2FA eingerichtet und kein Setup gestartet
          return null;
        }

        await prisma.accessLog.create({
          data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = (user as { id: string }).id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "EMPLOYEE";
      }
      return session;
    },
  },
});
