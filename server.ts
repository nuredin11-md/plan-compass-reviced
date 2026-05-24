import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Gemini SDK with telemetry header
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[Warning] GEMINI_API_KEY is not defined. Falling back to mock analytics.");
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Expose a health API endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Expose a secure proxy endpoint for Google Workspace APIs to bypass iframe CORS constraints
app.post("/api/workspace/proxy", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing authorization header for Google Workspace Proxy." });
    }

    const { url, method, body, headers: customHeaders } = req.body;
    if (!url) {
      return res.status(400).json({ error: "Missing destination URL to proxy." });
    }

    // Secure proxy constraints: limit to allowed Google Workspace API subdomains
    if (
      !url.startsWith("https://tasks.googleapis.com/") &&
      !url.startsWith("https://sheets.googleapis.com/") &&
      !url.startsWith("https://slides.googleapis.com/")
    ) {
      return res.status(400).json({ error: "Permission denied for proxy destination URL." });
    }

    const fetchOptions: any = {
      method: method || "GET",
      headers: {
        "Authorization": authHeader,
        "Accept": "application/json",
        "Content-Type": "application/json",
        ...customHeaders
      }
    };

    if (body && (method === "POST" || method === "PUT" || method === "PATCH")) {
      fetchOptions.body = typeof body === "string" ? body : JSON.stringify(body);
    }

    const googleRes = await fetch(url, fetchOptions);
    
    const contentType = googleRes.headers.get("content-type");
    let responseData;
    if (contentType && contentType.includes("application/json")) {
      responseData = await googleRes.json();
    } else {
      responseData = { text: await googleRes.text() };
    }

    res.status(googleRes.status).json(responseData);
  } catch (error: any) {
    console.error("Workspace API Proxy error:", error);
    res.status(500).json({ error: error?.message || "Failed to route Workspace request through backend proxy." });
  }
});

