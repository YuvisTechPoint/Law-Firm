const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

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

app.listen(PORT, () => {
  console.log(`Real-time Auth Server running at http://localhost:${PORT}`);
  console.log(`\nTest User: prasadyuvraj8805@gmail.com (password will be set during signup)\n`);
});
