require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

// Serve static files only when running locally (not on Vercel serverless)
if (require.main === module) {
  app.use(express.static(path.join(__dirname)));
}

// Calendly configuration read from environment variables
const CAL_CLIENT_ID = process.env.CAL_CLIENT_ID || null;
const CAL_CLIENT_SECRET = process.env.CAL_CLIENT_SECRET || null;
const CAL_WEBHOOK_SIGNING_KEY = process.env.CAL_WEBHOOK_SIGNING_KEY || null;

// Helper: build redirect URI
function getCalendlyRedirectUri(req) {
  return process.env.CAL_REDIRECT_URI || `${req.protocol}://${req.get('host')}/api/calendly/oauth/callback`;
}

// OAuth: redirect user to Calendly authorize page
app.get('/api/calendly/oauth/authorize', (req, res) => {
  if (!CAL_CLIENT_ID) return res.status(500).json({ success: false, message: 'Calendly client ID not configured' });
  const redirect_uri = getCalendlyRedirectUri(req);
  const scope = [
    'event_types:read',
    'availability:read',
    'scheduling_links:write',
    'scheduled_events:write',
    'webhooks:read',
    'webhooks:write',
    'users:read'
  ].join(' ');

  const url = `https://auth.calendly.com/oauth/authorize?client_id=${encodeURIComponent(CAL_CLIENT_ID)}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scope)}`;
  res.redirect(url);
});

