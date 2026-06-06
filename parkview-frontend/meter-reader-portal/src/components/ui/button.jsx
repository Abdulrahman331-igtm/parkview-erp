export function Button({children, variant = "default", size = "default", className="", ...props}){
    const base = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50";

    const variants = {
        default: "bg-blue-600 text-white hover:bg-blue-700",
        ghost: "hover:bg-gray-100",
        outline: "border border-gray-300 bg-white hover:bg-gray-50"
    };

    const sizes = {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-12 px-6"
    };

    return (
        <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
            {children}
        </button>
    )
}