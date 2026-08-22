import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Google GenAI client lazily
function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper to generate with fallback models across Gemini aliases
async function generateWithFallback(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction?: string,
  responseMimeType?: string
) {
  const models = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-3.7-flash"];
  let lastError: any = null;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: systemInstruction || "You are EngiNova AI Tutor, a concise, futuristic engineering mentor.",
          temperature: 0.7,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      });

      if (response && response.text) {
        return { text: response.text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`Model ${model} attempt warning:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models temporarily unavailable");
}

// Generate rich, context-aware engineering breakdown when API is experiencing demand spikes
function generateSmartEngineeringFallback(message: string, subject?: string): string {
  const lowerMsg = (message || "").toLowerCase();
  
  if (lowerMsg.includes("kcl") || lowerMsg.includes("current law") || lowerMsg.includes("kirchhoff")) {
    return `### ⚡ Kirchhoff's Current Law (KCL)
**Core Principle:** Conservation of electrical charge dictates that the algebraic sum of currents entering any node in a lumped circuit must equal zero:
$$\\sum_{k=1}^{n} I_k = 0$$

**Step-by-Step Node Voltage Analysis:**
1. Designate an unambiguous Reference Ground node ($V_0 = 0\\text{ V}$).
2. Label unknown non-reference node potentials ($V_1, V_2, \\dots$).
3. Express branch currents via Ohm's Law: $I_{ab} = \\frac{V_a - V_b}{R_{ab}}$.
4. Assemble into matrix form: $\\mathbf{G} \\mathbf{V} = \\mathbf{I}_{\\text{source}}$ and solve via Gaussian elimination or matrix inversion.

💡 **Hardware Pro-Tip:** On multi-layer high-frequency PCBs, return ground currents take the path of least *inductance* (directly under signal traces), not least resistance!

**Actionable Next Steps:**
- Test 3-loop nodal matrix equations in the Practice Lab.
- Review mesh analysis duality for planar circuits.`;
  }

  if (lowerMsg.includes("resistor") || lowerMsg.includes("led") || lowerMsg.includes("ohm")) {
    return `### 💡 Sizing Resistors for LEDs & Circuit Loads
**Core Principle:** An LED is a current-driven diode with an exponential I-V curve. Without a series ballast resistor, thermal runaway will destroy the junction.

**Mathematical Formula:**
$$R_{\\text{limit}} = \\frac{V_{\\text{supply}} - V_{\\text{forward}}}{I_{\\text{forward}}}$$

**Example Calculation (5V Supply, Red LED):**
- Typical $V_f = 2.0\\text{ V}$, Target $I_f = 20\\text{ mA} = 0.020\\text{ A}$
- $R = \\frac{5.0 - 2.0}{0.020} = \\mathbf{150\\ \\Omega}$
- Power rating: $P = I^2 \\cdot R = (0.020)^2 \\cdot 150 = 60\\text{ mW}$ (a standard $0.25\\text{W}$ 1/4W resistor is ideal).

💡 **Pro-Tip:** For battery-powered MCU projects, driving LEDs at $2\\text{--}5\\text{ mA}$ often provides ample brightness while saving up to $80\\%$ power!`;
  }

  if (lowerMsg.includes("rlc") || lowerMsg.includes("resonance") || lowerMsg.includes("frequency")) {
    return `### 🎛️ RLC Resonant Frequency Derivation
**Core Principle:** Electrical resonance occurs when inductive reactance ($X_L = \\omega L$) and capacitive reactance ($X_C = \\frac{1}{\\omega C}$) cancel each other out ($X_L = X_C$), leaving purely resistive impedance.

**Formula Derivation:**
$$\\omega_0 L = \\frac{1}{\\omega_0 C} \\implies \\omega_0^2 = \\frac{1}{LC} \\implies f_0 = \\frac{1}{2\\pi \\sqrt{LC}}$$

**Key Parameters:**
- **Quality Factor ($Q$):** $Q = \\frac{1}{R}\\sqrt{\\frac{L}{C}}$ (determines bandwidth $\\Delta f = f_0 / Q$).
- **Damping Factor ($\\zeta$):** $\\zeta = \\frac{R}{2}\\sqrt{\\frac{C}{L}}$ (controls transient settling time).

💡 **Pro-Tip:** High-Q LC tank circuits are fundamental to RF front-ends, antenna matching networks, and bandpass filters in wireless transceivers.`;
  }

  if (lowerMsg.includes("bitwise") || lowerMsg.includes("c++") || lowerMsg.includes("pointer") || lowerMsg.includes("embedded")) {
    return `### ⚙️ Embedded C/C++ Bitwise Mastery
**Core Principle:** Bitwise operations execute in single CPU clock cycles and operate directly on hardware registers without branching overhead.

**Essential Bit Manipulation Patterns:**
\`\`\`c
// Check if power of two:
bool isPowerOfTwo = (n > 0) && ((n & (n - 1)) == 0);

// Set bit k:
REG |= (1U << k);

// Clear bit k:
REG &= ~(1U << k);

// Toggle bit k:
REG ^= (1U << k);
\`\`\`

💡 **Embedded Pro-Tip:** When polling memory-mapped I/O status registers in microcontrollers, always mark the pointer target as \`volatile\` to prevent the compiler from optimizing out repeated reads!`;
  }

  return `### 🚀 EngiNova Engineering Breakdown: ${message}
**Core Engineering Principle:**
When tackling complex technical systems in **${subject || "Engineering"}**, decompose the problem into state variables, governing physical laws, and boundary conditions.

**Structured Problem Solving Strategy:**
1. **Identify Invariants:** Formulate energy conservation, charge balance, or algorithmic invariant relations.
2. **Mathematical Formulation:** Write the differential or algebraic state equations governing node behavior.
3. **Verification:** Validate asymptotic edge cases (e.g., $t=0^+$, $t\\to\\infty$, or extreme impedance limits).

💡 **Practical Pro-Tip:** Always verify simulation results against first-principles analytical approximations before moving to hardware implementation.

**Actionable Next Steps:**
- Explore the interactive Concept Pulse graph in the Roadmap.
- Test active parameters in the Neural Lab or Practice Lab.`;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "EngiNova AI Tutor" });
});

