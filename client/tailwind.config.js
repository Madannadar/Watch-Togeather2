/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: {
        xs: "375px", // small phones
      },
      height: {
        // 100dvh = dynamic viewport height (accounts for mobile browser chrome)
        screen: "100dvh",
      },
    },
  },
  plugins: [],
};
