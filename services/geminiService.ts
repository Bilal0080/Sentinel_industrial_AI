import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { HazardSeverity, AnalysisResult, AttendanceHealthAudit, EmployeeFitnessResult, FitnessRoutine, GroundingSource } from "../types";

export const generateGroundFitnessRoutine = async (workerIssues: string = "general fatigue"): Promise<FitnessRoutine> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Act as an Industrial Physical Therapist. Generate a high-performance 30-minute "Ground Tactical Fitness" routine for factory workers.
    
    The user is reporting these issues: ${workerIssues}.
    
    CRITICAL MANDATE:
    1. START with the "Sentinel 1L Protocol": Every worker MUST drink at least 1 Liter of water BEFORE breakfast or any dairy intake. 
    2. Sequence must last exactly 30 minutes total.
    
    Return in JSON: { routineName, totalDuration, steps: [{title, duration, instruction, benefit, focusArea}], warningNote }`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          routineName: { type: Type.STRING },
          totalDuration: { type: Type.STRING },
          steps: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                duration: { type: Type.STRING },
                instruction: { type: Type.STRING },
                benefit: { type: Type.STRING },
                focusArea: { type: Type.STRING }
              },
              required: ["title", "duration", "instruction", "benefit", "focusArea"]
            }
          },
          warningNote: { type: Type.STRING }
        },
        required: ["routineName", "totalDuration", "steps", "warningNote"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (err) {
    console.error("Routine generation failed", err);
    throw err;
  }
};

export const analyzeImageForHazards = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        {
          text: `Act as a specialized industrial safety engineer. Analyze this image for environment hazards.
          
          SENTINEL PROTOCOL REQUIREMENTS:
          1. SILENT INTER-EMPLOYEE HAZARDS: Identify conditions that might lead to one employee inadvertently moving another into harm's way (e.g., poor visibility, shared workspace conflicts, slippery transition points).
          2. TETRA PAK INTEGRITY: Detect any swelling, leaks, or seal failures in UHT containers.
          3. 1L HYDRATION MANDATE: Analyze worker stance/expression for dehydration indicators (e.g., slumped shoulders, parched lips).
          4. RISK CODE MAPPING: Categorize hazards using Stop 6 (Pinch, Electrical, Fall, Vehicle, General/Footwear).

          Return JSON:
          - hazards: Array of { "title", "category", "potentialRisk", "preventativeMeasure", "footwearCause", "severity" }
          - severity: Highest level detected (LOW, MEDIUM, HIGH, CRITICAL)
          - metabolicHeatIndex: Score from 0-10
          - recommendations: Array of string directives.`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hazards: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                potentialRisk: { type: Type.STRING },
                preventativeMeasure: { type: Type.STRING },
                footwearCause: { type: Type.STRING },
                severity: { type: Type.STRING, enum: Object.values(HazardSeverity) }
              },
              required: ["title", "category", "potentialRisk", "preventativeMeasure", "severity"]
            } 
          },
          severity: { type: Type.STRING, enum: Object.values(HazardSeverity) },
          metabolicHeatIndex: { type: Type.NUMBER },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["hazards", "severity", "metabolicHeatIndex", "recommendations"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("AI Analysis Failed", error);
    return { hazards: [], severity: HazardSeverity.LOW, metabolicHeatIndex: 0, recommendations: ["System link timed out. Manual audit recommended."] };
  }
};

export const analyzeWashroomSanitation = async (base64Image: string, ambientTemp: number = 25): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { 
          text: `Act as an EHS Sanitation Auditor. Analyze this industrial washroom at ambient temp: ${ambientTemp}°C.
          
          CRITICAL PROTOCOLS:
          1. BACTERIAL PROLIFERATION: If temperature is > 35°C, prioritize warnings about rapid microbial growth in stagnant puddles, damp surfaces, or plumbing leaks. This is a severe health risk.
          2. 1L WATER MANDATE: If temperature is > 35°C, emphasize the sanitation of hydration points. Remind workers that drinking 1 Liter of water BEFORE breakfast is mandatory to counteract metabolic heat stress.
          3. STANDARD HAZARDS: Identify slips (puddles), plumbing failures, and soap/sanitizer shortages.
          
          Return JSON:
          - hazards: Array of { "title", "category", "potentialRisk", "preventativeMeasure", "severity" }
          - severity: Highest level (LOW, MEDIUM, HIGH, CRITICAL)
          - recommendations: Array of strings.`
        }
      ]
    },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hazards: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                category: { type: Type.STRING },
                potentialRisk: { type: Type.STRING },
                preventativeMeasure: { type: Type.STRING },
                severity: { type: Type.STRING, enum: Object.values(HazardSeverity) }
              },
              required: ["title", "category", "potentialRisk", "preventativeMeasure", "severity"]
            } 
          },
          severity: { type: Type.STRING, enum: Object.values(HazardSeverity) },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["hazards", "severity", "recommendations"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const analyzeHygieneSafety = async (base64Image: string, context: string = "General", ambientTemp: number = 25): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { 
          text: `Industrial Hygiene Audit. Context: ${context}. Temp: ${ambientTemp}C.
          Focus on Tetra Pak integrity and metabolic heat impact of dairy vs the 1L water protocol.`
        }
      ]
    },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hazards: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                title: {type:Type.STRING}, 
                severity: {type:Type.STRING, enum: Object.values(HazardSeverity)},
                category: {type:Type.STRING},
                potentialRisk: {type:Type.STRING},
                preventativeMeasure: {type:Type.STRING},
                thermalImpact: {type:Type.STRING}
              },
              required: ["title", "severity", "category", "potentialRisk", "preventativeMeasure"]
            } 
          },
          metabolicHeatIndex: { type: Type.NUMBER },
          severity: { type: Type.STRING, enum: Object.values(HazardSeverity) },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["hazards", "metabolicHeatIndex", "severity", "recommendations"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const analyzeEmployeeFitness = async (base64Image: string): Promise<EmployeeFitnessResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Analyze employee fitness and 1L water compliance status. Return JSON with status (FIT, UNFIT, AT-RISK), vitalityScore (0-100), observations array, ppeCompliant boolean, detectedSymptoms array, and recommendation string.` }
      ]
    },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING, enum: ['FIT', 'UNFIT', 'AT-RISK'] },
          vitalityScore: { type: Type.NUMBER },
          observations: { type: Type.ARRAY, items: { type: Type.STRING } },
          ppeCompliant: { type: Type.BOOLEAN },
          detectedSymptoms: { type: Type.ARRAY, items: { type: Type.STRING } },
          recommendation: { type: Type.STRING }
        },
        required: ["status", "vitalityScore", "observations", "ppeCompliant", "detectedSymptoms", "recommendation"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const analyzeAttendanceHealth = async (base64Image: string): Promise<AttendanceHealthAudit> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { inlineData: { mimeType: 'image/jpeg', data: base64Image } },
        { text: `Analyze shift health logs for attendance rate, active sick leaves, top symptoms with counts, correlation findings, workforce vitality score (0-100), and overall severity (LOW, MEDIUM, HIGH, CRITICAL).` }
      ]
    },
    config: { 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          attendanceRate: { type: Type.NUMBER },
          activeSickLeaves: { type: Type.NUMBER },
          topSymptoms: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { symptom: { type: Type.STRING }, count: { type: Type.NUMBER } } 
            } 
          },
          correlationFindings: { type: Type.STRING },
          workforceVitalityScore: { type: Type.NUMBER },
          severity: { type: Type.STRING, enum: Object.values(HazardSeverity) }
        },
        required: ["attendanceRate", "activeSickLeaves", "topSymptoms", "correlationFindings", "workforceVitalityScore", "severity"]
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const analyzeCanteenSafety = analyzeHygieneSafety;

export const searchSafetyStandards = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find official safety standards for: ${query}. Focus on industrial regulations.`,
    config: { tools: [{ googleSearch: {} }] },
  });
  
  // Extracting grounding sources from response candidates grounding metadata
  const sources: GroundingSource[] = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Safety Standard Source',
    uri: chunk.web?.uri || ''
  })).filter((s: GroundingSource) => s.uri !== '') || [];

  return { 
    text: response.text || "No detailed standard found.", 
    sources 
  };
};