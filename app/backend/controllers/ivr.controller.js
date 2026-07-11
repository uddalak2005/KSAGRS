import twilio from "twilio";
import fs from "fs";
import axios from "axios";
import path from 'path';
import client from "../utils/redisClient.util.js";
import getAIInsights from "../services/getAIInsights.service.js";
import User from "../models/user.model.js";
import { v4 as uuidv4 } from 'uuid';
import Crop from "../models/crop.model.js";
import sendNotification from "../services/sendNotification.service.js"
import { SarvamAIClient } from "sarvamai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const { twiml } = twilio;

class IvrController {

    constructor() {
        this.accountSid = process.env.TWILIO_ACCOUNT_SID;
        this.authToken = process.env.TWILIO_AUTH_TOKEN;
        this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
        this.client = twilio(this.accountSid, this.authToken);
        this.callRetryMap = new Map();
        this.makeCall = this.makeCall.bind(this);
        this.outGoingIVR = this.outGoingIVR.bind(this);
        this.languageSelection = this.languageSelection.bind(this);
        this.saveName = this.saveName.bind(this);
        this.savePinCode = this.savePinCode.bind(this);
        this.saveCropSelection = this.saveCropSelection.bind(this);
        this.saveLandArea = this.saveLandArea.bind(this);
        this.SaveDataInDBAndMakeAPICall = this.SaveDataInDBAndMakeAPICall.bind(this);
        this.askForLoanRequest = this.askForLoanRequest.bind(this);
        this.confirmLoan = this.confirmLoan.bind(this);
        this.askForLoanAmount = this.askForLoanAmount.bind(this);
        this.callStatusCallback = this.callStatusCallback.bind(this);
    }


    async makeCall(req, res) {
        console.log("making call");
        try {
            const { phone } = req.body;

            const call = await this.client.calls.create({
                from: this.twilioPhoneNumber,
                to: phone,
                url: `${process.env.BASE_URL}/ivr/intro`,
            });

            console.log(call.sid);

            return res.status(200).json(call);

        } catch (err) {
            console.error(err.message)
            return res.status(500).json({
                message: err.message,
            })
        }
    }

