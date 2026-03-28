export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { cvText, jobInput } = req.body;

  if (!cvText || cvText.length < 50) {
    return res.status(400).json({ error: 'CV demasiado corto' });
  }

  const jobContext = jobInput ? ` El candidato aspira al puesto: "${jobInput}".` : '';

  const prompt = `Analiza el siguiente CV de forma profesional y devuelve SOLO un objeto JSON válido, sin texto adicional, sin backticks, sin markdown. El JSON debe tener exactamente esta estructura:
{
  "overall": 72,
  "verdict": "CV con buena base pero con margen de mejora en presentación",
  "metrics": [
    {"name": "Estructura y formato", "score": 80},
    {"name": "Experiencia relevante", "score": 65},
    {"name": "Habilidades técnicas", "score": 70},
    {"name": "Claridad y redacción", "score": 75}
  ],
  "strengths": ["punto fuerte concreto 1", "punto fuerte concreto 2", "punto fuerte concreto 3"],
  "improvements": ["área de mejora concreta 1", "área de mejora concreta 2", "área de mejora concreta 3"],
  "recommendations": "Párrafo de 3-4 frases con recomendaciones MUY concretas y accionables."
}
${jobContext}

CV a analizar:
${cvText.substring(0, 3500)}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: 'Error de la API de IA' });
    }

    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Error procesando el análisis' });
  }
}