// OAuth callback: exchange code for tokens
app.get('/api/calendly/oauth/callback', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');
  if (!CAL_CLIENT_ID || !CAL_CLIENT_SECRET) return res.status(500).send('Calendly client credentials not configured');

  const redirect_uri = getCalendlyRedirectUri(req);
  const postData = `grant_type=authorization_code&client_id=${encodeURIComponent(CAL_CLIENT_ID)}&client_secret=${encodeURIComponent(CAL_CLIENT_SECRET)}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;

  const options = {
    hostname: 'auth.calendly.com',
    path: '/oauth/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const tokenReq = https.request(options, tokenRes => {
    let data = '';
    tokenRes.on('data', chunk => data += chunk);
    tokenRes.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        // Return tokens to caller (in production, store securely tied to user)
        res.json({ success: true, tokens: parsed });
      } catch (err) {
        res.status(500).json({ success: false, message: 'Invalid token response', raw: data });
      }
    });
  });

  tokenReq.on('error', err => {
    res.status(500).json({ success: false, message: 'Token request failed', error: err.message });
  });

  tokenReq.write(postData);
  tokenReq.end();
});

// Calendly webhook endpoint (verifies HMAC-SHA256 signature)
app.post('/api/calendly/webhook', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  if (!CAL_WEBHOOK_SIGNING_KEY) return res.status(500).send('Webhook signing key not configured');
  const sigHeader = req.get('Calendly-Signature') || req.get('Calendly-Webhook-Signature') || req.get('X-Calendly-Signature');
  if (!sigHeader) return res.status(400).send('Missing signature header');

  const computed = crypto.createHmac('sha256', CAL_WEBHOOK_SIGNING_KEY).update(req.body).digest('hex');
  if (sigHeader !== computed) {
    console.warn('Invalid Calendly webhook signature', { received: sigHeader, computed });
    return res.status(401).send('Invalid signature');
  }

  let payload = {};
  try { payload = JSON.parse(req.body.toString()); } catch (e) { /* ignore */ }
  console.log('Calendly webhook received:', payload.event || payload);
  // TODO: handle relevant event types (invitee.created, event.canceled, etc.)
  res.json({ success: true });
});

// Create Calendly scheduling link endpoint
app.post('/api/calendly/create-scheduling-link', async (req, res) => {
  const { code, event_type_name } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: 'Authorization code required. First visit /api/calendly/oauth/authorize' });
  }

  if (!CAL_CLIENT_ID || !CAL_CLIENT_SECRET) {
    return res.status(500).json({ success: false, message: 'Calendly client credentials not configured' });
  }

  try {
    // Step 1: Exchange code for access token
    const tokenPostData = `grant_type=authorization_code&client_id=${encodeURIComponent(CAL_CLIENT_ID)}&client_secret=${encodeURIComponent(CAL_CLIENT_SECRET)}&code=${encodeURIComponent(code)}&redirect_uri=${encodeURIComponent(getCalendlyRedirectUri(req))}`;

    const token = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'auth.calendly.com',
        path: '/oauth/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(tokenPostData)
        }
      };

      const tokenReq = https.request(options, tokenRes => {
        let data = '';
        tokenRes.on('data', chunk => data += chunk);
        tokenRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.access_token) {
              resolve(parsed.access_token);
            } else {
              reject(new Error('No access token in response'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      tokenReq.on('error', reject);
      tokenReq.write(tokenPostData);
      tokenReq.end();
    });

    // Step 2: Get current user info to retrieve user URI
    const userInfo = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.calendly.com',
        path: '/users/me',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      };

      const userReq = https.request(options, userRes => {
        let data = '';
        userRes.on('data', chunk => data += chunk);
        userRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.resource);
          } catch (err) {
            reject(err);
          }
        });
      });

      userReq.on('error', reject);
      userReq.end();
    });

    const userUri = userInfo.uri;

    // Step 3: Get event types to find the consultation event
    const eventTypes = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.calendly.com',
        path: `/event_types?user=${encodeURIComponent(userUri)}`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      };

      const eventsReq = https.request(options, eventsRes => {
        let data = '';
        eventsRes.on('data', chunk => data += chunk);
        eventsRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.collection || []);
          } catch (err) {
            reject(err);
          }
        });
      });

      eventsReq.on('error', reject);
      eventsReq.end();
    });

    const consultationEvent = eventTypes.find(evt => 
      evt.name.toLowerCase().includes((event_type_name || 'consultation').toLowerCase())
    );

    if (!consultationEvent) {
      return res.status(404).json({ 
        success: false, 
        message: `Event type "${event_type_name || 'consultation'}" not found. Available events: ${eventTypes.map(e => e.name).join(', ')}`
      });
    }

    // Step 4: Create a scheduling link
    const linkPostData = JSON.stringify({
      event_type: consultationEvent.uri,
      owner: userUri,
      max_event_count: 1
    });

    const schedulingLink = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.calendly.com',
        path: '/scheduling_links',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(linkPostData)
        }
      };

      const linkReq = https.request(options, linkRes => {
        let data = '';
        linkRes.on('data', chunk => data += chunk);
        linkRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.resource);
          } catch (err) {
            reject(err);
          }
        });
      });

      linkReq.on('error', reject);
      linkReq.write(linkPostData);
      linkReq.end();
    });

    res.json({
      success: true,
      message: 'Scheduling link created',
      scheduling_link: schedulingLink.booking_url,
      event_type: consultationEvent.name
    });

  } catch (err) {
    console.error('Error creating scheduling link:', err);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create scheduling link',
      error: err.message 
    });
  }
});

// Gmail SMTP Configuration using provided App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
    pass: process.env.SMTP_PASS || 'xovf bghy birg hkkx'
  }
});

// In-memory user store (for demo purposes)
const users = {};

// ─── SIGNUP ENDPOINT ─────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  const { email, password, fullName } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }

  // Check if user already exists
  if (users[email]) {
    return res.status(400).json({ success: false, message: 'User already exists with this email' });
  }

  // Store user (in production, hash the password using bcrypt)
  users[email] = {
    email,
    password, // NOT safe in production
    fullName,
    createdAt: new Date().toLocaleString()
  };

  // Send welcome email
  const mailOptions = {
    from: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
    to: email,
    subject: 'Welcome to LexCounsel India - Account Created',
    text: `Hello ${fullName},\n\nWelcome to LexCounsel India!\n\nYour account has been successfully created.\n\nEmail: ${email}\nCreated: ${new Date().toLocaleString()}\n\nYou can now log in to access our legal services.`,
    html: `<h3>Welcome to LexCounsel India, ${fullName}!</h3>
           <p>Your account has been successfully created with the following details:</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Account Status:</strong> Active</p>
           <p>You can now log in to access our premium legal services and book consultations.</p>
           <p><a href="http://127.0.0.1:5500/login.html" style="background:#C9A84C; color:#fff; padding:10px 20px; text-decoration:none; border-radius:5px;">Go to Login</a></p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    res.json({ success: true, message: 'Account created successfully! Check your email.', user: { email, fullName } });
  } catch (error) {
    console.error('SMTP Error:', error);
    // Even if email fails, account was created
    res.json({ success: true, message: 'Account created (email may be pending)', user: { email, fullName } });
  }
});

