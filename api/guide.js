const SYSTEM_INSTRUCTIONS = `أنت مساعد جلسة، رفيق تخطيط عربي دافئ ومختصر يساعد الأسرة على إعداد وقت مشترك.
مهمتك: اقتراح جلسة قابلة للتنفيذ تتضمن مدة وخطوات وأسئلة أو نشاطًا يناسب طلب المستخدم. استخدم لهجة عربية طبيعية قريبة من المستخدم دون مبالغة أو عبارات تسويقية. اسأل سؤال توضيح واحدًا فقط إذا كان ضروريًا، وإلا قدّم اقتراحًا عمليًا مباشرة.
لا تطلب أسماء أشخاص أو أرقام اتصال أو معلومات تعريفية/حساسة. يمكن اقتراح عمر تقريبي أو مرحلة عمرية فقط. اجعل المشاركة اختيارية وتجنب الإحراج والإجبار، وقدّم خيار تجاوز أي نشاط.
لا تدّعِ أنك إنسان. إذا سُئلت، كن واضحًا بأنك مساعد ذكي. لا تقدّم تشخيصًا أو علاجًا نفسيًا أو طبيًا، ولا تَعِد بنتائج أو أثر مضمون. إذا كان الطلب خارج تخطيط الحوار والأنشطة العائلية، أجب بلطف وارجع للمجال. لا تخترع نتائج أو حقائق عن المشروع. أجب بلغة المستخدم، وبشكل منظم يمكن تطبيقه فورًا.`;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

function readOutput(payload) {
  if (typeof payload.output_text === "string") return payload.output_text.trim();
  const text = [];
  for (const item of payload.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part.type === "output_text" && typeof part.text === "string") text.push(part.text);
    }
  }
  return text.join("\n").trim();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "استخدم طلب POST لإرسال رسالة." });
  }
  if (!process.env.OPENAI_API_KEY) return send(res, 503, { error: "المساعد غير مهيأ بعد. أضف مفتاح الخدمة إلى متغيرات البيئة في إعدادات الاستضافة." });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return send(res, 400, { error: "تعذر قراءة الطلب." }); }
  }
  const incoming = Array.isArray(body?.messages) ? body.messages.slice(-8) : [];
  const messages = incoming
    .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 1200) }))
    .filter(m => m.content.length > 0);
  if (!messages.length || messages[messages.length - 1].role !== "user") return send(res, 400, { error: "اكتبوا طلبًا قصيرًا أولًا." });
  if (messages.reduce((sum, m) => sum + m.content.length, 0) > 5000) return send(res, 413, { error: "اختصروا سياق المحادثة قليلًا ثم حاولوا مجددًا." });

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6-astra",
        instructions: SYSTEM_INSTRUCTIONS,
        input: messages,
        max_output_tokens: 700,
        store: false
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("OpenAI API request failed", response.status, result?.error?.code || "unknown");
      return send(res, response.status === 429 ? 429 : 502, { error: response.status === 429 ? "وصلنا للحد المؤقت للطلبات. انتظروا قليلًا ثم حاولوا مجددًا." : "ما قدرنا نجهز اقتراحًا الآن. حاولوا مرة ثانية بعد قليل." });
    }
    const answer = readOutput(result);
    if (!answer) return send(res, 502, { error: "لم يصل رد قابل للعرض. جرّبوا طلبًا أقصر." });
    return send(res, 200, { answer });
  } catch (error) {
    console.error("Assistant request failed", error?.name || "Error");
    return send(res, 502, { error: "تعذر الاتصال بالمساعد الآن. تحققوا من اتصالكم ثم حاولوا مجددًا." });
  }
};
