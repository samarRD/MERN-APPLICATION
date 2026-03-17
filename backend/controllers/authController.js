const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// ✅ REGISTER USER
const registerUser = async (req, res) => {
  console.log("➡️ Register route hit"); // log pour debug
  try {
    const { name, email, password, role } = req.body;
    console.log("➡️ Body reçu :", req.body);

    if (!name || !email || !password) {
      console.log("❌ Champs manquants");
      return res.status(400).json({ message: "Champs manquants" });
    }

    const userExists = await User.findOne({ email });
    console.log("➡️ userExists :", userExists);

    if (userExists) {
      console.log("❌ Email déjà utilisé");
      return res.status(400).json({ message: "Email déjà utilisé" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
    });
    console.log("✅ User créé :", user);

    const token = generateToken(user._id);
    console.log("➡️ Token généré :", token);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: token,
    });
  } catch (error) {
    console.log("REGISTER ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ LOGIN USER
const loginUser = async (req, res) => {
  console.log("➡️ Login route hit");
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: token,
      });
    } else {
      res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }
  } catch (error) {
    console.log("LOGIN ERROR 👉", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
