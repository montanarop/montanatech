const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 3000; // Change if needed

// Safaricom Daraja API Credentials
const CONSUMER_KEY = process.env.CONSUMER_KEY;
const CONSUMER_SECRET = process.env.CONSUMER_SECRET;
const SHORTCODE = "3202280"; // Your Till Number
const CALLBACK_URL = "https://your-server.com/callback"; // Replace with your actual callback URL

// Function to get M-Pesa access token
async function getAccessToken() {
    const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
    const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
        headers: { Authorization: `Basic ${credentials}` },
    });
    return response.data.access_token;
}

// STK Push Request
app.post("/stkpush", async (req, res) => {
    try {
        const { phone, amount } = req.body;
        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
        const password = Buffer.from(`${SHORTCODE}${process.env.PASSKEY}${timestamp}`).toString("base64");

        const response = await axios.post("https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
            BusinessShortCode: SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerPayBillOnline",
            Amount: amount,
            PartyA: phone,
            PartyB: SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: CALLBACK_URL,
            AccountReference: "MontanaTech",
            TransactionDesc: `Payment of Ksh ${amount}`,
        }, {
            headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        });

        res.json({ success: true, message: "STK push sent. Enter PIN to complete the purchase." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Payment request failed." });
    }
});

// Start the server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
