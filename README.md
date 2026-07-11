# AgroSure
### A Multi-Agent, Feature-Phone-First Financial & Advisory Platform for Indian Farmers

> "If a farmer can make one phone call, he deserves the same financial dignity as anyone else."
>
> 


https://github.com/user-attachments/assets/9a01dfb4-d82e-40ae-ac69-2e6aceb813d3

)

---

## 1. Executive Summary

AgroSure is a next-generation, AI-powered agro-fintech platform built to give India's farmers access to credit, insurance, and agronomic guidance — regardless of whether they own a smartphone, have internet access, or can read.

Most agri-fintech products silently assume a smartphone, a data connection, and literacy. AgroSure inverts that assumption. It is architected as a **multi-agent system**, where a set of specialized AI agents handle onboarding, scoring, verification, and conversation — and those same agents are exposed through **two parallel front doors**: a basic feature-phone call (IVR + DTMF + SMS) and a full web/mobile application. A farmer in Murshidabad with a ₹500 Nokia gets the same underlying intelligence as a farmer with a smartphone in Bengaluru.

---

## 2. Problem Statement

**Credit access:** Millions of farmers have no formal credit history, no bank relationship, and no CIBIL score — the exact inputs conventional lenders require — even though they need capital for land, seed, and inputs every season.

**Insurance access:** Crop damage from cyclones and floods (e.g., southern West Bengal, eastern Odisha) is common and severe, but claims are routinely delayed or denied due to manual, fraud-prone, paper-based verification. Even government schemes like PMFBY fail farmers here — claims get rejected over "insufficient digital documentation," a documentation burden the farmer was never equipped to meet.

**Advisory access:** There is no reliable, native-language channel for a farmer to ask a real-time question about pests, disease, or crop choice and get an answer he can act on immediately.

The common root cause across all three: **every existing system requires the farmer to come to the interface.** AgroSure's premise is to send the interface to the farmer instead — starting with the one device almost everyone already owns, a basic phone.

---

## 3. Solution: A Multi-Agent Architecture

Rather than one monolithic backend, AgroSure is composed of specialized agents that communicate through a central orchestrator. This makes the system channel-agnostic by design — any agent's output can be rendered as speech over a phone call, an SMS, or a web UI component, without duplicating the underlying logic.

### 3.1 Core Agents

| Agent | Responsibility | Key Inputs | Key Outputs |
|---|---|---|---|
| **Orchestrator Agent** | Routes a session (call, SMS, or web request) to the correct downstream agent; maintains conversation/session state | Channel event, session context | Routed intent, session state |
| **Onboarding Agent** | Registers a new farmer via Aadhaar + phone number (DTMF or form); pulls remaining profile fields from the Aadhaar API | Name, phone, Aadhaar number | Farmer profile record |
| **Loan Advisory Agent** | Scores land/soil/climate, recommends crops, predicts yield, computes a non-hardcoded maximum loan amount, generates the bank-ready PDF | Crop, land area, geolocation, irrigation method | Climate/Soil scores, yield prediction, loan ceiling, PDF |
| **Insurance Verification Agent** | Validates a claim: crop-type detection, damage verification, geolocation cross-check, document/fraud flagging | Policy doc, field/damage/crop images, UIN | Verified/flagged claim, insurer email |
| **Kisan-Sathi Conversational Agent** | Multilingual RAG-based Q&A on farming, pests, disease, and policy explanation (text or voice) | Farmer's spoken/typed question | Native-language answer (voice + text) |
| **IVR/DTMF Agent** | Feature-phone call handling: language selection, menu navigation, VAD-based turn-taking | Keypad input, live audio | Routed call, transcribed intent |
| **Notification Agent** | Sends SMS updates for loan/insurance status and onboarding confirmations | Status change events | SMS to farmer |
| **Fraud/Verification Agent** | Cross-checks documents and images across the loan and insurance flows for consistency | Uploaded documents/images | Fraud risk flag |

### 3.2 Why Multi-Agent (not a single pipeline)

- **Channel independence:** the same Loan Advisory Agent output can be spoken over a call, texted via SMS, or rendered on a dashboard — no duplicated business logic per channel.
- **Independent scaling and iteration:** the Insurance Verification Agent (currently the weakest link — image-based damage detection fails on burned crops) can be re-engineered without touching the Loan or Conversational agents.
- **Graceful degradation:** if a farmer's device or connectivity can't support one modality (e.g., no camera on a call), the Orchestrator can route to an agent that only needs voice/DTMF instead of failing the whole flow.

---

## 4. Channel Strategy: Feature-Phone-First, Web at Parity

