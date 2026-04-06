const mongoose = require("mongoose");

const VoteSchema = new mongoose.Schema({
  user:      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  voteType:  { type: String, enum: ["confirm", "deny"] },
  createdAt: { type: Date, default: Date.now }
});

const ReportSchema = new mongoose.Schema(
  {
    // ── Core ──────────────────────────────────────────────
    type: {
      type: String,
      required: true,
      enum: ["Stairs Only","Broken Sidewalk","No Ramp","Pothole","Construction","Narrow Path","No Kerb Cut","Missing Tactile","Blocked Path","Other"]
    },
    description: { type: String, maxlength: 500 },
    severity:    { type: String, enum: ["low","medium","high"], default: "medium" },
    status:      { type: String, enum: ["active","resolved","disputed","under_review"], default: "active" },

    // ── Location (GeoJSON Point) ───────────────────────────
    location: {
      type: { type: String, enum: ["Point"], required: true, default: "Point" },
      coordinates: { type: [Number], required: true }  // [lng, lat]
    },
    address:  { type: String },
    city:     { type: String },
    country:  { type: String, default: "India" },

    // ── Media ─────────────────────────────────────────────
    images:   [{ url: String, publicId: String }],
    videos:   [{ url: String, publicId: String }],

    // ── AI Validation ─────────────────────────────────────
    aiValidation: {
      confidence:         { type: Number, min: 0, max: 100 },
      valid:              Boolean,
      detectedType:       String,
      severitySuggestion: String,
      reason:             String,
      modelVersion:       String,
      validatedAt:        Date
    },

    // ── Community ─────────────────────────────────────────
    reporter:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    votes:        [VoteSchema],
    confirmCount: { type: Number, default: 0 },
    denyCount:    { type: Number, default: 0 },

    // ── Scoring ───────────────────────────────────────────
    accessibilityScore: { type: Number, default: 50 },  // 0=blocked, 100=clear
    reliabilityScore:   { type: Number, default: 50 },

    // ── Expiry ────────────────────────────────────────────
    expiresAt: { type: Date },
    resolvedAt: { type: Date },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

// ── Geo Index for radius queries ──────────────────────────
ReportSchema.index({ location: "2dsphere" });
ReportSchema.index({ status: 1, severity: 1 });
ReportSchema.index({ reporter: 1 });
ReportSchema.index({ createdAt: -1 });

// ── Auto-set expiry based on severity ─────────────────────
ReportSchema.pre("save", function (next) {
  if (!this.expiresAt) {
    const days = { low: 7, medium: 14, high: 30 };
    const d = new Date();
    d.setDate(d.getDate() + (days[this.severity] || 14));
    this.expiresAt = d;
  }
  next();
});

// ── Recompute reliability from votes ──────────────────────
ReportSchema.methods.recalcReliability = function () {
  const total = this.confirmCount + this.denyCount;
  if (total === 0) return;
  this.reliabilityScore = Math.round((this.confirmCount / total) * 100);
};

module.exports = mongoose.model("Report", ReportSchema);
