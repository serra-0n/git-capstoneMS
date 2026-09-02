"use strict";

function normalize(value) {
    return String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function tokenize(value) {
    return String(value || "")
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, " ")
        .split(/\s+/)
        .filter(token => token.length > 1);
}

function findRegistrationNumber(text, submittedNumber) {
    const normalizedText = normalize(text);
    const normalizedSubmittedNumber = normalize(submittedNumber);

    if (
        normalizedSubmittedNumber.length >= 4 &&
        normalizedText.includes(normalizedSubmittedNumber)
    ) {
        return submittedNumber;
    }

    const match = String(text || "").match(
        /(?:REGISTRATION|CERTIFICATE|BUSINESS|DTI)\s*(?:NO\.?|NUMBER|#)?\s*[:\-]?\s*([A-Z0-9][A-Z0-9\-]{4,})/i
    );

    return match?.[1] || null;
}

function analyzeBusinessLicense({
    text,
    confidence,
    businessName,
    businessRegistrationNumber
}) {
    const rawText = String(text || "").trim();
    const normalizedText = normalize(rawText);
    const normalizedRegistrationNumber = normalize(businessRegistrationNumber);
    const detectedRegistrationNumber = findRegistrationNumber(
        rawText,
        businessRegistrationNumber
    );
    const registrationNumberMatch = Boolean(
        normalizedRegistrationNumber &&
        normalizedText.includes(normalizedRegistrationNumber)
    );

    const businessTokens = [...new Set(tokenize(businessName))];
    const matchedBusinessTokens = businessTokens.filter(token =>
        normalizedText.includes(token)
    );
    const businessNameSimilarity = businessTokens.length
        ? matchedBusinessTokens.length / businessTokens.length
        : 0;

    const expectedKeywords = [
        "DTI",
        "DEPARTMENT OF TRADE AND INDUSTRY",
        "REGISTRATION",
        "CERTIFICATE",
        "BUSINESS NAME"
    ];
    const keywordsFound = expectedKeywords.filter(keyword =>
        normalizedText.includes(normalize(keyword))
    );

    const numberScore = registrationNumberMatch ? 40 : 0;
    const businessNameScore = Math.round(businessNameSimilarity * 30);
    const keywordScore = Math.min(15, keywordsFound.length * 5);
    const confidenceScore = Math.min(
        15,
        Math.round(Math.max(0, Math.min(100, confidence)) * 0.15)
    );
    const consistencyScore = Math.min(
        100,
        numberScore + businessNameScore + keywordScore + confidenceScore
    );

    let recommendation = "possible_mismatch";

    if (rawText.length < 20 || confidence < 25) {
        recommendation = "unreadable_document";
    } else if (consistencyScore >= 75 && registrationNumberMatch) {
        recommendation = "strong_match";
    } else if (consistencyScore >= 45) {
        recommendation = "manual_review";
    }

    return {
        version: 1,
        decisionSupportOnly: true,
        confidence: Math.round(Number(confidence) || 0),
        consistencyScore,
        recommendation,
        submitted: {
            businessName,
            businessRegistrationNumber
        },
        detected: {
            businessRegistrationNumber: detectedRegistrationNumber
        },
        comparisons: {
            registrationNumberMatch,
            businessNameSimilarity: Number(businessNameSimilarity.toFixed(2)),
            matchedBusinessTokens,
            keywordsFound
        },
        scoring: {
            registrationNumber: numberScore,
            businessName: businessNameScore,
            expectedKeywords: keywordScore,
            ocrConfidence: confidenceScore
        }
    };
}

module.exports = { analyzeBusinessLicense };