// Expose AI Analysis endpoint
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const { indicators, monthlyData, profile, requestType } = req.body;

    if (!indicators || !monthlyData || !profile) {
      return res.status(400).json({ error: "Missing required parameters: indicators, monthlyData, and profile are required." });
    }

    const ai = getGeminiClient();

    // If API key is not configured, send beautiful mock responses so the user can still test the interface flawlessly
    if (!ai) {
      const mockResult = generateMockAiData(indicators, monthlyData, profile);
      return res.json({
        success: true,
        source: "mock_engine",
        data: mockResult
      });
    }

    // Build targeted detailed prompt for Gemini
    const systemPrompt = `You are Plan Compass's senior health systems data scientist and medical performance evaluator.
Your goal is to perform:
1. Trend Analysis: Identify patient inflow trends, clinical resource utilization, vaccine campaigns, disease outbreaks or diagnostic shifts based on historical actuals (using EFY 2016 and 2017 as past performance for comparisons).
2. Predictive Modeling: Generate monthly forecasts for the next 4 months. Predict bed occupancy bottlenecks (expressed as percentage), staffing adequacy, and critical medical supply gap evaluations.
3. KPI & Strategic Evaluation: Measure achievements of EFY 2018 against its corresponding baseline (EFY 2017 performance) and plan target (EFY 2018 plan), setting clinical status and remedial recovery instructions. Formulate how the full EFY 2018 performance applies as a baseline for the EFY 2019 plan.
4. Actionable Strategic Recommendations: Formulate a list of high-priority clinical directives, assigning clear timelines, priority tiers, and required inputs.

Analyze the data with extreme mathematical consistency. Do not hallucinate numbers; respect the multi-year baseline progression: 2017 performance is the baseline for the 2018 plan, and the full 2018 performance is the baseline for the 2019 plan. Calculate real aggregate rates where possible from the provided data. Remember that months follow the Ethiopian Calendar order: Hamle, Nehase, Meskerem, Tikimt, Hidar, Tahsas, Tirr, Yekatit, Megabit, Miazia, Ginbot, Sene.`;

    const userPrompt = `Perform analysis for the department: "${profile.department}" in facility: "${profile.facility}", located in "${profile.region}".
    
Indicators:
${JSON.stringify(indicators, null, 2)}

Historical Monthly Reporting Entries:
${JSON.stringify(monthlyData, null, 2)}

Active User Profile Context:
${JSON.stringify(profile, null, 2)}

Please provide the output directly structured into JSON matching the requested schema.`;

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.1, // low temperature for analytical accuracy
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            required: ["trendAnalysis", "predictiveModeling", "kpiEvaluation", "overallRecommendations"],
            properties: {
              trendAnalysis: {
                type: Type.OBJECT,
                required: ["summary", "insights"],
                properties: {
                  summary: { type: Type.STRING, description: "A high-level executive summary of historical data patterns, patient inflow fluctuations, and anomalies." },
                  insights: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["title", "description", "indicatorCode", "trendDirection"],
                      properties: {
                        title: { type: Type.STRING, description: "Short descriptive title of the insight." },
                        description: { type: Type.STRING, description: "Detailed clinical description and possible structural causes (e.g., vaccine supply chain delays, rainy season outbreaks)." },
                        indicatorCode: { type: Type.STRING, description: "Relevant indicator code or 'ALL'." },
                        trendDirection: { type: Type.STRING, enum: ["increasing", "decreasing", "stable", "fluctuating"] }
                      }
                    }
                  }
                }
              },
              predictiveModeling: {
                type: Type.OBJECT,
                required: ["summary", "predictions"],
                properties: {
                  summary: { type: Type.STRING, description: "Executive summary explaining forecasted workload, staffing risks, and resource gaps for the upcoming months." },
                  predictions: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["indicatorCode", "indicatorName", "forecastedMonths", "staffingNeedScore", "bedOccupancyForecast", "resourceGapAnalysis"],
                      properties: {
                        indicatorCode: { type: Type.STRING, description: "Relevant indicator code" },
                        indicatorName: { type: Type.STRING, description: "Human descriptive name of the indicator" },
                        forecastedMonths: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            required: ["month", "value", "confidenceIntervalLower", "confidenceIntervalUpper"],
                            properties: {
                              month: { type: Type.STRING, description: "The name of the forecasted month, e.g. Tikimt, Hidar, Tahsas, Tirr" },
                              value: { type: Type.NUMBER, description: "The projected value for this month based on trend modeling" },
                              confidenceIntervalLower: { type: Type.NUMBER },
                              confidenceIntervalUpper: { type: Type.NUMBER }
                            }
                          }
                        },
                        staffingNeedScore: { type: Type.STRING, enum: ["adequate", "warning_shortage", "critical_shortage"] },
                        bedOccupancyForecast: { type: Type.NUMBER, description: "Predicted bed occupancy percentage for the department, e.g., 85" },
                        resourceGapAnalysis: { type: Type.STRING, description: "Details of predicted equipment, bed, or pharmaceutical shortfalls" }
                      }
                    }
                  }
                }
              },
              kpiEvaluation: {
                type: Type.OBJECT,
                required: ["summary", "evaluations"],
                properties: {
                  summary: { type: Type.STRING, description: "Comparative overview of performance achievements of EFY 2018 relative to the EFY 2017 baselines and EFY 2018 targets." },
                  evaluations: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      required: ["indicatorCode", "name", "baseline", "target", "currentActual", "achievementPercentage", "kpiStatus", "remedialGuidance"],
                      properties: {
                        indicatorCode: { type: Type.STRING },
                        name: { type: Type.STRING },
                        baseline: { type: Type.NUMBER },
                        target: { type: Type.NUMBER },
                        currentActual: { type: Type.NUMBER },
                        achievementPercentage: { type: Type.NUMBER, description: "Calculated progress score relative to target" },
                        kpiStatus: { type: Type.STRING, enum: ["exceeded", "on_track", "off_track", "critical"] },
                        remedialGuidance: { type: Type.STRING, description: "Actionable strategic directive to rescue performance" }
                      }
                    }
                  }
                }
              },
              overallRecommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  required: ["title", "actionSteps", "priority", "timeline", "estimatedImpact"],
                  properties: {
                    title: { type: Type.STRING, description: "Core recommendation title" },
                    actionSteps: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    },
                    priority: { type: Type.STRING, enum: ["critical", "high", "medium"] },
                    timeline: { type: Type.STRING, description: "Expected timeline, e.g. Immediate (2 weeks), Short-term (1 month), etc." },
                    estimatedImpact: { type: Type.STRING, description: "Description of potential performance uplift" }
                  }
                }
              }
            }
          }
        }
      });
    } catch (genAiError: any) {
      console.warn("AI Analysis: Gemini call ran into quota or billing issues (e.g., 429 RESOURCE_EXHAUSTED). Gracefully falling back to local forecasting engine.", genAiError);
      const mockResult = generateMockAiData(indicators, monthlyData, profile);
      return res.json({
        success: true,
        source: "mock_engine",
        data: mockResult
      });
    }

    const parsedData = JSON.parse(response?.text || "{}");
    return res.json({
      success: true,
      source: "gemini_copilot",
      data: parsedData
    });

  } catch (error: any) {
    console.error("AI Analysis outer error:", error);
    res.status(500).json({ error: error?.message || "Internal server error occurred during AI analysis." });
  }
});

