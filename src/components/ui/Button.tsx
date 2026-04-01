"use client";

type ButtonColor = "red" | "green" | "blue" | "purple";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonColor;
  size?: ButtonSize;
}

const colorStyles: Record<ButtonColor, { background: string; border?: string }> = {
  red: {
    background: "linear-gradient(180deg, #ef5350 0%, #b71c1c 100%)",
    
    border: "3px solid #ffffff",
  },
  green: {
    background: "linear-gradient(180deg, #4caf50 0%, #1b5e20 100%)",
    border: "3px solid #ffffff",
  },
  blue: {
    background: "linear-gradient(180deg, #42a5f5 0%, #0d47a1 100%)",
    border: "3px solid #ffffff",
  },
  purple: {
    background: "linear-gradient(180deg, #5a096d 0%, #000000 100%)",
    border: "3px solid #ffffff",
  }
};

export default function Button({ color = "red", className = "", onKeyDown, onClick, children, ...props }: ButtonProps) {
  function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onClick?.(e as unknown as React.MouseEvent<HTMLButtonElement>);
    }
    onKeyDown?.(e);
  }

  return (
    <button
      className={`rounded-2xl font-extrabold text-white tracking-wide py-1 px-6 text-lg ${className}`}
      style={colorStyles[color]}
      onKeyDown={handleKeyDown}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
