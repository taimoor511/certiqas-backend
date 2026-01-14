const uploadToIPFS = require("../helpers/ipfsUpload");
const ethers = require("ethers");
const uploadMetadataToIPFS = require("../helpers/uploadMetadata");
const Properties = require("../models/Property");
const { mintCertificate } = require("../helpers/blockchain");
const User = require("../models/User");

const createProperty = async (req, res) => {
  try {
    const role = req.user.role;
    const imageFile = req.files?.image?.[0];
    const otherFile = req.files?.file?.[0];

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    let {
      reraPermit,
      propertyId,
      developerName,
      projectName,
      location,
      unitType,
      brokerCompany,
      description,
      bedrooms,
      bathrooms,
      areaSqFt,
    } = req.body;
    if (!Array.isArray(brokerCompany)) {
      brokerCompany = [brokerCompany];
    }
    const brokerCompanyString = brokerCompany.join(",");
    const duplicate = await Properties.findOne({ propertyId });
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: "Property ID must be unique",
      });
    }
    const uploadedImage = await uploadToIPFS(
      imageFile.buffer,
      imageFile.originalname
    );
    let uploadedFile = null;
    if (otherFile) {
      uploadedFile = await uploadToIPFS(
        otherFile.buffer,
        otherFile.originalname
      );
    }
    const verificationDate = Math.floor(Date.now() / 1000) - 40;
    const verificationHash = ethers.keccak256(
      ethers.solidityPacked(
        [
          "string",
          "string",
          "string",
          "string",
          "string",
          "string",
          "string",
          "uint256",
        ],
        [
          reraPermit,
          propertyId,
          developerName,
          projectName,
          location,
          unitType,
          brokerCompanyString,
          verificationDate,
        ]
      )
    );
    const metadataTemplate = {
      name: "Certiqas",
      description,
      image: `ipfs://${uploadedImage.cid}`,
      ...(uploadedFile && { file: `ipfs://${uploadedFile.cid}` }),
      attributes: [
        { trait_type: "Property ID", value: propertyId },
        { trait_type: "Developer Name", value: developerName },
        { trait_type: "Project Name", value: projectName },
        { trait_type: "Location", value: location },
        { trait_type: "Broker Company", value: brokerCompanyString },
        {
          trait_type: "Verification Date",
          display_type: "date",
          value: verificationDate,
        },
        { trait_type: "Verification Hash", value: verificationHash },
        { trait_type: "RERA Permit", value: reraPermit },
        { trait_type: "Unit Type", value: unitType },
        { trait_type: "Bedrooms", value: bedrooms || "N/A" },
        { trait_type: "Bathrooms", value: bathrooms || "N/A" },
        { trait_type: "Area (Sq Ft)", value: areaSqFt || "N/A" },
      ],
    };
    const metadataUploadURL = await uploadMetadataToIPFS(metadataTemplate);

    let mintingStatus = "pending";
    let mintTransactionHash = null;
    if (role === "SuperAdmin") {
      const listingId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      const mintPayload = {
        reraPermit,
        propertyId,
        developerName,
        projectName,
        location,
        unitType,
        brokerCompany: brokerCompanyString,
        listingId,
        verificationDate,
        verificationHash,
        tokenUri: metadataUploadURL,
        expiresAt: 0,
      };

      const receipt = await mintCertificate(mintPayload);

      mintingStatus = "approved";
      mintTransactionHash = receipt.hash;
    }

    const property = await Properties.create({
      imageCid: uploadedImage.cid,
      imageUrl: uploadedImage.url,

      fileCid: uploadedFile?.cid || null,
      fileUrl: uploadedFile?.url || null,

      reraPermit,
      propertyId,
      developerName,
      projectName,
      location,
      unitType,
      brokerCompany,
      description,
      verificationDate,
      verificationHash,
      tokenUri: metadataUploadURL,
      expiresAt: 0,

      bedrooms,
      bathrooms,
      areaSqFt,

      mintingStatus,
      mintTransactionHash,
    });

    return res.status(201).json({
      success: true,
      message:
        role === "SuperAdmin"
          ? "Property created and minted successfully!"
          : "Property created successfully (Pending SuperAdmin minting).",
      property,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const mintPendingProperty = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Allowed values: approved, rejected",
      });
    }

    const property = await Properties.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }
    if (property.mintingStatus !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Property already ${property.mintingStatus}`,
      });
    }

    if (status === "rejected") {
      property.mintingStatus = "rejected";
      await property.save();

      return res.json({
        success: true,
        message: "Property rejected successfully",
        property,
      });
    }

    const brokerCompanyString = Array.isArray(property.brokerCompany)
      ? property.brokerCompany.join(",")
      : property.brokerCompany;

    const mintPayload = {
      reraPermit: property.reraPermit,
      propertyId: property.propertyId,
      developerName: property.developerName,
      projectName: property.projectName,
      location: property.location,
      unitType: property.unitType,
      brokerCompany: brokerCompanyString, // ✅ FIXED
      listingId: Math.random().toString(36).substring(2, 8).toUpperCase(),
      verificationDate: property.verificationDate,
      verificationHash: property.verificationHash,
      tokenUri: property.tokenUri,
      expiresAt: 0,
    };

    const receipt = await mintCertificate(mintPayload);

    property.mintingStatus = "approved";
    property.mintTransactionHash = receipt.hash;

    await property.save();

    return res.json({
      success: true,
      message: "Property approved & minted successfully!",
      property,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllProperties = async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user.userId || req.user.id;
    const userRole = req.user.role;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const filter = {};
    if (status) {
      if (!["approved", "pending", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid status. Allowed values: approved, pending, rejected",
        });
      }
      filter.mintingStatus = status;
    }
    if (["Developer", "Assistant"].includes(userRole)) {
      filter.developerName = user.companyName;
    }

    const properties = await Properties.find(filter).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: properties.length,
      properties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Properties.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found",
      });
    }

    res.json({
      success: true,
      property,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const fetchApprovedPropertiesByPublic = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      propertyId,
      developerName,
      projectName,
    } = req.query;
    const filter = {
      mintingStatus: "approved",
    };

    if (propertyId) {
      filter.propertyId = { $regex: propertyId, $options: "i" };
    }

    if (developerName) {
      filter.developerName = { $regex: developerName, $options: "i" };
    }

    if (projectName) {
      filter.projectName = { $regex: projectName, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Properties.countDocuments(filter);
    const properties = await Properties.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    return res.status(200).json({
      success: true,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      totalItems: total,
      data: properties,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getApprovedPropertyDetailPublic = async (req, res) => {
  try {
    const { id } = req.params;

    const property = await Properties.findById(id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or not approved",
      });
    }

    res.status(200).json({
      success: true,
      data: property,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  mintPendingProperty,
  fetchApprovedPropertiesByPublic,
  getApprovedPropertyDetailPublic,
};
