
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { HazardSeverity, AnalysisResult, AttendanceHealthAudit, EmployeeFitnessResult, FitnessRoutine } from "../types";

export const generateGroundFitnessRoutine = async (workerIssues: string = "general fatigue"): Promise<FitnessRoutine> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Act as an Industrial Physical Therapist. Generate a high-performance 30-minute "Ground Tactical Fitness" routine for factory workers.
    
    The user is reporting these issues: ${workerIssues}.
    
    CRITICAL MANDATE:
    1. START with a mandatory "Hydration Integration" step (addressing the 'no morning water' hazard).
    2. Sequence must last exactly 30 minutes total.
    3. Focus on mobility, lower back decompression, and metabolic alertness.
    4. Provide steps with clear instructions.
    
    Return in JSON:
    - routineName: string
    - totalDuration: "30 Minutes"
    - steps: Array of { title, duration, instruction, benefit, focusArea }
    - warningNote: string about safety during exercise.`,
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
          text: `Act as a specialized industrial safety engineer utilizing the Stop 6 Safety Audit methodology. Analyze this image for critical physical hazards.
          
          STOP 6 CATEGORY MAPPING:
          - CODE A (Pinch): Moving parts, gears, rollers, or point-of-operation points that could trap limbs.
          - CODE E (Electrical): Exposed wiring, open panels, overloaded circuits, or water near power.
          - CODE F (Fall): Work at height, unprotected ledges, floor openings, or slippery ladders.
          - CODE C (Car/Heavy): Moving vehicles (forklifts, AGVs), heavy loads with wheels, or traffic lane violations.
          - CODE G (General): Other hazards like fire, gas leaks, structural issues, or SILENT METABOLIC HAZARDS (e.g., lack of hydration stations).

          For each hazard found, provide:
          1. A concise title.
          2. The Stop 6 Category (Must be one of: A, E, F, C, or G).
          3. The potential risk/consequence.
          4. A suggested preventative measure.

          Return the analysis in JSON format with properties: 
          - hazards: Array of objects { "title", "category", "potentialRisk", "preventativeMeasure" }
          - severity: One of "LOW", "MEDIUM", "HIGH", "CRITICAL"
          - recommendations: Array of strings explaining immediate relocation or emergency steps.`
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
                category: { type: Type.STRING, description: "The Stop 6 Code: A, E, F, C, or G" },
                potentialRisk: { type: Type.STRING },
                preventativeMeasure: { type: Type.STRING }
              },
              required: ["title", "category", "potentialRisk", "preventativeMeasure"]
            } 
          },
          severity: { type: Type.STRING, enum: Object.values(HazardSeverity) },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ["hazards", "severity", "recommendations"]
      }
    }
  });

  try {
    const text = response.text || '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse AI response", error);
    return {
      hazards: [],
      severity: HazardSeverity.LOW,
      recommendations: ["Ensure manual inspection is performed."]
    };
  }
};

export const analyzeEmployeeFitness = async (base64Image: string): Promise<EmployeeFitnessResult> => {
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
          text: `Act as an Occupational Health Physician and Safety Compliance Officer. Analyze this employee at shift check-in.
          
          ASSESSMENT CRITERIA:
          1. PHYSICAL STATE: Look for signs of fatigue (heavy eyelids, dark circles), illness (pale skin, sweating), or intoxication/unsteadiness.
          2. CRITICAL ALERT - MORNING HYDRATION: Look for signs of dehydration (chapped lips, sunken eyes, dry skin). If it is early morning and they show signs of not having drunk water, flag as "UNFIT" or "AT-RISK".
          3. PPE COMPLIANCE: Is the employee wearing a safety helmet and high-visibility vest?
          4. READINESS: Do they appear alert and capable of operating heavy machinery?

          Return the analysis in JSON format:
          - status: One of "FIT", "UNFIT", "AT-RISK".
          - vitalityScore: Number 0-100 (100 being perfectly healthy and alert).
          - observations: Array of strings (e.g., "Slight tremors in posture", "Visible dry lips - possible dehydration").
          - ppeCompliant: Boolean.
          - detectedSymptoms: Array of strings (e.g., "Fatigue", "Dehydration - No morning water intake suspected").
          - recommendation: String (e.g., "Refer to hydration station immediately", "Issue safety vest").`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          status: { type: Type.STRING },
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

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Fitness analysis parse error", error);
    throw error;
  }
};

export const analyzeHygieneSafety = async (base64Image: string, context: string = "General", ambientTemp: number = 25): Promise<AnalysisResult> => {
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
          text: `Act as a senior public health and industrial dietician. Analyze this environment focusing on ${context} in an ambient plant temperature of ${ambientTemp}°C.
          
          CRITICAL "BIG HAZARD" ALERT:
          - EARLY MORNING DEHYDRATION: If workers have not consumed water in the early morning before shift, their core temperature is highly unstable.
          - If context involves water stations or canteen, check for easy access to drinking water.
          
          IF CONTEXT INVOLVES FOOD:
          - THERMAL-METABOLIC SYNERGY: Analyze how this food affects core body temperature. 
            * HIGH OIL/FAT: Increases "Thermogenesis" (metabolic heat). In high ambient temps, this prevents the body from cooling down.
            * HIGH CHILI (MIRCHI): Causes vasodilation and sweating. If workers don't have adequate hydration in high heat (ESPECIALLY NO MORNING WATER), this leads to rapid dehydration and fainting.
          - RISK ASSESSMENT: If Ambient Temp > 32°C AND food is high oil/spice OR no water intake, flag as CRITICAL.
          
          Return analysis in JSON:
          - hazards: Array of objects { "title", "category", "potentialRisk", "preventativeMeasure", "thermalImpact" }
          - metabolicHeatIndex: Number 1-10 (How much this food increases internal heat).
          - severity: One of "LOW", "MEDIUM", "HIGH", "CRITICAL".
          - recommendations: Specific advice for this temperature (e.g., "Serve cooling yogurt/raita to offset mirchi-induced heat stress").
          - watchlist: Array of objects { "symptom", "timeframe", "severity", "actionRequired" }.`
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
                thermalImpact: { type: Type.STRING }
              },
              required: ["title", "category", "potentialRisk", "preventativeMeasure", "thermalImpact"]
            } 
          },
          metabolicHeatIndex: { type: Type.NUMBER },
          severity: { type: Type.STRING, enum: Object.values(HazardSeverity) },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          watchlist: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symptom: { type: Type.STRING },
                timeframe: { type: Type.STRING },
                severity: { type: Type.STRING, enum: Object.values(HazardSeverity) },
                actionRequired: { type: Type.STRING }
              },
              required: ["symptom", "timeframe", "severity", "actionRequired"]
            }
          }
        },
        required: ["hazards", "metabolicHeatIndex", "severity", "recommendations", "watchlist"]
      }
    }
  });

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse AI response", error);
    return {
      hazards: [],
      metabolicHeatIndex: 5,
      severity: HazardSeverity.LOW,
      recommendations: ["Manual nutritional audit required."],
      watchlist: []
    };
  }
};

export const analyzeAttendanceHealth = async (base64Image: string): Promise<AttendanceHealthAudit> => {
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
          text: `Act as an industrial Occupational Health & Safety (OHS) analyst. Analyze this shift health report or attendance sheet.
          
          Look for:
          1. High rates of specific symptoms (e.g., stomach pain, exhaustion, nausea).
          2. Correlation between these symptoms and recent canteen alerts (oil/mirchi/sanitation).
          3. CRITICAL: Identify if many workers are reporting dizziness or thirst early in the shift - sign of NO MORNING WATER intake.
          
          Provide output in JSON:
          - attendanceRate: number (0-100)
          - activeSickLeaves: number
          - topSymptoms: Array of objects { "symptom", "count" }
          - correlationFindings: string explaining how this links to silent plant hazards.
          - workforceVitalityScore: number (0-100)
          - severity: One of "LOW", "MEDIUM", "HIGH", "CRITICAL"`
        }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          attendanceRate: { type: Type.NUMBER },
          activeSickLeaves: { type: Type.INTEGER },
          topSymptoms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symptom: { type: Type.STRING },
                count: { type: Type.INTEGER }
              }
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

  try {
    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Failed to parse AI response", error);
    throw error;
  }
};

export const analyzeCanteenSafety = analyzeHygieneSafety;

export const searchSafetyStandards = async (query: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Find official OSHA or international industrial safety guidelines regarding: ${query}. Focus on silent hazards and sanitation standards.`,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map((chunk: any) => ({
    title: chunk.web?.title || 'Safety Source',
    uri: chunk.web?.uri || '#'
  })) || [];

  return {
    text: response.text,
    sources
  };
};
