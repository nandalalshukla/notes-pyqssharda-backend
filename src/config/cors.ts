import cors from "cors";

const corsOptions: cors.CorsOptions = {
  origin: process.env.VERCEL_FRONTEND_URL,
  credentials: true,
};

export default cors(corsOptions);
