import { useSyncExternalStore } from "react";
import { 
  signInWithGoogle,
  signInWithFacebook,
  signInWithGitHub,
  signInWithDiscord,
} from "@/app/auth/login/sign-in-handler"

export const providers = [
  { name: "Google", icon: getGoogleIcon, handler: signInWithGoogle },
  { name: "Facebook", icon: getFacebookIcon, handler: signInWithFacebook },
  { name: "GitHub", icon: getGitHubIcon, handler: signInWithGitHub },
  { name: "Discord", icon: getDiscordIcon, handler: signInWithDiscord },
];

function getGoogleIcon() {
    return "/login/google-logo.svg";
}

function getFacebookIcon() {
    return "/login/facebook-logo.svg";
}

function getGitHubIcon() {
    // Light mode and dark mode icons
    const subscribe = (cb: () => void) => {
        const mo = new MutationObserver(cb);
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
        return () => mo.disconnect();
    };
    const isDark = () => document.documentElement.dataset.theme === "dark";
    const dark = useSyncExternalStore(subscribe, isDark, () => false);
    return dark ? "/login/github-white-logo.svg" : "/login/github-black-logo.svg";
}

function getDiscordIcon() {
    return "/login/discord-logo.svg";
}