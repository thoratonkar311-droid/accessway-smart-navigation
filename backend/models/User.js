const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const BadgeSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  icon:      { type: String, default: "⭐" },
  earnedAt:  { type: Date, default: Date.now },
  description: String
});

const UserSchema = new mongoose.Schema(
  {
    name:     { type: String, required: [true, "Name is required"], trim: true, maxlength: 60 },
    email:    { type: String, required: [true, "Email is required"], unique: true, lowercase: true, match: [/.+@.+\..+/, "Invalid email"] },
    password: { type: String, required: [true, "Password is required"], minlength: 6, select: false },
    avatar:   { type: String, default: "" },
    role:     { type: String, enum: ["user", "moderator", "admin"], default: "user" },

    // Gamification
    points:         { type: Number, default: 0 },
    level:          { type: Number, default: 1 },
    badges:         [BadgeSchema],
    reportCount:    { type: Number, default: 0 },
    verifiedCount:  { type: Number, default: 0 },
    helpedCount:    { type: Number, default: 0 },
    savedRoutes:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Route" }],

    // Profile
    isWheelchairUser: { type: Boolean, default: false },
    wheelchairType:   { type: String, enum: ["manual","powered","not_applicable"], default: "not_applicable" },
    city:             { type: String, default: "" },

    // Auth
    isVerified:   { type: Boolean, default: false },
    lastLogin:    { type: Date },
    refreshToken: { type: String, select: false }
  },
  { timestamps: true }
);

// ── Hash password before save ─────────────────────────────
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare password ──────────────────────────────────────
UserSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

// ── Level up logic ────────────────────────────────────────
UserSchema.methods.addPoints = async function (pts) {
  this.points += pts;
  this.level = Math.floor(this.points / 500) + 1;
  return this.save();
};

// ── Check & award badges ──────────────────────────────────
UserSchema.methods.checkBadges = async function () {
  const earned = this.badges.map(b => b.name);
  const toAward = [];

  const rules = [
    { name: "First Scout",    icon: "🔍", desc: "Submit your first report",      condition: this.reportCount >= 1   },
    { name: "Photo Pro",      icon: "📸", desc: "Submit 10 reports with photos",  condition: this.reportCount >= 10  },
    { name: "Helper",         icon: "🤝", desc: "Help 100 people navigate",       condition: this.helpedCount >= 100 },
    { name: "Top 10%",        icon: "🌟", desc: "Reach the top 10% of reporters", condition: this.points >= 2000    },
    { name: "City Guardian",  icon: "🛡️", desc: "Submit 30 verified reports",     condition: this.verifiedCount >= 30 },
    { name: "Power User",     icon: "⚡", desc: "Reach 5000 points",              condition: this.points >= 5000    },
  ];

  rules.forEach(rule => {
    if (rule.condition && !earned.includes(rule.name)) {
      this.badges.push({ name: rule.name, icon: rule.icon, description: rule.desc });
      toAward.push(rule.name);
    }
  });

  if (toAward.length) await this.save();
  return toAward;
};

UserSchema.index({ email: 1 });
UserSchema.index({ points: -1 });

module.exports = mongoose.model("User", UserSchema);
