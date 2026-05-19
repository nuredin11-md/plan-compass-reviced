import React from "react";

export interface ButtonProps {
  variant?: "default" | "outline" | "secondary" | "destructive";
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: any) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  [key: string]: any;
}

export function Button({ 
  children, 
  variant = "default", 
  size = "default",
  className = "", 
  ...props 
}: ButtonProps) {
  const baseStyle = "inline-flex items-center justify-center font-bold text-xs rounded-lg transition-all cursor-pointer focus:outline-none select-none h-9 px-4 shadow-sm";
  
  const variantStyles = {
    default: "bg-slate-950 text-white hover:bg-slate-800 hover:shadow-md",
    outline: "bg-white border border-slate-300 text-slate-700 hover:border-slate-800 hover:bg-slate-50",
    secondary: "bg-slate-100 hover:bg-slate-200 text-slate-800",
    destructive: "bg-rose-600 hover:bg-rose-700 text-white",
  };

  const sizeStyles = {
    default: "h-9 px-4",
    sm: "h-8 px-3 text-[11px]",
    lg: "h-11 px-6 text-sm",
  };

  return (
    <button
      className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