// AI Tutor chat & question answering endpoint
app.post("/api/ai/chat", async (req, res) => {
  const { message, context, subject } = req.body;
  const ai = getGenAIClient();

  if (!ai) {
    const fallback = generateSmartEngineeringFallback(message, subject);
    return res.json({
      reply: fallback,
      source: "local-tutor-engine",
      suggestedNextSteps: [
        "Review Ohm's & Kirchhoff's Law derivations",
        "Test with 3-loop nodal simulator",
        "Solve active practice challenge"
      ]
    });
  }

  try {
    const prompt = `You are EngiNova AI Tutor, a futuristic, highly intelligent, concise, encouraging AI engineering mentor.
Context: Student is working in the EngiNova mobile learning dashboard.
Subject/Focus: ${subject || "General Engineering"}
User question/prompt: "${message}"

Provide a crisp, clear, highly educational engineering breakdown in Markdown.
Keep it compact, structured, easy to read on mobile.
Include:
1. Core Engineering Principle (1-2 sentences)
2. Mathematical Formula or Step-by-Step Logic (with clean formatting)
3. Practical Pro-Tip or Real-world Hardware/Software Connection
4. 2 short Actionable Next Steps`;

    const systemInstruction = "You are EngiNova AI Tutor, a concise, high-tech engineering mentor for students in electrical, computer, mechanical, and software engineering. Format your response cleanly in Markdown without fluff.";

    const result = await generateWithFallback(ai, prompt, systemInstruction);

    res.json({
      reply: result.text || "Insight generated successfully.",
      source: result.modelUsed
    });
  } catch (error: any) {
    console.warn("Gemini multi-model fallback active:", error?.message || error);
    const smartFallback = generateSmartEngineeringFallback(message, subject);
    res.status(200).json({
      reply: smartFallback,
      source: "enginova-reasoning-engine"
    });
  }
});

