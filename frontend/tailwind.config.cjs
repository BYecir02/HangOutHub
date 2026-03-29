/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Poppins_400Regular"],
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        ".font-normal": {
          fontFamily: "Poppins_400Regular",
          fontWeight: "400",
        },
        ".font-medium": {
          fontFamily: "Poppins_500Medium",
          fontWeight: "500",
        },
        ".font-semibold": {
          fontFamily: "Poppins_600SemiBold",
          fontWeight: "600",
        },
        ".font-bold": {
          fontFamily: "Poppins_600SemiBold",
          fontWeight: "700",
        },
      });
    },
  ],
}
