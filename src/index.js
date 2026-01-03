require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const brokerRoutes = require("./routes/brokerRoutes");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
// Connect MongoDB
connectDB();

app.use("/api/admin", adminRoutes);
app.use("/api/properties", propertyRoutes );
app.use("/api/broker", brokerRoutes);

app.get("/", (req, res) => {
  res.status(200).send("OK");
});

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    uptime: process.uptime(),
  });
});
// const PORT = process.env.PORT || 8080;
// app.listen(PORT, "0.0.0.0", () => {
//   console.log(`Server running on port ${PORT}`);
// });
app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});


