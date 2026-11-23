/**
 * What the sign-in page says when Google sends someone back with ?error=<code>. Codes come from
 * Better Auth's callback (src/server/auth.ts adds signup_disabled). Anything unknown gets the
 * general line, so a made-up code in the address cannot put arbitrary text on the page.
 */
export function googleErrorMessage(code: string | undefined): string | null {
  if (!code) return null;
  switch (code) {
    case "signup_disabled":
      return "Sign-ups are closed, so Google can only open an account that already exists.";
    case "account_not_linked":
      return "This email already has a Ledge account with a password. Sign in with it, or use Forgot password? to confirm the email. After that, Continue with Google works too.";
    case "access_denied":
      return "Google sign-in was cancelled.";
    default:
      return "Google sign-in didn't work. Try again.";
  }
}
