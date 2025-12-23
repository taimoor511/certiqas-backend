const mongoose = require("mongoose");

const brokerSchema = new mongoose.Schema(
  {
    brokerName: {
      type: String,
      required: true,
      trim: true,
    },
    brokerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    contactNo: {
      type: String,
      required: true,
    },
    developerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false,
  }, 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Broker", brokerSchema);
