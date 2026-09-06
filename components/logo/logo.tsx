import React from "react";
import { cn } from "@/lib/utils";

export interface LogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

export const Logo = ({ className, ...props }: LogoProps) => {
  return (
    <svg
      viewBox="0 0 90 70"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("text-primary shrink-0", className)}
      {...props}
    >
      <path
        d="M25 20 C25 20, 15 25, 15 35 C15 42, 20 45, 25 45 L25 55 C35 50, 40 42, 40 35 C40 25, 33 20, 25 20 Z"
        fill="currentColor"
        transform="translate(0,5)"
      />
      <path
        d="M65 45 C65 45, 75 40, 75 30 C75 23, 70 20, 65 20 L65 10 C55 15, 50 23, 50 30 C50 40, 57 45, 65 45 Z"
        fill="currentColor"
        transform="translate(0,5)"
      />
    </svg>
  );
};

