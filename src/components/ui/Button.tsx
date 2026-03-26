"use client";

type ButtonColor = "red" | "green" | "blue";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonColor;
  size?: ButtonSize;
}

const colorStyles: Record<ButtonColor, { background: string; boxShadow: string }> = {
  red: {
    background: "linear-gradient(180deg, #ef5350 0%, #b71c1c 100%)",
    boxShadow: "0 4px 0 #7f0000",
  },
  green: {
    background: "linear-gradient(180deg, #4caf50 0%, #1b5e20 100%)",
    boxShadow: "0 4px 0 #0a3d0c",
  },
  blue: {
    background: "linear-gradient(180deg, #42a5f5 0%, #0d47a1 100%)",
    boxShadow: "0 4px 0 #062a6e",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "py-2 px-6 text-sm",
  md: "py-3 px-10 text-base",
  lg: "py-4 px-14 text-lg",
};

export default function Button({ color = "red", size = "md", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full font-extrabold text-white tracking-wide shadow-lg transition active:scale-95 ${sizeStyles[size]} ${className}`}
      style={colorStyles[color]}
      {...props}
    >
      {children}
    </button>
  );
}