// ─── LOGIN ENDPOINT ──────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const user = users[email];

  if (!user || user.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password' });
  }

  // Send login notification email
  const mailOptions = {
    from: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
    to: email,
    subject: 'Login Notification - LexCounsel India',
    text: `Hello ${user.fullName},\n\nYou have successfully logged in to your LexCounsel India account.\n\nLogin Time: ${new Date().toLocaleString()}\n\nIf this wasn't you, please change your password immediately.`,
    html: `<h3>Login Successful - LexCounsel India</h3>
           <p>Hello ${user.fullName},</p>
           <p>You have successfully logged into your account.</p>
           <p><strong>Login Time:</strong> ${new Date().toLocaleString()}</p>
           <p>If you didn't initiate this login, please secure your account immediately.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Login notification sent to ${email}`);
  } catch (error) {
    console.error('Email notification error:', error);
  }

  res.json({ 
    success: true, 
    message: 'Login successful!', 
    user: { email, fullName: user.fullName },
    token: Buffer.from(email).toString('base64') // Simple token for demo
  });
});

// ─── VALIDATE SESSION ──────────────────────────────
app.post('/api/auth/validate', (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ success: false, message: 'Email and token required' });
  }

  const user = users[email];
  const expectedToken = Buffer.from(email).toString('base64');

  if (user && token === expectedToken) {
    res.json({ success: true, user: { email, fullName: user.fullName } });
  } else {
    res.status(401).json({ success: false, message: 'Invalid session' });
  }
});

// ─── Q&A STORAGE (File-based) ──────────────────
const dbPath = path.join(__dirname, 'qa_db.json');

// IMAP / Mail parser for inbound admin replies
// NOTE: imap polling is started only when running the server directly (not when required by serverless)
let imaps;
let simpleParser;
let IMAP_CONFIG;
function getQuestions() {
  try {
    if (fs.existsSync(dbPath)) {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    }
  } catch (e) {
    console.error('Error reading QA db:', e);
  }
  return [];
}

function saveQuestions(questions) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(questions, null, 2));
  } catch (e) {
    console.error('Error saving QA db:', e);
  }
}

// ─── SUBMIT QUESTION ENDPOINT ──────────────────
app.post('/api/qa/ask', async (req, res) => {
  const { name, email, category, title, body, city } = req.body;

  if (!name || !email || !category || !title || !body) {
    return res.status(400).json({ success: false, message: 'All required fields must be filled' });
  }

  const newQuestion = {
    id: Date.now(),
    name,
    email,
    category,
    title,
    body,
    city: city || 'India',
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    helpful: 0,
    reply: null
  };

  // Save to database
  const questions = getQuestions();
  questions.unshift(newQuestion);
  saveQuestions(questions);

  // ─── Send email to user ────────────────────────
  const userMailOptions = {
    from: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
    to: email,
    subject: `Question Received - LexCounsel India`,
    html: `
      <h3>Your Legal Question Has Been Submitted</h3>
      <p>Dear ${name},</p>
      <p><strong>Question Title:</strong> ${title}</p>
      <p><strong>Category:</strong> ${category}</p>
      <p><strong>Status:</strong> ⏳ Pending Review</p>
      <p>Our panel of advocates will review your question and respond soon.</p>
      <p><strong>Question ID:</strong> ${newQuestion.id}</p>
      <hr>
      <p style="font-size:12px; color:#666;">
        You will receive an email when an advocate replies to your question. 
        <a href="http://127.0.0.1:5500/qa.html">View on website</a>
      </p>
    `
  };

  // ─── Send email to admin ───────────────────────
  const adminMailOptions = {
    from: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
    to: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
    subject: `[NEW QUESTION] ${title} - LexCounsel QA`,
    html: `
      <h3>New Legal Question Submitted</h3>
      <p><strong>From:</strong> ${name} (${email})</p>
      <p><strong>Location:</strong> ${city}</p>
      <p><strong>Category:</strong> ${category}</p>
      <hr>
      <p><strong>Question:</strong> ${title}</p>
      <p><strong>Details:</strong></p>
      <p>${body}</p>
      <hr>
      <p><strong>Question ID:</strong> ${newQuestion.id}</p>
      <p style="margin-top:1.5rem; padding:1rem; background:#f0f0f0; border-left:4px solid #C9A84C;">
        <strong>To reply:</strong> Reply to this email with your answer. It will automatically appear on the website.
        <br><br>
        Format: Simply type your response below this line and send.
      </p>
    `
  };

  try {
    await transporter.sendMail(userMailOptions);
    console.log(`Question confirmation email sent to ${email}`);
  } catch (error) {
    console.error('User email error:', error);
  }

  try {
    await transporter.sendMail(adminMailOptions);
    console.log(`Question notification email sent to admin`);
  } catch (error) {
    console.error('Admin email error:', error);
  }

  res.json({ 
    success: true, 
    message: 'Question submitted! You will receive an email when answered.',
    question: newQuestion
  });
});

