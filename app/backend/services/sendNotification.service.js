import nodemailer from "nodemailer";
import dotenv from "dotenv";
import generateLoanProfilePDF from "../utils/createPDF.util.js";
import {v2 as cloudinary} from "cloudinary";
import fetch from "node-fetch";
import twilio from "twilio";

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

const client = twilio(accountSid, authToken);


const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.ALERT_EMAIL,
        pass: process.env.ALERT_PASS,
    },
});

class SendNotification {

    getSignedCloudinaryUrl(publicId, resourceType = 'raw', expiresIn = 300) {
        const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;

        const url = cloudinary.url(publicId, {
            type: "authenticated",
            resource_type: resourceType, // 'raw' or 'image'
            sign_url: true,
            expires_at: expiresAt
        });

        return url;
    }

    async sendLoanNotificationEmail(bankEmail, loanProfile) {
        try {
            console.log("🔄 Generating email HTML and PDF...");

            const {
                name,
                email,
                phone,
                cropName,
                acresOfLand,
                plantingDate,
                expectedHarvestDate,
                soilType,
                irrigationMethod,
                predictedYieldKgPerAcre,
                yieldCategory,
                soilHealthScore,
                soilHealthCategory,
                climateScore,
            } = loanProfile;

            const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Google Sans", Arial, sans-serif; background: #F5F6FA; padding: 32px 16px; }
  .email-card { max-width: 680px; margin: auto; background: #fff; border-radius: 4px; overflow: hidden; border: 1px solid #E0E3EB; }
  .header { background: #1A3C5E; padding: 28px 36px; display: flex; align-items: center; gap: 16px; }
  .header-logo { width: 44px; height: 44px; background: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .header-text h1 { margin: 0; font-size: 18px; font-weight: 600; color: #fff; letter-spacing: 0.2px; }
  .header-text p { margin: 3px 0 0; font-size: 12px; color: #A8BFCF; letter-spacing: 0.5px; text-transform: uppercase; }
  .ref-bar { background: #EEF2F7; padding: 10px 36px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #DDE3EC; }
  .ref-bar span { font-size: 12px; color: #4A5568; }
  .ref-bar strong { color: #1A3C5E; }
  .body { padding: 32px 36px; }
  .salutation { font-size: 14px; color: #2D3748; margin: 0 0 8px; }
  .intro { font-size: 14px; color: #4A5568; line-height: 1.6; margin: 0 0 28px; }
  .section-label { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #1A3C5E; border-bottom: 2px solid #1A3C5E; padding-bottom: 6px; margin: 0 0 14px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px; }
  .info-table tr:nth-child(even) td { background: #F8FAFC; }
  .info-table td { padding: 9px 12px; border: 1px solid #E2E8F0; vertical-align: top; }
  .info-table td:first-child { color: #4A5568; width: 38%; font-weight: 500; white-space: nowrap; }
  .info-table td:last-child { color: #1A202C; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }
  .badge-green { background: #DCFCE7; color: #166534; }
  .badge-amber { background: #FEF9C3; color: #854D0E; }
  .badge-red { background: #FEE2E2; color: #991B1B; }
  .audit-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #1A3C5E; border-radius: 2px; padding: 18px 20px; margin: 0 0 28px; }
  .audit-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #2D3748; padding: 5px 0; border-bottom: 1px solid #EDF2F7; }
  .audit-row:last-child { border-bottom: none; }
  .audit-row span:first-child { width: 160px; color: #4A5568; font-weight: 500; flex-shrink: 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .dot-green { background: #16A34A; }
  .dot-red { background: #DC2626; }
  .dot-amber { background: #D97706; }
  .disclaimer { font-size: 11px; color: #718096; line-height: 1.6; border-top: 1px solid #E2E8F0; padding-top: 16px; margin-top: 4px; }
  .footer { background: #1A3C5E; padding: 16px 36px; display: flex; justify-content: space-between; align-items: center; }
  .footer p { margin: 0; font-size: 11px; color: #7A99B2; }
  .footer .brand { font-size: 12px; color: #A8BFCF; font-weight: 600; letter-spacing: 0.5px; }
</style>
</head>
<body>

<div class="email-card">

  <div class="header">
    <div class="header-logo">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 3L25 9V19L14 25L3 19V9L14 3Z" fill="none" stroke="#2C7BE5" stroke-width="2"/>
        <path d="M9 14L12.5 17.5L19 11" stroke="#2C7BE5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="header-text">
      <h1>AgriSure.ai</h1>
      <p>Smart Agri-Finance Platform</p>
    </div>
  </div>

  <div class="ref-bar">
    <span>Application Reference: <strong>LOAN-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}</strong></span>
    <span>Date: <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
    <span>Status: <strong style="color:#166534;">New Application</strong></span>
  </div>

  <div class="body">
    <p class="salutation">Dear Sir / Madam,</p>
    <p class="intro">A new farmer loan application has been submitted through the AgriSure.ai platform. Please find the applicant details and AI-generated crop assessment below for your review and processing.</p>

    <div class="section-label">1. Applicant Information</div>
    <table class="info-table">
      <tr><td>Farmer Name</td><td>${name}</td></tr>
      <tr><td>Email Address</td><td>${email}</td></tr>
      <tr><td>Phone Number</td><td>${phone}</td></tr>
    </table>

    <div class="section-label">2. Agricultural Profile</div>
    <table class="info-table">
      <tr><td>Crop Type</td><td>${cropName}</td></tr>
      <tr><td>Land Area</td><td>${acresOfLand} acres</td></tr>
      <tr><td>Estimated Yield</td><td>${predictedYieldKgPerAcre} kg/ha</td></tr>
      <tr>
        <td>Climate Score</td>
        <td>
          ${climateScore}/100 &nbsp;
          <span class="badge ${climateScore >= 70 ? 'badge-green' : climateScore >= 50 ? 'badge-amber' : 'badge-red'}">
            ${climateScore >= 70 ? 'Favourable' : climateScore >= 50 ? 'Moderate' : 'High Risk'}
          </span>
        </td>
      </tr>
    </table>

    <div class="audit-box">
      <div class="section-label" style="margin-bottom:12px;">3. Risk Summary</div>
      <div class="audit-row">
        <span>Crop Viability</span>
        <div class="dot ${predictedYieldKgPerAcre > 0 ? 'dot-green' : 'dot-red'}"></div>
        <span>${predictedYieldKgPerAcre > 0 ? 'Yield estimate available — crop viable' : 'No yield estimate available'}</span>
      </div>
      <div class="audit-row">
        <span>Climate Risk</span>
        <div class="dot ${climateScore >= 70 ? 'dot-green' : climateScore >= 50 ? 'dot-amber' : 'dot-red'}"></div>
        <span>${climateScore >= 70 ? 'Low risk — climate conditions favourable' : climateScore >= 50 ? 'Moderate risk — monitor conditions' : 'High risk — adverse climate conditions'}</span>
      </div>
      <div class="audit-row">
        <span>Land Coverage</span>
        <div class="dot ${acresOfLand > 0 ? 'dot-green' : 'dot-amber'}"></div>
        <span>${acresOfLand > 0 ? acresOfLand + ' acres declared and on record' : 'Land area not provided'}</span>
      </div>
      <div class="audit-row">
        <span>Contact Details</span>
        <div class="dot ${phone && email ? 'dot-green' : 'dot-amber'}"></div>
        <span>${phone && email ? 'Phone and email verified and on record' : 'Incomplete contact information'}</span>
      </div>
    </div>

    <p class="disclaimer">
      This application has been automatically submitted via the AgriSure.ai platform. The risk summary and crop assessment are AI-generated and intended to assist loan officers — they do not constitute a final credit decision. All applications are subject to standard due diligence as per RBI and NABARD guidelines. For queries, contact <strong>support@agrisure.ai</strong>.
    </p>
  </div>

  <div class="footer">
    <p class="brand">AgriSure.ai</p>
    <p>© ${new Date().getFullYear()} AgriSure Technologies Pvt. Ltd. &nbsp;|&nbsp; NABARD Empanelled</p>
  </div>

</div>

</body>
</html>
`;

            // 🧾 Generate PDF
            let pdfBuffer;
            try {
                pdfBuffer = await generateLoanProfilePDF({
                    name,
                    email,
                    phone,
                    cropName,
                    acresOfLand,
                    plantingDate,
                    expectedHarvestDate,
                    soilType,
                    irrigationMethod,
                    predictedYieldKgPerAcre,
                    yieldCategory,
                    soilHealthScore,
                    soilHealthCategory,
                    climateScore,
                });
                console.log("✅ PDF generated successfully");
            } catch (pdfErr) {
                console.error("❌ Failed to generate PDF:", pdfErr.message);
                return false;
            }

            try {
                const info = await transporter.sendMail({
                    from: `"AgroSure" <${process.env.ALERT_EMAIL}>`,
                    to: bankEmail,
                    subject: "📄 Loan Profile Report – AgroSure",
                    html: html,
                    attachments: [
                        {
                            filename: "Loan-Profile.pdf",
                            content: pdfBuffer,
                            contentType: "application/pdf",
                        },
                    ],
                });

                if (info.rejected.length > 0) {
                    console.warn("⚠️ Email was rejected for:", info.rejected);
                    return false;
                }

                console.log("✅ Email sent to:", info.accepted);
                return true;
            } catch (emailErr) {
                console.error("❌ Failed to send email:", emailErr.message);
                return false;
            }
        } catch (err) {
            console.error(
                "❌ Unexpected error in sendLoanNotificationEmail:",
                err.message
            );
            return false;
        }
    }

    async sendInsuranceClaimNotificationEmail(bankEmail, insuranceRecord, payLoad, name) {
        try {
            const {
                uid,
                location,
                provider,
                uin,
                policyNumber,
                policyDoc,
                damageImage,
                fieldImage,
            } = insuranceRecord;

            console.log(policyDoc, damageImage, fieldImage);

            // Extract AI insights data from payload with fallbacks
            const metadata = payLoad?.metadata || {};
            const damageDetection = payLoad?.damageDetection || {};

            const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Google Sans", Arial, sans-serif; background: #F5F6FA; padding: 32px 16px; }
  .email-card { max-width: 680px; margin: auto; background: #fff; border-radius: 4px; overflow: hidden; border: 1px solid #E0E3EB; }
  .header { background: #1A3C5E; padding: 28px 36px; display: flex; align-items: center; gap: 16px; }
  .header-logo { width: 44px; height: 44px; background: #fff; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  .header-text h1 { margin: 0; font-size: 18px; font-weight: 600; color: #fff; letter-spacing: 0.2px; }
  .header-text p { margin: 3px 0 0; font-size: 12px; color: #A8BFCF; letter-spacing: 0.5px; text-transform: uppercase; }
  .ref-bar { background: #EEF2F7; padding: 10px 36px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #DDE3EC; }
  .ref-bar span { font-size: 12px; color: #4A5568; }
  .ref-bar strong { color: #1A3C5E; }
  .body { padding: 32px 36px; }
  .salutation { font-size: 14px; color: #2D3748; margin: 0 0 8px; }
  .intro { font-size: 14px; color: #4A5568; line-height: 1.6; margin: 0 0 28px; }
  .section-label { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; text-transform: uppercase; color: #1A3C5E; border-bottom: 2px solid #1A3C5E; padding-bottom: 6px; margin: 0 0 14px; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; font-size: 13px; }
  .info-table tr:nth-child(even) td { background: #F8FAFC; }
  .info-table td { padding: 9px 12px; border: 1px solid #E2E8F0; vertical-align: top; }
  .info-table td:first-child { color: #4A5568; width: 38%; font-weight: 500; white-space: nowrap; }
  .info-table td:last-child { color: #1A202C; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 600; }
  .badge-red { background: #FEE2E2; color: #991B1B; }
  .badge-green { background: #DCFCE7; color: #166534; }
  .badge-amber { background: #FEF9C3; color: #854D0E; }
  .audit-box { background: #F8FAFC; border: 1px solid #E2E8F0; border-left: 4px solid #1A3C5E; border-radius: 2px; padding: 18px 20px; margin: 0 0 28px; }
  .audit-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #2D3748; padding: 5px 0; border-bottom: 1px solid #EDF2F7; }
  .audit-row:last-child { border-bottom: none; }
  .audit-row span:first-child { width: 160px; color: #4A5568; font-weight: 500; flex-shrink: 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .dot-green { background: #16A34A; }
  .dot-red { background: #DC2626; }
  .dot-amber { background: #D97706; }
  .attach-note { font-size: 13px; color: #4A5568; padding: 14px 16px; background: #EEF2F7; border-radius: 3px; margin: 0 0 28px; display: flex; align-items: center; gap: 8px; }
  .disclaimer { font-size: 11px; color: #718096; line-height: 1.6; border-top: 1px solid #E2E8F0; padding-top: 16px; margin-top: 4px; }
  .footer { background: #1A3C5E; padding: 16px 36px; display: flex; justify-content: space-between; align-items: center; }
  .footer p { margin: 0; font-size: 11px; color: #7A99B2; }
  .footer .brand { font-size: 12px; color: #A8BFCF; font-weight: 600; letter-spacing: 0.5px; }
</style>
</head>
<body>

<div class="email-card">

  <div class="header">
    <div class="header-logo">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 3L25 9V19L14 25L3 19V9L14 3Z" fill="none" stroke="#2C7BE5" stroke-width="2"/>
        <path d="M9 14L12.5 17.5L19 11" stroke="#2C7BE5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </div>
    <div class="header-text">
      <h1>AgriSure.ai</h1>
      <p>Smart Agri-Insurance Platform</p>
    </div>
  </div>

  <div class="ref-bar">
  
    <span>Date: <strong>${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></span>
    <span>Priority: <strong style="color:#B45309;">Standard</strong></span>
  </div>

  <div class="body">
    <p class="salutation">Dear Sir / Madam,</p>
    <p class="intro">Please find below the details of a new crop insurance claim submitted through the AgriSure.ai platform. This report has been generated by our AI-assisted assessment system and is provided for your review and processing.</p>

    <div class="section-label">1. Policyholder Information</div>
    <table class="info-table">
      <tr><td>Farmer Name</td><td>${name || '—'}</td></tr>
      <tr><td>Unique ID (UID)</td><td>${uid || '—'}</td></tr>
      <tr><td>Policy Number</td><td>${policyNumber || '—'}</td></tr>
      <tr><td>UIN</td><td>${uin || '—'}</td></tr>
      <tr><td>Insurance Provider</td><td>${provider || '—'}</td></tr>
      <tr><td>GPS Coordinates</td><td>Lat: ${location?.lat || '—'}, Long: ${location?.long || '—'}</td></tr>
    </table>

    <div class="section-label">2. Image Authenticity &amp; Metadata</div>
    <table class="info-table">
      <tr><td>Location Address</td><td>${metadata.address || '—'}</td></tr>
      <tr><td>Device Model</td><td>${metadata.device_model || '—'}</td></tr>
      <tr><td>Capture Timestamp</td><td>${metadata.timestamp || '—'}</td></tr>
      <tr><td>GPS Coordinates</td><td>Lat: ${metadata.gps_latitude || '—'}, Long: ${metadata.gps_longitude || '—'}</td></tr>
      <tr>
        <td>Authenticity Score</td>
        <td>
          ${metadata.authenticity_score || '—'}/100 &nbsp;
          <span class="badge ${metadata.authenticity_score >= 70 ? 'badge-green' : metadata.authenticity_score >= 50 ? 'badge-amber' : 'badge-red'}">
            ${metadata.authenticity_score >= 70 ? 'Verified' : metadata.authenticity_score >= 50 ? 'Moderate' : 'Low Confidence'}
          </span>
        </td>
      </tr>
      <tr><td>Suspicious Indicators</td><td>${metadata.suspicious_reasons?.join(', ') || 'None detected'}</td></tr>
    </table>

    <div class="section-label">3. AI Damage Assessment</div>
    <table class="info-table">
      <tr>
        <td>Damage Status</td>
        <td>
          <span class="badge ${damageDetection.Damage_Report === 'Damaged' ? 'badge-red' : 'badge-green'}">
            ${damageDetection.Damage_Report || '—'}
          </span>
        </td>
      </tr>
      <tr><td>Damage Type / Disease</td><td>${damageDetection.Disease || 'Unknown'}</td></tr>
      <tr><td>Identified Crop</td><td>${damageDetection.Crop_name || '—'}</td></tr>
      <tr><td>Model Accuracy</td><td>${damageDetection.Accuracy ? damageDetection.Accuracy.toFixed(2) + '%' : '—'}</td></tr>
      <tr><td>AI Model</td><td>ResMamba (Agri-Vision v2)</td></tr>
      <tr><td>Analysis Status</td><td><span class="badge badge-green">Completed</span></td></tr>
    </table>

    <div class="audit-box">
      <div class="section-label" style="margin-bottom:12px;">4. Audit Summary</div>
      <div class="audit-row">
        <span>Image Authenticity</span>
        <div class="dot ${metadata.authenticity_score >= 70 ? 'dot-green' : metadata.authenticity_score >= 50 ? 'dot-amber' : 'dot-red'}"></div>
        <span>${metadata.authenticity_score >= 70 ? 'Verified — Score meets threshold' : metadata.authenticity_score >= 50 ? 'Moderate confidence' : 'Below acceptable threshold'}</span>
      </div>
      <div class="audit-row">
        <span>Damage Detection</span>
        <div class="dot ${damageDetection.Damage_Report === 'Damaged' ? 'dot-red' : 'dot-green'}"></div>
        <span>${damageDetection.Damage_Report === 'Damaged' ? 'Crop damage confirmed by AI model' : 'No significant damage detected'}</span>
      </div>
      <div class="audit-row">
        <span>Crop Verification</span>
        <div class="dot ${damageDetection.Crop_name ? 'dot-green' : 'dot-amber'}"></div>
        <span>${damageDetection.Crop_name ? 'Identified as ' + damageDetection.Crop_name : 'Crop type could not be identified'}</span>
      </div>
      <div class="audit-row">
        <span>Location Verification</span>
        <div class="dot ${metadata.address ? 'dot-green' : 'dot-red'}"></div>
        <span>${metadata.address ? 'GPS data present and verified' : 'Location data unavailable'}</span>
      </div>
    </div>

    <div class="attach-note">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A5568" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
      </svg>
      Supporting documents and field photographs are attached to this communication for detailed review.
    </div>

    <p class="disclaimer">
      This report has been automatically generated by the AgriSure.ai assessment engine. The AI analysis is intended to assist human adjudicators and does not constitute a final determination of claim validity. All claims are subject to verification by a licensed insurance surveyor as per IRDAI guidelines. For queries, contact <strong>support@agrisure.ai</strong>.
    </p>
  </div>

  <div class="footer">
    <p class="brand">AgriSure.ai</p>
    <p>© ${new Date().getFullYear()} AgriSure Technologies Pvt. Ltd. &nbsp;|&nbsp; IRDAI Reg. No. XXXXXX</p>
  </div>

</div>

</body>
</html>
`;

            const attachments = [];

            const docs = [policyDoc, damageImage, fieldImage];
            for (const doc of docs) {
                if (doc && doc.publicId) {
                    try {

                        const resourceType = doc.fileType === "image" ? "image" : "raw";

                        const signedUrl = this.getSignedCloudinaryUrl(doc.publicId, resourceType);
                        console.log(`🔐 Signed URL for ${doc.fieldName}:`, signedUrl);

                        const fileResp = await fetch(signedUrl);
                        if (!fileResp.ok) throw new Error(`HTTP ${fileResp.status}`);

                        const buffer = await fileResp.arrayBuffer();

                        attachments.push({
                            filename: doc.originalName || `${doc.fieldName}.file`,
                            content: Buffer.from(buffer),
                            contentType: doc.fileType === "image" ? "image/png" : "application/pdf"
                        });

                        console.log(`✅ Attached ${doc.fieldName}`);
                    } catch (err) {
                        console.warn(`⚠️ Failed to attach ${doc?.fieldName || "unknown"}:`, err.message);
                    }
                }
            }


            const info = await transporter.sendMail({
                from: `"AgroSure" <${process.env.ALERT_EMAIL}>`,
                to: bankEmail,
                subject: "📑 New Insurance Claim Submitted – AgroSure.ai",
                html,
                attachments,
            });

            if (info.rejected.length > 0) {
                console.warn("⚠️ Email rejected:", info.rejected);
                return false;
            }

            console.log("✅ Insurance claim email sent to:", info.accepted);
            return true;
        } catch (err) {
            console.error("❌ Error sending insurance email:", err.message);
            return false;
        }
    }

    async sendCropAnalysisSMS(responseFromAi, userPhone) {
        console.log("Sending SMS");
        try {
            const {
                input_crop_analysis: cropAnalysis,
                soil_health: soilHealth,
                climate_score: climateScore,
                crop_priority_list: cropList
            } = responseFromAi;

            console.log(cropAnalysis, soilHealth, climateScore);

            // const staticLabels = [
            //     'Your crop analysis report:',
            //     'Predicted yield:',
            //     'Soil health score:',
            //     'Climate score:',
            //     'Top 5 suggested crops:'
            // ];
            //
            // const translateText = async (textArray, lang) => {
            //     console.log("Reverie Trsnalate");
            //
            //     let reverieLang = lang;
            //     if (lang === 'bn-IN') {
            //         reverieLang = 'bn';
            //     } else if (lang === 'hi-IN') {
            //         reverieLang = 'hi';
            //     } else if (lang === 'te-IN') {
            //         reverieLang = 'te';
            //     } else if (lang === 'en-IN') {
            //         reverieLang = 'en';
            //     }
            //
            //     const response = await axios.post('https://revapi.reverieinc.com/', {
            //         data: textArray,
            //     }, {
            //         headers: {
            //             'Content-Type': 'application/json',
            //             'REV-API-KEY': process.env.REVERIE_API_KEY,
            //             'REV-APP-ID': process.env.REVERIE_APP_ID,
            //             'src_lang': 'en',
            //             'tgt_lang': reverieLang,
            //             'domain': 'generic',
            //             'REV-APPNAME': 'localization',
            //             'REV-APPVERSION': '3.0'
            //         }
            //     });
            //
            //     console.log(response.data);
            //     return response.data.responseList.map(item => item.outString);
            // }
            //
            //
            // const [reportLabel, yieldLabel, soilLabel, climateLabel, suggestionLabel] = await translateText(staticLabels, lang);
            //
            // console.log(reportLabel, yieldLabel, soilLabel, climateLabel);

            const dynamicValues = {
                predictedYieldKgPerAcre: cropAnalysis.predicted_yield.kg_per_acre,
                yieldCategory: cropAnalysis.yield_cateory,
                soilHealthScore: soilHealth.score,
                soilHealthCategory: soilHealth.category,
                climateScore,
                suggestedCrops: cropList.slice(0, 5).map((crop, i) =>
                    `${i + 1}. ${crop.crop} — ${crop.predicted_yield.kg_per_acre} kg/acre`
                ).join('\n')
            };

            console.log(dynamicValues);

            const message = `Report:
Yield: ${dynamicValues.predictedYieldKgPerAcre}kg
Soil: ${dynamicValues.soilHealthScore}
Climate: ${dynamicValues.climateScore}`


            await client.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: userPhone
            });

            console.log('SMS sent!');

            return true;

        } catch (err) {
            console.error(err.message);
            return false;
        }
    }
}

export default new SendNotification();
