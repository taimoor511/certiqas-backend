const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// LOGIN
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Incorrect password" });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        developerId: user.role === "Developer" ? user._id : null,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        companyName: user.companyName || "",
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// CREATE
const createAdmin = async (req, res) => {
  try {
    const { name, email, password, companyName } = req.body;
    const user = req.user;
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (user.role === "SuperAdmin") {
      const developer = await User.create({
        name,
        email,
        password,
        companyName,
        role: "Developer",
      });

      return res.status(201).json({
        message: "Developer created successfully",
        developer,
      });
    }
    if (user.role === "Developer") {
      const assistant = await User.create({
        name,
        email,
        password,
        role: "Assistant",
        developerId: user.developerId || user.id,
      });

      return res.status(201).json({
        message: "Assistant created successfully",
        assistant,
      });
    }

    return res.status(400).json({ message: "Invalid role" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET ALL ADMINS
const getAdmins = async (req, res) => {
  try {
    const user = req.user;
    if (user.role === "SuperAdmin") {
      const users = await User.find({
        role: { $ne: "SuperAdmin" },
      }).select("-password");

      return res.status(200).json({ users });
    }
    if (user.role === "Developer") {
      const assistants = await User.find({
        role: "Assistant",
        developerId: user.userId|| user.id ,
      }).select("-password");

      return res.status(200).json({ assistants });
    }

    return res.status(403).json({ message: "Access denied" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!id) return res.status(400).json({ message: "User ID is required" });
    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.role === "SuperAdmin") {
      if (targetUser.role === "SuperAdmin") {
        return res.status(403).json({
          message: "SuperAdmin cannot update another SuperAdmin",
        });
      }
    }
    if (user.role === "Developer") {
      if (
        targetUser.role !== "Assistant" ||
        targetUser.developerId.toString() !== (req.user.id || req.user.userId)
      ) {
        return res.status(403).json({
          message: "Access denied. You can only update your own assistants.",
        });
      }
    }

    const { name, email, password, companyName } = req.body;
    const updateData = { name, email, companyName };

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    }).select("-password");

    return res.status(200).json({
      message: "User updated successfully",
      user: updatedUser,
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!id) return res.status(400).json({ message: "User ID is required" });

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "SuperAdmin") {
      if (targetUser.role === "SuperAdmin") {
        return res.status(403).json({
          message: "SuperAdmin cannot delete another SuperAdmin",
        });
      }
    }

    if (user.role === "Developer") {
      if (
        targetUser.role !== "Assistant" ||
        targetUser.developerId.toString() !== (req.user.id || req.user.userId)
      ) {
        return res.status(403).json({
          message: "Access denied. You can only delete your own assistants.",
        });
      }
    }

    await User.findByIdAndDelete(id);

    return res.status(200).json({
      message: "User deleted successfully",
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


module.exports = {
  loginUser,
  createAdmin,
  getAdmins,
  updateAdmin,
  deleteAdmin,
};
