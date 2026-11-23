import { HttpError } from "wasp/server";
import type { OnAfterSignupHook, OnAfterLoginHook } from "wasp/server/auth";
import { emailSender } from "wasp/server/email";

export const onAfterSignup: OnAfterSignupHook = async ({ providerId, user, oauth, prisma }) => {
  await prisma.userPreferences.create({
    data: {
      userId: user.id,
      timezone: "UTC",
      notifyOn: { assigned: true, mentioned: true, reviewRequested: true, statusChanged: true, commentAdded: true, evidenceAdded: true, dailyDigest: true, weeklyReport: true },
      theme: "system",
    },
  });

  try {
    await emailSender.send({
      from: { name: "Great Spring", email: "noreply@greatspring.io" },
      to: user.email,
      subject: "Welcome to Great Spring Solutions!",
      text: `Hi ${user.name || "there"},\n\nWelcome to Great Spring Solutions — your agentic delivery workspace!\n\nGet started at ${process.env.WASP_WEB_CLIENT_URL}/dashboard.\n\n— The Great Spring Team`,
      html: `<h1>Welcome to Great Spring Solutions!</h1><p>Hi ${user.name || "there"},</p><p>Welcome to <strong>Great Spring Solutions</strong> — your agentic delivery workspace!</p><p>Get started at <a href="${process.env.WASP_WEB_CLIENT_URL}/dashboard">${process.env.WASP_WEB_CLIENT_URL}/dashboard</a>.</p><hr><p>— The Great Spring Team</p>`,
    });
  } catch (error) { console.error("Welcome email failed:", error); }

  if (oauth) console.log("OAuth signup:", oauth.providerName, oauth.tokens.accessToken);
};

export const onAfterLogin: OnAfterLoginHook = async ({ providerId, user, oauth, prisma }) => {
  console.log(`User logged in: ${user.email} (${user.role})`);
  if (oauth) console.log("OAuth login:", oauth.providerName, oauth.tokens.accessToken);
};