"use client";

import { useState } from "react";
import Image from "next/image";

import { dmSerif } from "../lib/fonts";

export default function LikeHomeLogo() {
    const [logoLoaded, setLogoLoaded] = useState(false);

    return (
        <span className="relative flex h-8 min-w-[115px] items-center">
            {!logoLoaded && (
                <span className={`${dmSerif.className} text-2xl text-[#070D2F]`}>
                    LikeHome
                </span>
            )}

            <Image
                src="/likehome-logo.png"
                alt="LikeHome"
                width={160}
                height={48}
                priority
                onLoad={() => setLogoLoaded(true)}
                onError={() => setLogoLoaded(false)}
                className={`absolute left-0 h-8 w-auto object-contain ${
                    logoLoaded ? "opacity-100" : "opacity-0"
                }`}
            />
        </span>
    );
}
