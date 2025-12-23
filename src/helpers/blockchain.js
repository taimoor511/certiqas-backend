const { ethers } = require("ethers");
const { contractAbi } = require("../contract ");
require("dotenv").config();



const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KYE, provider);

const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS,
  contractAbi,
  wallet
);


const mintCertificate = async (data) => {
  try {
    const tx = await contract.mintCertificate(
      process.env.WALLET_ADDRESS,
      data.reraPermit,
      data.propertyId,
      data.developerName,
      data.projectName,
      data.location,
      data.unitType,
      data.brokerCompany,
      data.listingId,
      data.verificationDate,
      data.verificationHash,
      data.tokenUri,
      data.expiresAt
    );
    const receipt = await tx.wait();

    return receipt;
  } catch (err) {
    console.error("Minting Error:", err);
    throw err;
  }
};

module.exports = { mintCertificate };