// Sample page only. /auth/login path
import { Suspense } from "react";
import { AuthButton } from "@/components/auth-button";

export default function Auth() {
    return (
    <Suspense>
        <AuthButton />
    </Suspense>
    );
}