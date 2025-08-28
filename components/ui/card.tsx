"use client";
import { ReactNode } from "react";
import clsx from "clsx";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-2xl bg-white p-8 shadow-lg dark:bg-gray-800",
        className
      )}
    >
      {children}
    </div>
  );
}