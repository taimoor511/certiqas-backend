const pinataSDK = require("pinata-web3");
require("dotenv").config();

const pinata = new pinataSDK.PinataSDK({
  pinataJwt: process.env.PINATA_JWT, 
  pinataGateway: process.env.PINATA_GATEWAY,
});

const uploadMetadataToIPFS = async (metadata) => {
  try {
    const result = await pinata.upload.json(metadata);
    return `https://${process.env.PINATA_GATEWAY}.mypinata.cloud/ipfs/${result.IpfsHash}`
  } catch (err) {
    console.error("IPFS Upload Error:", err);
    throw err;
  }
};

module.exports = uploadMetadataToIPFS;