### 4.1 Feature Phone (Primary Channel)

**Onboarding by call:**
1. Farmer dials a toll-free number.
2. DTMF menu — language selection.
3. Onboarding Agent collects name, phone number, and Aadhaar number via DTMF only.
4. All remaining profile data (location, demographic fields) is pulled automatically from the Aadhaar API — nothing else is asked of the farmer.

**IVR + Conversational Layer:**
- **Groq-hosted Llama-3.3-70B** powers low-latency conversational responses.
- **Real-time RAG:** speech is transcribed as the farmer talks; the transcript queries a farming knowledge vector store; retrieved context is injected into the response before it's spoken back — no separate "press to submit" step.
- **Silero VAD** detects natural start/stop of speech, so the call feels like a conversation, not a menu tree.
- DTMF remains available as a fallback input method throughout (e.g., confirming a loan amount, selecting a policy).

**SMS layer:**
- Loan and insurance status updates.
- Confirmation of onboarding.
- Any follow-up the farmer needs but doesn't require a live call.

### 4.2 Web / Mobile (Parallel Channel, Same Agents)

- **Web app (React):** full dashboard — loan scoring breakdown, insurance claim upload, Kisan-Sathi chat.
- **Mobile app (React Native):** same feature set, optimized for low-end Android devices and small displays; conversational voice UI removes the extra "tap to submit after speaking" step to mirror the natural flow of the IVR experience.
- **Kiosk mode:** a kiosk operator can log in and register/manage multiple farmers on their behalf — the operator sees a list of their registered farmers, with an "add farmer" flow that reuses the same Onboarding Agent used on calls.

Both channels write to the same farmer profile (indexed by Aadhaar number + Firebase UID, not email), so a farmer who onboarded by phone can later log in on a kiosk or smartphone and see the exact same loan/insurance state.

---

## 5. Example End-to-End Flow: Loan Application

| Step | Feature Phone Path | Web Path |
|---|---|---|
| 1. Identity | DTMF: name, phone, Aadhaar | Firebase login + Aadhaar |
| 2. Farm details | Spoken to IVR agent (crop, land area, irrigation) | Entered via form; geolocation auto-captured |
| 3. Scoring | Loan Advisory Agent computes Climate/Soil/Yield scores | Same agent, same computation |
| 4. Result delivery | Spoken back over the call + SMS summary | Rendered on dashboard |
| 5. Application | Confirmed via DTMF; PDF generated and emailed to bank | Confirmed via UI click; same PDF pipeline |

The Loan Advisory Agent's logic — and its output — never changes. Only the input/output modality does.

---

## 6. Current Gaps Being Addressed

- **Insurance image verification is unreliable** for cases like burned crops where visual damage identification is near-impossible — next iteration adds satellite-based multi-pass verification (3-satellite intersection) using geolocation pulled from the Aadhaar API, rather than relying on farmer-submitted photos alone.
- **Policy OCR** is currently a manually converted `.txt` file from a hackathon PDF; production version needs a proper OCR pipeline (encoder/decoder based) so any policy document can be ingested directly.
- **Backend indexing** is being migrated from email-based to Aadhaar number + Firebase UID across every route, since email assumes a device and literacy the target user often doesn't have.
- **ML backend** is being restructured into a proper MVC layout, containerized with Docker, and deployed behind CI/CD (GitHub Actions → AWS EC2), replacing ad hoc scripts and hardcoded secrets.

---

## 7. Tech Stack

| Layer | Stack |
|---|---|
| Web frontend | React, Firebase Auth |
| Mobile | React Native |
| Backend | Node.js + Express, MongoDB |
| Telephony | Twilio, Dialogflow CX |
| Storage | Cloudinary / AWS S3 |
| Conversational AI | Groq (Llama-3.3-70B), Silero VAD, real-time RAG over a custom vector store |
| ML models | PyTorch / TensorFlow, ResMamba (ensemble, replacing EfficientNet-v2-RW / ConvNeXt-v2) |
| ML APIs | FastAPI, Docker |
| Deployment | AWS EC2 (Docker Compose), GitHub Actions CI/CD |

---

## 8. Team

| Name | Role |
|---|---|
| Uddalak Mukhopadhyay | Backend & DevOps |
| Souherdya Sarkar | Frontend & UI/UX |
| Nirupon Pal | AI/ML |
| Sayantan Patra | ML Backend |

---

## 9. One-Line Pitch

**AgroSure is a multi-agent AI platform that gives every Indian farmer — smartphone or not — the same financial dignity, delivered over a single phone call.**