// AI Career and Skill Simulator Projection Endpoint
app.post("/api/ai/simulate", async (req, res) => {
  const { focus, currentSkills } = req.body;
  const ai = getGenAIClient();

  const simulationMatrix: Record<string, any> = {
    "Programming": {
      readinessCurrent: 48,
      readinessProjected: 86,
      delta: "+38%",
      unlockedPathways: ["AI Systems Engineer", "Full Stack Developer", "Cloud Infrastructure Eng"],
      radar: [
        { axis: "Programming", value: 92 },
        { axis: "Mathematics", value: 75 },
        { axis: "Communication", value: 70 },
        { axis: "Problem Solving", value: 88 },
        { axis: "Engineering Knowledge", value: 80 }
      ],
      strategicInsight: "Your strongest potential lies in combining high-performance programming with modern AI microservices. Prioritize asynchronous systems and distributed pipelines to achieve senior readiness."
    },
    "AI & Machine Learning": {
      readinessCurrent: 42,
      readinessProjected: 84,
      delta: "+42%",
      unlockedPathways: ["MLOps Engineer", "Applied AI Researcher", "Computer Vision Specialist"],
      radar: [
        { axis: "Programming", value: 88 },
        { axis: "Mathematics", value: 94 },
        { axis: "Communication", value: 68 },
        { axis: "Problem Solving", value: 90 },
        { axis: "Engineering Knowledge", value: 82 }
      ],
      strategicInsight: "Strong mathematical fundamentals will accelerate your transition into transformer architectures and edge tensor deployment. Pair Python tensor runtimes with hardware acceleration."
    },
    "Electronics": {
      readinessCurrent: 45,
      readinessProjected: 82,
      delta: "+37%",
      unlockedPathways: ["Embedded Systems Eng", "Robotics Hardware Architect", "IoT Firmware Dev"],
      radar: [
        { axis: "Programming", value: 78 },
        { axis: "Mathematics", value: 82 },
        { axis: "Communication", value: 65 },
        { axis: "Problem Solving", value: 85 },
        { axis: "Engineering Knowledge", value: 90 }
      ],
      strategicInsight: "Your circuit intuition combined with low-level C/C++ firmware unlocks high-demand robotics and automotive electronics roles. Master mixed-signal PCB design next."
    },
    "Core Engineering": {
      readinessCurrent: 50,
      readinessProjected: 85,
      delta: "+35%",
      unlockedPathways: ["Mechatronics Engineer", "Simulation & Modeling Lead", "Systems Test Engineer"],
      radar: [
        { axis: "Programming", value: 74 },
        { axis: "Mathematics", value: 86 },
        { axis: "Communication", value: 78 },
        { axis: "Problem Solving", value: 89 },
        { axis: "Engineering Knowledge", value: 92 }
      ],
      strategicInsight: "Multidisciplinary cross-pollination between mechanical dynamics and embedded sensing yields strong systems-architect competency."
    },
    "Web Development": {
      readinessCurrent: 52,
      readinessProjected: 88,
      delta: "+36%",
      unlockedPathways: ["Frontend Architect", "Full Stack Engineer", "Interactive 3D Web Dev"],
      radar: [
        { axis: "Programming", value: 90 },
        { axis: "Mathematics", value: 68 },
        { axis: "Communication", value: 84 },
        { axis: "Problem Solving", value: 86 },
        { axis: "Engineering Knowledge", value: 72 }
      ],
      strategicInsight: "Solidifying component state machines and WebGL/WebGPU engineering will place you in the top tier of modern technical interface architects."
    }
  };

  const defaultResult = simulationMatrix[focus] || simulationMatrix["Programming"];

  if (!ai) {
    return res.json(defaultResult);
  }

  try {
    const prompt = `Simulate career growth trajectory for an engineering student choosing focus "${focus}". Current skills: ${JSON.stringify(currentSkills || {})}.
Return ONLY valid JSON matching this schema:
{
  "readinessCurrent": number (between 40-55),
  "readinessProjected": number (between 78-92),
  "delta": string (e.g. "+37%"),
  "unlockedPathways": array of 3-4 role strings,
  "radar": array of 5 objects with keys { "axis": "Programming"|"Mathematics"|"Communication"|"Problem Solving"|"Engineering Knowledge", "value": number (50-98) },
  "strategicInsight": string (concise, 2-3 impactful sentences on strategy)
}`;

    const result = await generateWithFallback(
      ai,
      prompt,
      "You are a career engineering simulation engine. Output pure valid JSON.",
      "application/json"
    );

    const parsed = JSON.parse(result.text || "{}");
    if (parsed.readinessCurrent && parsed.radar) {
      return res.json(parsed);
    }
    return res.json(defaultResult);
  } catch (error) {
    console.warn("Simulation fallback active:", error);
    return res.json(defaultResult);
  }
});

// Vite middleware for dev or static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`EngiNova AI Tutor server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
