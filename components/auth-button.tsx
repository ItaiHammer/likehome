import { SignInButton } from "./sign-in-button";

// The header checks the session once (getViewer) and passes the signed-in controls in
export function AuthButton({ signedIn, children }: { signedIn: boolean; children: React.ReactNode }) {
  return signedIn ? children : <SignInButton />;
}
