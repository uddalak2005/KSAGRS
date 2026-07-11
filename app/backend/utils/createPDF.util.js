import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

export async function generateLoanProfilePDF(data) {
  const templatePath = path.join(process.cwd(), 'templates', 'loan-template.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const {
    name = "N/A",
    email = "N/A",
    phone = "N/A",
    cropName = "N/A",
    acresOfLand = "N/A",
    plantingDate = "N/A",
    expectedHarvestDate = "N/A",
    soilType = "N/A",
    irrigationMethod = "N/A",
    predictedYieldKgPerAcre = 0,
    yieldCategory = "N/A",
    soilHealthScore = 0,
    soilHealthCategory = "N/A",
    climateScore = 0
  } = data;

  const predictedYieldPercent = Math.min(Math.max(predictedYieldKgPerAcre / 100, 0), 100);

  html = html
    .replace(/{{name}}/g, name)
    .replace(/{{email}}/g, email)
    .replace(/{{phone}}/g, phone)
    .replace(/{{acresOfLand}}/g, acresOfLand)
    .replace(/{{cropName}}/g, cropName)
    .replace(/{{plantingDate}}/g, plantingDate)
    .replace(/{{expectedHarvestDate}}/g, expectedHarvestDate)
    .replace(/{{soilType}}/g, soilType)
    .replace(/{{irrigationMethod}}/g, irrigationMethod)
    .replace(/{{predictedYieldKgPerAcre}}/g, String(predictedYieldKgPerAcre))
    .replace(/{{predictedYieldPercent}}/g, String(predictedYieldPercent))
    .replace(/{{yieldCategory}}/g, yieldCategory)
    .replace(/{{soilHealthCategory}}/g, soilHealthCategory)
    .replace(/{{soilHealthScore}}/g, String(soilHealthScore*20))
    .replace(/{{climateScore}}/g, String(climateScore));

  // Launch Puppeteer with Docker-compatible flags
  // Puppeteer uses its own bundled Chrome (downloaded during npm install)
  const browser = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });

  await browser.close();
  return pdfBuffer;
}

export default generateLoanProfilePDF;