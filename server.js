const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

// Gmail SMTP Configuration using provided App Password
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'prasadyuvraj8805@gmail.com',
    pass: 'xovf bghy birg hkkx'
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
    from: 'prasadyuvraj8805@gmail.com',
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
    from: 'prasadyuvraj8805@gmail.com',
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
const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'qa_db.json');

// IMAP / Mail parser for inbound admin replies
const imaps = require('imap-simple');
const { simpleParser } = require('mailparser');

const IMAP_CONFIG = {
  imap: {
    user: 'prasadyuvraj8805@gmail.com',
    password: 'xovf bghy birg hkkx',
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    authTimeout: 3000
  }
};
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
    from: 'prasadyuvraj8805@gmail.com',
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
    from: 'prasadyuvraj8805@gmail.com',
    to: 'prasadyuvraj8805@gmail.com',
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
    from: 'prasadyuvraj8805@gmail.com',
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
        from: 'prasadyuvraj8805@gmail.com',
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

// Start polling every 15 seconds
setInterval(pollInboundReplies, 15000);

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
