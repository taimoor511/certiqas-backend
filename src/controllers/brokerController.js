const Broker = require("../models/Broker");
const User = require("../models/User");

const createBroker = async (req, res) => {
  try {
    const { brokerName, brokerEmail, contactNo } = req.body;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    const existingBroker = await Broker.findOne({ brokerEmail });
    if (existingBroker) {
      return res.status(400).json({ error: "Email already exists" });
    }

    let developerId;

    if (userRole === "Developer") {
      developerId = userId;
    } 
    else if (userRole === "Assistant") {
      const user = await User.findById(userId);
      if (!user?.developerId) {
        return res.status(400).json({ message: "Developer not assigned" });
      }
      developerId = user.developerId;
    }

    const broker = await Broker.create({
      brokerName,
      brokerEmail,
      contactNo,
      developerId,
    });

    res.status(201).json({ message: "Broker created successfully", broker });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const getAllBrokers = async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;

    let query = {};

    if (userRole === "Assistant") {
      // Assistant ke case mein user se developerId lo
      const user = await User.findById(userId);

      if (!user || !user.developerId) {
        return res.status(400).json({ message: "Developer not assigned to assistant" });
      }

      query = { developerId: user.developerId };
    } 
    else if (userRole === "Developer") {
      query = { developerId: userId };
    } 
    else if (userRole === "SuperAdmin") {
      query = {}; // saare brokers
    }

    const brokers = await Broker.find(query);
    res.status(200).json(brokers);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const canAccessBroker = async (broker, userId, userRole) => {
  if (userRole === "SuperAdmin") return true;

  if (userRole === "Developer") {
    return broker.developerId.toString() === userId;
  }

  if (userRole === "Assistant") {
    const user = await User.findById(userId);
    return broker.developerId.toString() === user?.developerId?.toString();
  }

  return false;
};
const getBroker = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    const broker = await Broker.findById(id);
    if (!broker) return res.status(404).json({ message: "Broker not found" });

    const allowed = await canAccessBroker(broker, userId, userRole);
    if (!allowed) {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    res.status(200).json(broker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


const updateBroker = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    const broker = await Broker.findById(id);
    if (!broker) return res.status(404).json({ message: "Broker not found" });

    const allowed = await canAccessBroker(broker, userId, userRole);
    if (!allowed) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    const updatedBroker = await Broker.findByIdAndUpdate(id, req.body, { new: true });
    res.status(200).json({ message: "Updated", broker: updatedBroker });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


const deleteBroker = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id || req.user.userId;
    const userRole = req.user.role;

    const broker = await Broker.findById(id);
    if (!broker) return res.status(404).json({ message: "Broker not found" });

    const allowed = await canAccessBroker(broker, userId, userRole);
    if (!allowed) {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    await Broker.findByIdAndDelete(id);
    res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


module.exports = {
  createBroker,
  getAllBrokers,
  getBroker,
  updateBroker,
  deleteBroker,
};