    async outGoingIVR(req, res) {
        console.log("outgoing IVR");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const callSid = req.body.CallSid;

            await client.hset(callSid, {
                lang: '',
                name: '',
                pincode: '',
                cropSuggestion: '',
                selectedCrop: '',
                landArea: '',
            });

            const gather = twimlResponse.gather({
                input: 'dtmf',
                numDigits: 1,
                action: `${process.env.BASE_URL}/ivr/language`,
                method: 'POST',
                timeout: 5
            });

            gather.play(`${process.env.BASE_URL}/audio/1_welcome_and_lang_select.wav`);

            twimlResponse.say("We did not receive any input");
            twimlResponse.redirect(`${process.env.BASE_URL}/ivr/intro`);

            res.type('text/xml');
            res.send(twimlResponse.toString());

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.status(400).json({ message: err.message });
        }
    }

    async languageSelection(req, res) {
        console.log("languageSelection");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const digit = req.body.Digits;
            const callSid = req.body.CallSid;

            const langMap = {
                "1": "hi-IN",
                "2": "bn-IN",
                "3": "te-IN",
                "4": "en-IN",
            };

            if (digit && langMap[digit]) {
                const lang = langMap[digit];

                await client.hset(callSid, { lang });

                twimlResponse.play(`${process.env.BASE_URL}/audio/${lang}/2_prompt_name_after_beep.wav`);

                twimlResponse.record({
                    maxLength: 5,
                    timeout: 3,
                    transcribe: true,
                    playBeep: true,
                    action: `${process.env.BASE_URL}/ivr/saveName`,
                    method: 'POST',
                });

                res.type('text/xml');
                res.send(twimlResponse.toString());

            } else {
                twimlResponse.redirect(`${process.env.BASE_URL}/ivr/intro`);
                return res.type('text/xml').send(twimlResponse.toString());
            }

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.status(400).json({ message: err.message });
        }
    }

    async saveName(req, res) {
        console.log("saveName");
        const twimlResponse = new twiml.VoiceResponse();
        let tempFilePath = null;

        const isGoogle = process.env.AI_PROVIDER === "google";
        let sarvamClient = null;
        let genAI = null;

        if (isGoogle) {
            genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
        } else {
            sarvamClient = new SarvamAIClient({
                apiSubscriptionKey: process.env.SARVAM_API_KEY
            });
        }

        try {
            const callSid = req.body.CallSid;
            const recordingUrl = req.body.RecordingUrl;

            if (!recordingUrl) {
                console.log("No audio heard");
                const fallbackTwiml = new twiml.VoiceResponse();
                fallbackTwiml.say("Sorry, we did not get your name.");
                fallbackTwiml.redirect(`${process.env.BASE_URL}/ivr/intro`);
                return res.type('text/xml').send(fallbackTwiml.toString());
            }

            const lang = await client.hget(callSid, "lang");
            console.log("language from saveName:", lang);

            const audioResponse = await axios.get(recordingUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                auth: {
                    username: process.env.TWILIO_ACCOUNT_SID,
                    password: process.env.TWILIO_AUTH_TOKEN
                }
            });

            const audioBuffer = audioResponse.data;

            if (!audioBuffer || audioBuffer.byteLength === 0) {
                throw new Error('Empty audio file received from Twilio');
            }

            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const filename = `recording_${callSid || Date.now()}.wav`;
            tempFilePath = path.join(tempDir, filename);
            fs.writeFileSync(tempFilePath, audioBuffer);

            let transcribedText = '';

            if (isGoogle) {
                console.log("Calling Gemini STT");
                const modelsToTry = ["gemini-3.5-flash", "gemini-1.5-flash"];
                for (const modelName of modelsToTry) {
                    try {
                        const model = genAI.getGenerativeModel({ model: modelName });
                        const result = await model.generateContent([
                            {
                                inlineData: {
                                    data: Buffer.from(audioBuffer).toString("base64"),
                                    mimeType: "audio/wav"
                                }
                            },
                            "You are a speech-to-text transcriber. Transcribe the spoken name in this audio file. Output only the name itself, with correct capitalization, and no other text."
                        ]);
                        const response = await result.response;
                        transcribedText = response.text()?.trim() || '';
                        if (transcribedText) {
                            console.log(`Successfully transcribed using ${modelName}:`, transcribedText);
                            break;
                        }
                    } catch (err) {
                        console.error(`Gemini STT with ${modelName} failed:`, err.message);
                    }
                }
            } else {
                console.log("Calling Sarvam STT");
                const sttResponse = await sarvamClient.speechToText.transcribe({
                    file: fs.createReadStream(tempFilePath),
                    model: "saaras:v3",
                    mode: "transcribe",
                });

                if (sttResponse?.transcript) {
                    transcribedText = sttResponse.transcript.trim();
                    console.log('transcribed:', transcribedText);
                }
            }

            fs.unlinkSync(tempFilePath);
            tempFilePath = null; // ✅ mark as cleaned up

            if (!transcribedText) {
                console.log("STT returned empty transcript");
                const fallbackTwiml = new twiml.VoiceResponse();
                fallbackTwiml.say("Sorry, we could not understand your name. Please try again.");
                fallbackTwiml.redirect(`${process.env.BASE_URL}/ivr/intro`);
                return res.type('text/xml').send(fallbackTwiml.toString());
            }

            await client.hset(callSid, { name: transcribedText });

            const gather = twimlResponse.gather({
                input: 'dtmf',
                numDigits: 6,
                action: `${process.env.BASE_URL}/ivr/savePincode`,
                method: 'POST',
                timeout: 10
            });

            gather.play(`${process.env.BASE_URL}/audio/${lang}/3_enter_pincode.wav`);

            return res.type('text/xml').send(twimlResponse.toString());

        } catch (err) {
            console.error(err.message);

            if (tempFilePath && fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
            }
            const errorTwiml = new twiml.VoiceResponse();
            errorTwiml.say("Sorry an application error has occurred");
            return res.type('text/xml').send(errorTwiml.toString());
        }
    }

    async savePinCode(req, res) {
        console.log("savePinCode");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const callSid = req.body.CallSid;
            const pincode = req.body.Digits;
            const lang = await client.hget(callSid, "lang");

            console.log("pincode:", pincode, "lang:", lang);

            if (!pincode || pincode.length !== 6) {
                const gather = twimlResponse.gather({
                    input: 'dtmf',
                    numDigits: 6,
                    action: `${process.env.BASE_URL}/ivr/savePincode`,
                    method: 'POST',
                    timeout: 10
                });

                gather.play(`${process.env.BASE_URL}/audio/${lang}/3_enter_pincode.wav`);
                twimlResponse.say("We did not receive your pincode");
                twimlResponse.redirect(`${process.env.BASE_URL}/ivr/intro`);

                return res.type('text/xml').send(twimlResponse.toString());
            }

            await client.hset(callSid, { pincode });

            twimlResponse.play(`${process.env.BASE_URL}/audio/${lang}/4_music_or_waiting.wav`);
            twimlResponse.redirect(`${process.env.BASE_URL}/ivr/fetchAndPlayCrops`);

            return res.type("text/xml").send(twimlResponse.toString());

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.status(500).json({ message: err.message });
        }
    }

    async fetchAndPlayCrops(req, res) {
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const callSid = req.body.CallSid;
            const session = await client.hgetall(callSid);
            const { lang, pincode } = session || {};

            const locationData = await axios.get(
                `http://api.openweathermap.org/geo/1.0/zip?zip=${pincode},IN&appid=${process.env.OPENWEATHER_API_KEY}`
            );

            if (!locationData?.data) {
                throw new Error("Unable to fetch location data");
            }

            const { lat, lon } = locationData.data;
            console.log("lat:", lat, "lon:", lon);

            await client.hset(callSid, { locationLat: lat, locationLong: lon });

            let cropList;
            try {
                const cropResponse = await axios.get(
                    `${process.env.FLASK_URL}/top-crops?lat=${lat}&lon=${lon}`
                );

                if (!cropResponse.data) {
                    throw new Error(`Could not fetch crop data for ${lat}`);
                }

                cropList = cropResponse.data.top_5_crops;

            } catch (err) {
                console.error(err.message);
                return res.status(400).json({ message: err.message });
            }

            console.log("Available crops:", cropList);

            const gather = twimlResponse.gather({
                input: 'dtmf',
                numDigits: 1,
                action: `${process.env.BASE_URL}/ivr/saveCropSelection`,
                method: 'POST',
                timeout: 10
            });

            gather.play(`${process.env.BASE_URL}/audio/${lang}/5_choose_crop.wav`);

            cropList.forEach((crop, index) => {
                const cropAudioURL = `${process.env.BASE_URL}/audio/${lang}/crop_names/${encodeURIComponent(`${crop}.wav`)}`;
                const instructionURL = `${process.env.BASE_URL}/audio/${lang}/dtmf_instructions/${encodeURIComponent(`press_${index + 1}.wav`)}`;
                const silenceURL = `${process.env.BASE_URL}/audio/silence_1sec.wav`;

                gather.play(instructionURL);
                gather.play(silenceURL);
                gather.play(cropAudioURL);
            });

            await client.hset(callSid, { cropSuggestion: JSON.stringify(cropList) });

            return res.type('text/xml').send(twimlResponse.toString());

        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: err.message });
        }
    }

    async saveCropSelection(req, res) {
        console.log("saveCropSelection");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const callSid = req.body.CallSid;
            const selectedDigit = req.body.Digits;
            const session = await client.hgetall(callSid);
            const cropList = JSON.parse(session?.cropSuggestion);
            const lang = session?.lang;

            if (!selectedDigit || !cropList) {
                twimlResponse.say("Invalid selection");
                twimlResponse.redirect(`${process.env.BASE_URL}/ivr/intro`);
                return res.type('text/xml').send(twimlResponse.toString());
            }

            const digit = parseInt(selectedDigit, 10);

            if (isNaN(digit) || digit < 1 || digit > 5) {
                const gather = twimlResponse.gather({
                    input: 'dtmf',
                    numDigits: 1,
                    action: `${process.env.BASE_URL}/ivr/saveCropSelection`,
                    method: 'POST',
                    timeout: 10
                });
                gather.say("Sorry, please try again");
                return res.type('text/xml').send(twimlResponse.toString());
            }

            const selectedCrop = cropList[digit - 1];

            if (!selectedCrop) {
                twimlResponse.say("Invalid crop selection");
                twimlResponse.redirect(`${process.env.BASE_URL}/ivr/intro`);
                return res.type('text/xml').send(twimlResponse.toString());
            }

            await client.hset(callSid, { selectedCrop });
            console.log("Selected crop:", selectedCrop);

            twimlResponse.play(`${process.env.BASE_URL}/audio/${lang}/6_enter_land_area.wav`);

            twimlResponse.gather({
                input: 'dtmf',
                numDigits: 3,
                action: `${process.env.BASE_URL}/ivr/saveLandArea`,
                method: 'POST',
                timeout: 10
            });

            return res.type('text/xml').send(twimlResponse.toString());

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.status(500).json({ message: err.message });
        }
    }

    async saveLandArea(req, res) {
        console.log("saveLandArea");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const callSid = req.body.CallSid;
            const landArea = req.body.Digits;
            const session = await client.hgetall(callSid);
            const lang = session?.lang;
            const From = req.body.From;

            if (!landArea) {
                twimlResponse.gather({
                    input: 'dtmf',
                    numDigits: 3,
                    action: `${process.env.BASE_URL}/ivr/saveLandArea`,
                    method: 'POST',
                    timeout: 10
                });
                twimlResponse.play(`${process.env.BASE_URL}/audio/${lang}/6_enter_land_area.wav`);
                return res.type('text/xml').send(twimlResponse.toString());
            }

            await client.hset(callSid, { landArea });

            twimlResponse.play(`${process.env.BASE_URL}/audio/${lang}/7_processing_done.wav`);
            twimlResponse.hangup();

            const sessionData = await client.hgetall(callSid);
            console.log("Complete session data:", sessionData);

            await client.del(callSid);

            res.type('text/xml').send(twimlResponse.toString());

            setImmediate(async () => {
                req.sessionData = sessionData;
                req.From = From;
                await this.SaveDataInDBAndMakeAPICall(req);
            });

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.status(500).json({ message: err.message });
        }
    }

    async SaveDataInDBAndMakeAPICall(req) {
        try {
            const {
                lang,
                name,
                selectedCrop,
                landArea,
                locationLat,
                locationLong
            } = req.sessionData;

            const From = req.From;

            // Validate phone number format
            if (!From || !From.startsWith('+')) {
                console.error("Invalid phone number format. Expected E.164 format. Received:", From);
                return false;
            }

            const uid = uuidv4();

            const isSmallFarmer = parseInt(landArea) < 5;

            const newUser = await User.create({
                uid,
                name,
                phone: From,
                totalLand: landArea,
                isSmallFarmer,
                location: { lat: locationLat, long: locationLong },
                crops: [selectedCrop]
            });

            const responseFromAi = await getAIInsights.predictCropScore(selectedCrop, locationLat, locationLong);

            if (!responseFromAi || responseFromAi.error) {
                console.log("Unable to process from AI");
                return false;
            }

            const cropRecord = await Crop.create({
                uid,
                cropName: selectedCrop,
                location: { lat: locationLat, long: locationLong },
                acresOfLand: landArea,
                predictedYieldKgPerAcre: responseFromAi.input_crop_analysis.predicted_yield.kg_per_acre,
                yieldCategory: responseFromAi.input_crop_analysis.yield_cateory,
                soilHealthScore: responseFromAi.soil_health.score,
                soilHealthCategory: responseFromAi.soil_health.category,
                climateScore: responseFromAi.climate_score,
                suggestedCrops: responseFromAi.crop_priority_list.slice(0, 5).map(crop => ({
                    cropName: crop.crop,
                    predictedYieldKgPerAcre: crop.predicted_yield.kg_per_acre
                }))
            });

            const sms = await sendNotification.sendCropAnalysisSMS(responseFromAi, From, lang);

            if (!sms) {
                console.error("SMS failed, aborting second call");
                return false;
            }

            const webhookUrl = `${process.env.BASE_URL}/ivr/loanRequest?uid=${uid}&lang=${lang}`;
            const statusCallbackUrl = `${process.env.BASE_URL}/ivr/callStatus?uid=${uid}&lang=${lang}`;

            console.log("Creating 2nd call to:", From);
            console.log("Webhook URL:", webhookUrl);

            // Initialize retry count before making the call
            this.callRetryMap.set(From, 0);

            const call = await this.client.calls.create({
                from: this.twilioPhoneNumber,
                to: From,
                url: webhookUrl,
                statusCallback: statusCallbackUrl,
                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                statusCallbackMethod: 'POST',
            });

            console.log("2nd call created. SID:", call.sid, "Status:", call.status);

            return { newUser, cropRecord };

        } catch (err) {
            console.error("SaveDataInDBAndMakeAPICall error:", err.message);
            return false;
        }
    }

    async askForLoanRequest(req, res) {
        console.log("askForLoanRequest");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const { uid, lang } = req.query;

            const gather = twimlResponse.gather({
                input: 'dtmf',
                numDigits: 1,
                action: `${process.env.BASE_URL}/ivr/confirmLoan?uid=${uid}&lang=${lang}`,
                method: 'POST',
                timeout: 5
            });

            gather.play(`${process.env.BASE_URL}/audio/${lang}/8_ask_for_loan_request.wav`);

            twimlResponse.say("We did not receive any input");
            twimlResponse.redirect(`${process.env.BASE_URL}/ivr/loanRequest?uid=${uid}&lang=${lang}`);

            res.type('text/xml');
            return res.send(twimlResponse.toString());

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.status(400).json({ message: err.message });
        }
    }

    async confirmLoan(req, res) {
        console.log("confirmLoan");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const digit = req.body.Digits;
            const { uid, lang } = req.query;
            const parsedDigit = parseInt(digit);

            if (!parsedDigit || ![1, 2].includes(parsedDigit)) {
                const gather = twimlResponse.gather({
                    input: 'dtmf',
                    numDigits: 1,
                    action: `${process.env.BASE_URL}/ivr/confirmLoan?uid=${uid}&lang=${lang}`,
                    method: 'POST',
                    timeout: 10
                });
                gather.play(`${process.env.BASE_URL}/audio/${lang}/8_ask_for_loan_request.wav`);
                twimlResponse.say("We did not receive your input");
                twimlResponse.redirect(`${process.env.BASE_URL}/ivr/loanRequest?uid=${uid}&lang=${lang}`);
                return res.type('text/xml').send(twimlResponse.toString());
            }

            if (parsedDigit === 1) {
                const gather = twimlResponse.gather({
                    input: 'dtmf',
                    numDigits: 8,
                    action: `${process.env.BASE_URL}/ivr/askForLoanAmount?uid=${uid}&lang=${lang}`,
                    method: 'POST',
                    timeout: 10
                });
                gather.play(`${process.env.BASE_URL}/audio/${lang}/8_1_ask_for_loan_amount.wav`);
                return res.type('text/xml').send(twimlResponse.toString());

            } else {
                twimlResponse.play(`${process.env.BASE_URL}/audio/${lang}/9_disagree_for_loan.wav`);
                twimlResponse.hangup();
                return res.type('text/xml').send(twimlResponse.toString());
            }

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.status(400).json({ message: err.message });
        }
    }

    async askForLoanAmount(req, res) {
        console.log("askForLoanAmount");
        const twimlResponse = new twiml.VoiceResponse();

        try {
            const callSid = req.body.CallSid;
            const digit = req.body.Digits;
            const { uid, lang } = req.query;
            const From = req.body.From;

            const cropRecord = await Crop.findOne({ uid });

            if (!cropRecord) {
                console.error("Crop Record not found");
                twimlResponse.say("Sorry, crop record not found");
                twimlResponse.hangup();
                return res.type('text/xml').send(twimlResponse.toString());
            }

            twimlResponse.play(`${process.env.BASE_URL}/audio/${lang}/9_agree_for_loan.wav`);
            twimlResponse.hangup();

            res.type('text/xml').send(twimlResponse.toString());

            setImmediate(async () => {
                try {
                    const loanResponse = await axios.post(
                        `${process.env.BASE_URL}/loan/submit/${cropRecord._id}`,
                        {
                            uid,
                            loanPurpose: "Agriculture",
                            requestedAmount: digit,
                            loanTenure: 3,
                            callSid
                        }
                    );

                    if (!loanResponse) {
                        console.error("Loan submission failed");
                        return;
                    }

                    await this.client.messages.create({
                        body: `Hello! Your loan request has been successfully forwarded to nearby banks. Reference ID: ${callSid}`,
                        from: this.twilioPhoneNumber,
                        to: From,
                    });

                } catch (err) {
                    console.error("Loan setImmediate error:", err.message);
                }
            });

        } catch (err) {
            console.error(err.message);
            twimlResponse.say("Sorry an application error has occurred");
            return res.type('text/xml').send(twimlResponse.toString());
        }
    }

    async callStatusCallback(req, res) {
        try {
            const { CallStatus, To } = req.body;
            const { uid, lang } = req.query;

            console.log(`Call status callback — To: ${To}, Status: ${CallStatus}`);

            const failedStatuses = ['no-answer', 'busy', 'failed'];

            if (failedStatuses.includes(CallStatus)) {
                const retryCount = this.callRetryMap.get(To) ?? 0;

                if (retryCount < 3) {
                    const nextAttempt = retryCount + 1;
                    console.log(`Retrying call to ${To} in 5 seconds (Attempt ${nextAttempt}/3)...`);

                    setTimeout(async () => {
                        try {
                            const retryCall = await this.client.calls.create({
                                from: this.twilioPhoneNumber,
                                to: To, // ✅ already correct
                                url: `${process.env.BASE_URL}/ivr/loanRequest?uid=${uid}&lang=${lang}`,
                                statusCallback: `${process.env.BASE_URL}/ivr/callStatus?uid=${uid}&lang=${lang}`,
                                statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
                                statusCallbackMethod: 'POST',
                            });

                            this.callRetryMap.set(To, nextAttempt); // ← From to To
                            console.log(`Retry attempt ${nextAttempt} — SID: ${retryCall.sid}`);

                        } catch (err) {
                            console.error(`Retry attempt ${nextAttempt} failed:`, err.message);
                        }
                    }, 5000);

                } else {
                    console.log(`Max retries (3) reached for ${To}. Giving up.`);
                    this.callRetryMap.delete(To);
                }

            } else if (CallStatus === 'completed' || CallStatus === 'answered') {
                console.log(`Call answered/completed for ${To}. Clearing retry map.`);
                this.callRetryMap.delete(To);
            }

            res.sendStatus(200);

        } catch (err) {
            console.error("callStatusCallback error:", err.message);
            res.sendStatus(500);
        }
    }
}

export default new IvrController();