const uploadToIPFS = require("../helpers/ipfsUpload");
const ethers = require("ethers");
const uploadMetadataToIPFS = require("../helpers/uploadMetadata");
const { mintCertificate } = require("../helpers/blockchain");
const Properties = require("../models/Property");

const createProperty = async (req, res) => {
  try {
    const role = req.user.role;

    const imageFile = req.files?.image?.[0];
    const otherFile = req.files?.file?.[0];

    if (!imageFile || !otherFile) {
      return res.status(400).json({
        message: "Image and File both are required",
      });
    }
    const {
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

    const duplicate = await Properties.findOne({
      $or: [{ propertyId }],
    });

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message:
          " propertyId must be unique.",
      });
    }

    const uploadedImage = await uploadToIPFS(
      imageFile.buffer,
      imageFile.originalname
    );

    const uploadedFile = await uploadToIPFS(
      otherFile.buffer,
      otherFile.originalname
    );

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
          brokerCompany,
          verificationDate,
        ]
      )
    );

    const metadataTemplate = {
      name: "Certiqas",
      description,
      image: `ipfs://${uploadedImage.cid}`,
      file: `ipfs://${uploadedFile.cid}`,
      attributes: [
        { trait_type: "Property ID", value: propertyId },
        { trait_type: "Developer Name", value: developerName },
        { trait_type: "Project Name", value: projectName },
        { trait_type: "Location", value: location },
        { trait_type: "Broker Company", value: brokerCompany },
        {
          trait_type: "Verification Date",
          display_type: "date",
          value: verificationDate,
        },
        { trait_type: "Verification Hash", value: verificationHash },
        { trait_type: "RERA Permit", value: reraPermit },
        { trait_type: "Description", value: description },
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
        brokerCompany,
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
      fileCid: uploadedFile.cid,
      fileUrl: uploadedFile.url,

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

    res.json({
      success: true,
      message:
        role === "SuperAdmin"
          ? "Property created and minted successfully!"
          : "Property created successfully (Pending SuperAdmin minting).",
      property,
    });
  } catch (error) {
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
        message: "Invalid status. Allowed values: approved, rejected",
      });
    }

    const property = await Properties.findById(req.params.id);

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.mintingStatus !== "pending") {
      return res.status(400).json({
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

    const mintPayload = {
      reraPermit: property.reraPermit,
      propertyId: property.propertyId,
      developerName: property.developerName,
      projectName: property.projectName,
      location: property.location,
      unitType: property.unitType,
      brokerCompany: property.brokerCompany,
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

    res.json({
      success: true,
      message: "Property approved & minted successfully!",
      property,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


const getAllProperties = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};
    if (status) {
      if (!["approved", "pending", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status. Allowed values: approved, pending, rejected",
        });
      }

      filter.mintingStatus = status;
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
module.exports = {
  createProperty,
  getAllProperties,
  getPropertyById,
  mintPendingProperty,
};
