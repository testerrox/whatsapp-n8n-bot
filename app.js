import express from 'express';
import bodyParser from 'body-parser';
import qrcode from 'qrcode-terminal';
import fetch from 'node-fetch';
import whatsapp from 'whatsapp-web.js';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer-core';

const { Client, LocalAuth } = whatsapp;

const app = express();
const PORT = process.env.PORT || 3000;

// مسار المتصفح الخارجي - يتم تحديده تلقائياً بناءً على النظام
function getChromePath() {
  try {
    return execSync('which google-chrome').toString().trim();
  } catch {
    try {
      return execSync('which chromium-browser').toString().trim();
    } catch {
      return null;
    }
  }
}

const executablePath = getChromePath();

if (!executablePath) {
  console.error("❌ لم يتم العثور على متصفح Chrome في السيرفر.");
  process.exit(1);
}

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});

app.use(bodyParser.json());

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ واتساب جاهز');
});

client.on('message', async msg => {
  const from = msg.from;
  const message = msg.body;
  console.log("📩 تم استلام رسالة من:", from, "النص:", message);

  try {
    const response = await fetch('https://alobaidi.app.n8n.cloud/webhook-test/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: from, message })
    });

    const result = await response.text();
    console.log("📨 تم إرسال الرسالة إلى n8n ✅");
    console.log("🔁 رد السيرفر:", result);
  } catch (error) {
    console.error("❌ خطأ أثناء الإرسال إلى n8n:", error.message);
  }
});

app.post('/send-message', async (req, res) => {
  const { number, message } = req.body;
  try {
    await client.sendMessage(number, message);
    console.log("✅ تم إرسال الرد إلى:", number);
    res.send({ status: 'sent' });
  } catch (err) {
    console.error("❌ خطأ أثناء إرسال الرد:", err.message);
    res.status(500).send({ error: err.message });
  }
});

app.get('/logout', async (req, res) => {
  try {
    await client.logout();
    console.log("🔒 تم تسجيل الخروج من واتساب");
    res.send("تم تسجيل الخروج من واتساب");
  } catch (err) {
    console.error("❌ خطأ أثناء تسجيل الخروج:", err.message);
    res.status(500).send({ error: err.message });
  }
});

client.initialize();
app.listen(PORT, () => {
  console.log(`🚀 السيرفر يعمل على المنفذ ${PORT}`);
});
