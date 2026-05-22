import mongoose from "mongoose";
import config from "../config/config.js";


// Function to connect to the database 

async function connectDB() {
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("Connected to Database Suuccessfully ✅");
  } catch (err) {
    console.log("Error Connection to Database ❌", err);
  }
}

export default connectDB;
