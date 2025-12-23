const { PinataSDK } = require("pinata-web3");

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT,
});

const uploadToIPFS = async (fileBuffer, originalName) => {
  try {
    const blob = new Blob([fileBuffer], { type: "application/octet-stream" });
    const response = await pinata.upload.file(blob, { filename: originalName });

    // SDK response nesting fix
    const cid = response?.IpfsHash;
    return {
      cid,
      url: `https://gateway.pinata.cloud/ipfs/${cid}`,
    };

  } catch (error) {
    console.error("Pinata Upload Error:", error);
    throw new Error("IPFS Upload Failed: " + error.message);
  }
};

module.exports = uploadToIPFS;