// ─── GET ALL QUESTIONS ENDPOINT (Real-time polling) ──
app.get('/api/qa/questions', (req, res) => {
  const questions = getQuestions();
  res.json({ success: true, questions });
});

// ─── POST ADMIN REPLY ENDPOINT ─────────────────
app.post('/api/qa/reply', async (req, res) => {
  const { questionId, advocate, designation, replyText } = req.body;

  if (!questionId || !advocate || !replyText) {
    return res.status(400).json({ success: false, message: 'All fields required' });
  }

  let questions = getQuestions();
  const question = questions.find(q => q.id == questionId);

  if (!question) {
    return res.status(404).json({ success: false, message: 'Question not found' });
  }

  // Update question with reply
  question.reply = {
    advocate,
    designation: designation || 'Legal Advocate',
    text: replyText,
    date: new Date().toISOString().split('T')[0]
  };
  question.status = 'answered';
  saveQuestions(questions);

  // ─── Send reply email to user ──────────────────
  const userMailOptions = {
    from: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
    to: question.email,
    subject: `Your Question Answered - LexCounsel India`,
    html: `
      <h3>Your Question Has Been Answered!</h3>
      <p>Dear ${question.name},</p>
      <p><strong>Question:</strong> ${question.title}</p>
      <hr>
      <p><strong>Answer by:</strong> ${advocate}, ${designation || 'Legal Advocate'}</p>
      <p style="padding:1rem; background:#f9f9f9; border-left:4px solid #C9A84C; margin:1rem 0;">
        ${replyText}
      </p>
      <hr>
      <p style="font-size:12px; color:#666;">
        View the complete Q&A and other legal questions at: 
        <a href="http://127.0.0.1:5500/qa.html">LexCounsel Q&A Forum</a>
      </p>
    `
  };

  try {
    await transporter.sendMail(userMailOptions);
    console.log(`Reply email sent to ${question.email}`);
  } catch (error) {
    console.error('Reply email error:', error);
  }

  res.json({ 
    success: true, 
    message: 'Reply posted and email sent to user!',
    question
  });
});

