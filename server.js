const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ Allow CORS for your frontend
const allowedOrigins = ["https://montanarop.github.io"];
app.use(cors({ origin: allowedOrigins }));

const PORT = process.env.PORT || 3000; // Use environment port if available

// ✅ Safaricom Daraja API Credentials
const { CONSUMER_KEY, CONSUMER_SECRET, PASSKEY } = process.env;
const SHORTCODE = "3202280"; // Your Till Number
const CALLBACK_URL = "https://your-server.com/callback"; // Replace with actual callback URL

// ✅ Function to get M-Pesa access token
async function getAccessToken() {
    try {
        const credentials = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString("base64");
        const response = await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", {
            headers: { Authorization: `Basic ${credentials}` },
        });
        return response.data.access_token;
    } catch (error) {
        console.error("❌ Error getting M-Pesa access token:", error.response?.data || error.message);
        throw new Error("Failed to get M-Pesa access token");
    }
}

// ✅ STK Push Request
app.post("/stkpush", async (req, res) => {
    try {
        const { phone, amount } = req.body;

        // ✅ Validate input
        if (!phone || !amount) {
            return res.status(400).json({ success: false, message: "Phone number and amount are required." });
        }

        const accessToken = await getAccessToken();
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
        const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString("base64");

        const response = await axios.post(
            "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
            {
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
            },
            {
                headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
            }
        );

        console.log("✅ STK Push response:", response.data);

        res.json({ success: true, message: "STK push sent. Enter PIN to complete the purchase." });
    } catch (error) {
        console.error("❌ Payment request error:", error.response?.data || error.message);
        res.status(500).json({ success: false, message: "Payment request failed." });
    }
});

// ✅ Health Check Route
app.get("/", (req, res) => {
    res.send("M-Pesa Backend is running ✅");
});

// ✅ Start the server
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
