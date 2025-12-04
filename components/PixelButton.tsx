import React from 'react';

interface PixelButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const PixelButton: React.FC<PixelButtonProps> = ({ 
  children, 
  className = '', 
  active = false,
  variant = 'primary',
  size = 'md',
  ...props 
}) => {
  
  // Base retro styles: No rounded corners, thick borders
  const baseStyle = "relative font-bold uppercase transition-transform active:translate-y-1 active:shadow-none outline-none border-2";
  
  const sizeStyles = {
    sm: "px-2 py-2 text-[10px]",
    md: "px-4 py-3 text-xs",
    lg: "px-6 py-4 text-sm"
  };

  const variantStyles = {
    // Dynamic Theme Color Style
    primary: `
      bg-[#000000] 
      border-[var(--theme-color)] 
      text-[var(--theme-color)] 
      shadow-[4px_4px_0px_0px_var(--theme-color)] 
      hover:bg-[var(--theme-color)] 
      hover:text-black
    `,
    // White/Gray style
    secondary: `
      bg-white 
      border-black 
      text-black 
      shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]
      hover:bg-gray-200
    `,
    // Red style for accents
    danger: `
      bg-[#ef4444] 
      border-white 
      text-white 
      shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]
      hover:bg-[#dc2626]
    `
  };

  const activeStyle = active ? "translate-y-1 shadow-none bg-[var(--theme-color)] text-black" : "";

  return (
    <button
      className={`
        ${baseStyle}
        ${sizeStyles[size]}
        ${variantStyles[variant]}
        ${activeStyle}
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};

export default PixelButton;