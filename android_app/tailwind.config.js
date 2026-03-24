/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./App.js",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./app/(tabs)/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}", 
    "./src/screens/**/*.{js,jsx,ts,tsx}", 
    "./src/navigation/**/*.{js,jsx,ts,tsx}", 
    "./src/hooks/**/*.{js,jsx,ts,tsx}", 
    "./src/store/**/*.{js,jsx,ts,tsx}", 
    "./src/utils/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}