// Mock generator in case GEMINI_API_KEY is not configured
function generateMockAiData(indicators: any[], monthlyData: any[], profile: any) {
  const deptIndicators = indicators.filter(ind => profile.department === "All" || ind.department === profile.department);
  const activeIndicators = deptIndicators.length > 0 ? deptIndicators : indicators.slice(0, 3);
  
  // Predict upcoming Ethiopian months based on what is reported
  const mockForecastingMonths = ["Tikimt", "Hidar", "Tahsas", "Tirr"];

  const trendInsights = activeIndicators.map((ind, idx) => {
    const directions = ["increasing", "decreasing", "stable", "fluctuating"];
    const direction = directions[idx % directions.length];
    
    let cause = "supply chain constraints and seasonal access factors.";
    if (ind.code.includes("ANC")) cause = "community antenatal awareness camp registrations coupled with local ambulance scheduling adjustments.";
    if (ind.code.includes("SBA")) cause = "wet season road washouts preventing access to Addis Alem Referral clinical facilities safely.";
    if (ind.code.includes("TB")) cause = "proactive house-to-house sputum screening operations by community health extension workers.";
    if (ind.code.includes("NCD")) cause = "outpatient clinic drug shortages specifically for first-tier hypertensive therapies.";

    return {
      title: `${ind.name} ${direction === "increasing" ? "Uptrend" : direction === "decreasing" ? "Decline" : "Stabilization"} Detected`,
      description: `Analysis shows a performance rate shifting towards a ${direction} pattern. This is primarily attributed to ${cause}`,
      indicatorCode: ind.code,
      trendDirection: direction
    };
  });

  const predictions = activeIndicators.map((ind, idx) => {
    // Forecast trend progression using 2017 performance as baseline and 2018 plan as target
    const baseline = ind.perf2017 || 10;
    const target = ind.plan2018 || 12;
    const slope = (target - baseline) * 0.08;

    const forecastedMonths = mockForecastingMonths.map((m, mIdx) => {
      const scaleValue = Math.round(baseline + (slope * (mIdx + 4)) + (Math.sin(mIdx + idx) * 3));
      const value = Math.max(1, scaleValue);
      return {
        month: m,
        value,
        confidenceIntervalLower: Math.max(0, value - 5),
        confidenceIntervalUpper: value + 6
      };
    });

    const isShortage = ind.code.includes("SBA") || ind.code.includes("TB");
    const isAdequate = ind.code.includes("ANC") || ind.code.includes("HIV");

    return {
      indicatorCode: ind.code,
      indicatorName: ind.name,
      forecastedMonths,
      staffingNeedScore: isShortage ? "warning_shortage" : isAdequate ? "adequate" : "critical_shortage",
      bedOccupancyForecast: Math.min(95, Math.max(40, 65 + (idx * 9) + (Math.sin(idx) * 5))),
      resourceGapAnalysis: ind.code.includes("NCD") 
        ? "Severe: Current outpatient load threatens to deplete local diuretic stock by Tahsas unless reorder triggers are compressed."
        : "Standard: Bed ratio and specialized pediatric resources remain capable of buffer load absorbing for next quarter."
    };
  });

  const evaluations = activeIndicators.map((ind, idx) => {
    const currentActual = ind.perf2018 !== null ? ind.perf2018 : Math.round((ind.perf2017 + ind.plan2018) / 2);
    const target = ind.plan2018 || 1;
    const pct = Math.round((currentActual / target) * 100);
    
    let kpiStatus = "on_track";
    let remedial = "Continue routine supervising visit validation logs.";
    if (pct < 60) {
      kpiStatus = "critical";
      remedial = `URGENT: Re-allocate mobile outreach vehicle fuels to prioritize ${ind.name} clinical services in remote locations immediately.`;
    } else if (pct < 85) {
      kpiStatus = "off_track";
      remedial = `Review clinical guidelines and monitor service output regularly for ${ind.name}.`;
    } else if (pct >= 100) {
      kpiStatus = "exceeded";
      remedial = "Document best practices for sharing with auxiliary sister health institutions in the administrative cluster.";
    }

    return {
      indicatorCode: ind.code,
      name: ind.name,
      baseline: ind.perf2017,
      target,
      currentActual,
      achievementPercentage: pct,
      kpiStatus,
      remedialGuidance: remedial
    };
  });

  const overallRecommendations = [
    {
      title: "Optimizing Outreach Resource Logistics",
      actionSteps: [
        "Incorporate a secondary maternity transport ambulance unit specifically assigned for Sene-to-Hidar peak seasons.",
        "Launch mobile clinics specifically in kebeles experiencing SBA rate drops."
      ],
      priority: "high",
      timeline: "Short-term (1 month)",
      estimatedImpact: "Expected uplift of up to +12% improvement inside Skilled Delivery markers."
    },
    {
      title: "Emergency Outpatient Drug Security Trigger",
      actionSteps: [
        "Reform pharmaceutical re-order benchmarks to trigger automatic dispatch at 35% remaining storage (currently 15%).",
        "Coordinate emergency borrow protocols with nearby regional depot warehouses."
      ],
      priority: "critical",
      timeline: "Immediate (2 weeks)",
      estimatedImpact: "Eradicate outpatient treatment stalls during supply disruptions."
    }
  ];

  return {
    trendAnalysis: {
      summary: `Historical metrics mapping for "${profile.department}" displays sound data health completeness and normal seasonal trends. The overall aggregate department score reflects robust performance with isolated logistics outliers.`,
      insights: trendInsights
    },
    predictiveModeling: {
      summary: "Forecasting mathematical grids indicate high workload surges on MCH services. Staff constraints will shift to 'warning' thresholds in upcoming months without targeted task-shifting initiatives.",
      predictions
    },
    kpiEvaluation: {
      summary: "Comparative analysis indicates most core indicators are progressing towards the EFY 2016 targets, though specific maternal and NCD objectives require operational resuscitation.",
      evaluations
    },
    overallRecommendations
  };
}

// Vite middleware development setup or serving production built static files
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Plan Compass Engine] Server booted successfully and running on port ${PORT}`);
  });
};

startServer().catch((e) => {
  console.error("Failed to boot server:", e);
});
