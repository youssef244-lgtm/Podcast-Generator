// --- api.js (النسخة "الصح" اللي "بتسمع الكلام") ---
// --- تم إلغاء "الغباء" (بتاع الويتر) ---

// --- !!! (مهم جداً) المفتاح السري بتاعك !!! ---
// ✨✨✨ ده "المكان" اللي إنت حطيت فيه المفتاح بتاعك ✨✨✨
//
const MANUAL_GEMINI_API_KEY = ("AIzaSyCKvyL2uc7jW1PJz5wToLa4mLZi29busyM"); 
// (ملحوظة: أنا سبت المفتاح بتاعك زي ما هو، متعدلش حاجة)


// --- (الكود ده "بيسمع الكلام" وبيستخدم المفتاح اللي فوق "مباشرة") ---
async function fetchWithBackoff(url, options, retries = 5, delay = 1000) {
    
    // 🚀 (تم "إلغاء الغباء")
    // 1. شوف المفتاح اللي "الشريك" حطه فوق
    const apiKey = MANUAL_GEMINI_API_KEY;

    // 2. اتأكد إن "الشريك" حط المفتاح
    if (!apiKey || apiKey === "الصق_مفتاح_Gemini_هنا_بين_علامتي_التنصيص") {
        throw new Error('مفتاح API الخاص بـ Gemini غير موجود. الرجاء وضعه في المكان (2).');
    }
    
    // 3. استخدم المفتاح "مباشرة"
    const urlWithKey = new URL(url);
    if (!urlWithKey.searchParams.has('key')) {
        urlWithKey.searchParams.set('key', apiKey);
    }
    
    // (باقي الكود زي ما هو)
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(urlWithKey.toString(), options);
            if (response.ok) return response;
            
            const errorStatus = response.status;
            let errorData, errorMessage;
            
            try {
                errorData = await response.json();
                errorMessage = errorData?.error?.message || response.statusText;
            } catch (e) {
                errorMessage = response.statusText;
            }

            if (errorStatus === 401 || errorStatus === 403) {
                 throw new Error(`مفتاح API الخاص بـ Gemini غير صالح أو ليس لديه الصلاحية. (الخطأ: ${errorMessage})`);
            }
            if (errorStatus === 429) { 
                if (i === retries - 1) throw new Error('تم استهلاك الحصة. حاول مرة أخرى لاحقاً.');
            }
            else if (errorStatus >= 400 && errorStatus < 500) {
                throw new Error(`خطأ من العميل: ${errorMessage}`);
            }

        } catch (error) {
            if (i === retries - 1) throw error;
        }
        
        const jitter = Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i) + jitter));
    }
    throw new Error('فشل الاتصال بالـ API بعد عدة محاولات.');
}

// --------------------------------------------------
// (باقي الملف زي ما هو - مفيش أي تغيير)
// --------------------------------------------------

function base64ToArrayBuffer(base64) {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function pcmToWav(pcmData, sampleRate) {
    const numChannels = 1, bytesPerSample = 2, blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign, dataSize = pcmData.length * bytesPerSample;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    if (pcmData instanceof Int16Array) {
        for (let i = 0; i < pcmData.length; i++) {
            view.setInt16(44 + i * 2, pcmData[i], true);
        }
    } else {
        const pcm16 = new Int16Array(pcmData);
         for (let i = 0; i < pcm16.length; i++) {
            view.setInt16(44 + i * 2, pcm16[i], true);
        }
    }
    return new Blob([view], { type: 'audio/wav' });
}

// --- (دوال "المواتير" زي ما هي) ---

// دالة لجلب النص فقط (للشرح والإجابة)
export async function generateTextOnly(prompt) {
    const url = "https://generativelace.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
            parts: [{ text: "أنت مساعد ذكي ومتخصص في الإجابة على الأسئلة وشرح المواضيع باللغة العربية. اجعل إجابتك واضحة ومباشرة ومفيدة." }]
        }
    };
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };
    
    const response = await fetchWithBackoff(url, options);
    const result = await response.json();
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء نص.');
    return text;
}

// دالة لجلب الصوت فقط (لقراءة النص والشرح الصوتي)
export async function generateAudioOnly(textToSpeak, voiceName) {
    const url = "https://generativelace.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";
    const payload = {
        contents: [{
            parts: [{ text: `قل هذا النص بوضوح: ${textToSpeak}` }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voiceName }
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };
    
    const response = await fetchWithBackoff(url, options);
    const result = await response.json();
    
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;

    if (!audioData || !mimeType || !mimeType.startsWith("audio/")) {
        throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء ملف صوتي.');
    }
    
    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
    
    const pcmData = base64ToArrayBuffer(audioData);
    const wavBlob = pcmToWav(pcmData, sampleRate);
    return { audioBlob: wavBlob, duration: pcmData.byteLength / (sampleRate * 2) };
}

// دالة لجلب سكريبت البودكاست
export async function generatePodcastScript(prompt) {
    const url = "https://generativelace.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";
    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
            parts: [{ 
                text: `أنت كاتب سيناريو بودكاست حواري ممتاز باللغة العربية.
- حول الفكرة المعطاة إلى حوار شيق بين شخصين: "مقدّم" (فضولي ومتحمس) و "خبير" (هادئ وواثق).
- يجب أن يبدأ الحوار بـ "مقدّم:" وينتهي بـ "خبير:" أو "مقدّم:".
- يجب أن يكون التنسيق دقيقاً: اسم المتحدث، نقطتان، ثم الحوار (مثال: "مقدّم: أهلاً بكم...").
- لا تضف أي مقدمات أو خواتيم خارج الحوار (مثل "بالتأكيد، إليك الحوار:").
- ابدأ مباشرة بـ "مقدّم:"`
            }]
        }
    };
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };
    
    const response = await fetchWithBackoff(url, options);
    const result = await response.json();
    
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || !text.includes("مقدّم:") || !text.includes("خبير:")) {
        throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء سكريبت بودكاست صالح.');
    }
    return text;
}

// دالة لجلب صوت البودكاست (متعدد المتحدثين)
export async function generatePodcastAudio(script) {
    const url = "https://generativelace.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent";
    const payload = {
        contents: [{
            parts: [{ text: `قم بتحويل الحوار التالي إلى صوت:\n${script}` }]
        }],
        generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
                multiSpeakerVoiceConfig: {
                    speakerVoiceConfigs: [
                        { speaker: "مقدّم", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } } },
                        { speaker: "خبير", voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
                    ]
                }
            }
        },
        model: "gemini-2.5-flash-preview-tts"
    };
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    };

    const response = await fetchWithBackoff(url, options);
    const result = await response.json();
    
    const part = result?.candidates?.[0]?.content?.parts?.[0];
    const audioData = part?.inlineData?.data;
    const mimeType = part?.inlineData?.mimeType;

    if (!audioData || !mimeType || !mimeType.startsWith("audio/")) {
        throw new Error('لم يتمكن الذكاء الاصطناعي من إنشاء ملف صوتي للبودكاست.');
    }
    
    const sampleRateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
    
    const pcmData = base64ToArrayBuffer(audioData);
    const wavBlob = pcmToWav(pcmData, sampleRate);
    return { audioBlob: wavBlob, duration: pcmData.byteLength / (sampleRate * 2) };
        }
