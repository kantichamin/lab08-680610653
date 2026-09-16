import express, { type Request, type Response } from "express";

// import middlewares
import morgan from "morgan";
import invalidJsonMiddleware from "./middlewares/invalidJsonMiddleware.js";
import notFoundMiddleware from "./middlewares/notFoundMiddleware.js";

// import routes
import studentRouter_v1 from "./routes/studentsRoutes_v1.js";
import studentRouter_v2 from "./routes/studentsRoutes_v2.js";
import studentRouter_v3 from "./routes/studentsRoutes_v3.js";
import courseRouter_v2 from "./routes/coursesRouters_v2.js";

const app = express();
const port = 3000;

// body parser middleware
app.use(express.json());

// logger middleware
app.use(morgan("dev")); // บอกว่าแก้อะไร เป็นยังไง
// app.use(morgan("combined")); // บอกว่ามาจากไหน

// JSON parser middleware
app.use(invalidJsonMiddleware); //ใช้ก่อนเจอ endpoint

// Endpoints
app.get("/", (req: Request, res: Response) => {
  res.send("Lecture18 API services");
});

app.use("/api/v1/enrollments", studentRouter_v1);
app.use("/api/v2/students", studentRouter_v2);
app.use("/api/v3/students", studentRouter_v3);
app.use("/api/v2/courses", courseRouter_v2);
app.use("/api/v2/enrollments", studentRouter_v2);

app.get("/api/me", (req: Request, res: Response) => {
  return res.status(200).json({
    ok: true,
    fullName: "Kanticha Chaichana",
    studentId: "680610653"
  })
});


// endpoint check middleware เรียกใช้ middlrware
app.use(notFoundMiddleware);

app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});

// Export app for vercel deployment
export default app;
