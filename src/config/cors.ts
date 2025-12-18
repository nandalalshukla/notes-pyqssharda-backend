import cors from "cors";

const corsOptions: cors.CorsOptions = {
  origin: "http://localhost:3100",
  credentials: true,
};

export default cors(corsOptions);
