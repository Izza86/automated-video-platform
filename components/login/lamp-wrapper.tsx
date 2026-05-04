"use client";

import type React from "react";
import { LampAuthScene } from "@/components/login/lamp-auth-scene";

interface LampWrapperProps {
  children: React.ReactNode;
  label?: string;
}

export default function LampWrapper({ children, label }: LampWrapperProps) {
  return <LampAuthScene label={label}>{children}</LampAuthScene>;
}