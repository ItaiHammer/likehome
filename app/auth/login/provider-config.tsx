import { useSyncExternalStore } from "react";
import { 
  signInWithGoogle,
  signInWithFacebook,
  signInWithGitHub,
  signInWithDiscord,
} from "@/app/auth/login/sign-in-handler"

// Each provider's icon is a small component (not a plain function), so the GitHub one
// can follow the site theme with a hook without breaking React's rules of hooks.
export const providers = [
  { name: "Google", Icon: GoogleIcon, handler: signInWithGoogle },
  { name: "Facebook", Icon: FacebookIcon, handler: signInWithFacebook },
  { name: "GitHub", Icon: GitHubIcon, handler: signInWithGitHub },
  { name: "Discord", Icon: DiscordIcon, handler: signInWithDiscord },
];

function GoogleIcon() {
    return <img src="/login/google-logo.svg" alt="" />;
}

function FacebookIcon() {
    return <img src="/login/facebook-logo.svg" alt="" />;
}

// Light mode and dark mode icons
const subscribeToTheme = (cb: () => void) => {
    const mo = new MutationObserver(cb);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
};
const isDark = () => document.documentElement.dataset.theme === "dark";

function GitHubIcon() {
    const dark = useSyncExternalStore(subscribeToTheme, isDark, () => false);
    return <img src={dark ? "/login/github-white-logo.svg" : "/login/github-black-logo.svg"} alt="" />;
}

function DiscordIcon() {
    return <img src="/login/discord-logo.svg" alt="" />;
}
