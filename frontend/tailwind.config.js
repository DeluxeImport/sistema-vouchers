/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        compras: "#2563EB",
        recompras: "#16A34A",
        servicios: "#EA580C",
        alquiler: "#9333EA",
        fondo: "#F8FAFC",
        texto: "#1E293B",
        primario: "#0F172A",
        acento: "#3B82F6",
      },
    },
  },
  plugins: [],
};