// ─── POLL INBOUND EMAILS (ADMIN REPLIES) ───────
async function pollInboundReplies() {
  try {
    const connection = await imaps.connect(IMAP_CONFIG);
    await connection.openBox('INBOX');

    // Search for UNSEEN messages
    const searchCriteria = ['UNSEEN'];
    const fetchOptions = { bodies: [''], markSeen: true };

    const messages = await connection.search(searchCriteria, fetchOptions);
    for (const item of messages) {
      const raw = item.parts && item.parts[0] && item.parts[0].body ? item.parts[0].body : '';
      if (!raw) continue;

      const parsed = await simpleParser(raw);
      const fromText = parsed.from?.text || 'Admin';
      const text = parsed.text || '';

      // Attempt to extract Question ID from the message (the admin should reply and include the original text)
      const idMatch = text.match(/Question ID:\s*(\d+)/i);
      if (!idMatch) {
        console.log('No Question ID found in admin email from', fromText);
        continue;
      }

      const qid = parseInt(idMatch[1], 10);

      // Extract reply text (take text before the Question ID or before common reply separators)
      let replyText = text.split(/Question ID:/i)[0].trim();
      // Remove common quoted lines (lines starting with >)
      replyText = replyText.split('\n').filter(l => !l.trim().startsWith('>')).join('\n').trim();

      if (!replyText) {
        console.log('Empty reply text for question', qid);
        continue;
      }

      // Update DB
      const questions = getQuestions();
      const question = questions.find(q => q.id == qid);
      if (!question) {
        console.log('Question not found for id', qid);
        continue;
      }

      question.reply = {
        advocate: fromText,
        designation: 'Admin',
        text: replyText,
        date: new Date().toISOString().split('T')[0]
      };
      question.status = 'answered';
      saveQuestions(questions);

      // Send reply email to the user
      const mailOptions = {
        from: process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
        to: question.email,
        subject: `Your Question Answered - LexCounsel India`,
        html: `
          <h3>Your Question Has Been Answered!</h3>
          <p>Dear ${question.name},</p>
          <p><strong>Question:</strong> ${question.title}</p>
          <hr>
          <p><strong>Answer by:</strong> ${fromText}</p>
          <p style="padding:1rem; background:#f9f9f9; border-left:4px solid #C9A84C; margin:1rem 0;">
            ${replyText.replace(/\n/g, '<br>')}
          </p>
          <hr>
          <p style="font-size:12px; color:#666;">
            View the complete Q&A and other legal questions at: 
            <a href="http://127.0.0.1:5500/qa.html">LexCounsel Q&A Forum</a>
          </p>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Reply processed and emailed to ${question.email} for question ${qid}`);
      } catch (err) {
        console.error('Error sending reply email to user:', err);
      }
    }

    connection.end();
  } catch (err) {
    // Log and continue; connection failures common if credentials wrong
    console.error('Error polling inbound replies:', err.message || err);
  }
}

// Start polling every 15 seconds only when running locally (avoid background intervals on serverless platforms)
if (require.main === module) {
  // Only enable IMAP polling when explicitly requested via environment variable.
  // This avoids TLS/certificate/network errors during local development or on serverless platforms.
  if (process.env.ENABLE_IMAP === '1') {
    try {
      imaps = require('imap-simple');
      simpleParser = require('mailparser').simpleParser;
      IMAP_CONFIG = {
        imap: {
          user: process.env.IMAP_USER || process.env.SMTP_USER || 'prasadyuvraj8805@gmail.com',
          password: process.env.IMAP_PASS || process.env.SMTP_PASS || 'xovf bghy birg hkkx',
          host: 'imap.gmail.com',
          port: 993,
          tls: true,
          authTimeout: 3000
        }
      };

      setInterval(pollInboundReplies, 15000);
      console.log('IMAP polling enabled (ENABLE_IMAP=1)');
    } catch (err) {
      console.warn('IMAP polling not started (imap modules missing or error):', err && err.message ? err.message : err);
    }
  } else {
    console.log('IMAP polling disabled. Set ENABLE_IMAP=1 to enable inbound email polling.');
  }
}

// ─── ADMIN PANEL: GET QUESTIONS FOR ADMIN ──────
app.get('/api/qa/admin/pending', (req, res) => {
  const questions = getQuestions();
  const pending = questions.filter(q => q.status === 'pending');
  res.json({ success: true, pending, total: questions.length });
});

// ─── ROOT ROUTE ─────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Real-time Law2Firm Server running at http://localhost:${PORT}`);
    console.log(`\n📨 Q&A Email System: ACTIVE`);
    console.log(`📋 Q&A Endpoints:`);
    console.log(`   POST /api/qa/ask - Submit a question`);
    console.log(`   GET /api/qa/questions - Get all questions`);
    console.log(`   POST /api/qa/reply - Admin reply (sends email)\n`);
  });
}

module.exports = app;
