import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../models/User.js";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Database connected");
    const existing = await User.findOne({ role: "SuperAdmin" });

    if (existing) {
      console.log("⚠️ SuperAdmin already exists!");
      process.exit(0);
    }

    // Create SuperAdmin
    await User.create({
      name: "Super Admin",
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD,
      role: "SuperAdmin",
    });

    console.log("✅ SuperAdmin created successfully!");
    process.exit(0);

  } catch (error) {
    console.log("❌ Error:", error.message);
    process.exit(1);
  }
};

createSuperAdmin();
